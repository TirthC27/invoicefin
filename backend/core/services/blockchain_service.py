"""
blockchain_service.py - On-chain pool creation and investment verification.

Reuses the same RPC / contract pattern already established in
core/management/commands/sync_pools.py.
"""

import os
import logging
from decimal import Decimal
from dataclasses import dataclass

logger = logging.getLogger(__name__)

INVESTED_EVENT_ABI = {
    "anonymous": False,
    "inputs": [
        {"indexed": True, "name": "investor", "type": "address"},
        {"indexed": True, "name": "poolId", "type": "uint256"},
        {"indexed": False, "name": "amount", "type": "uint256"},
    ],
    "name": "Invested",
    "type": "event",
}

POOL_CREATED_EVENT_ABI = {
    "anonymous": False,
    "inputs": [
        {"indexed": True, "name": "poolId", "type": "uint256"},
        {"indexed": False, "name": "name", "type": "string"},
        {"indexed": False, "name": "totalSize", "type": "uint256"},
    ],
    "name": "PoolCreated",
    "type": "event",
}

CREATE_POOL_FUNCTION_ABI = {
    "inputs": [
        {"internalType": "string", "name": "_name", "type": "string"},
        {"internalType": "uint256", "name": "_apyBps", "type": "uint256"},
        {"internalType": "uint256", "name": "_durationDays", "type": "uint256"},
        {"internalType": "uint256", "name": "_totalSize", "type": "uint256"},
    ],
    "name": "createPool",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
}

CONTRACT_ABI = [INVESTED_EVENT_ABI, POOL_CREATED_EVENT_ABI, CREATE_POOL_FUNCTION_ABI]

POOL_WRITE_ABI = [
    {
        "inputs": [
            {"name": "_name", "type": "string"},
            {"name": "_apyBps", "type": "uint256"},
            {"name": "_durationDays", "type": "uint256"},
            {"name": "_totalSize", "type": "uint256"},
        ],
        "name": "createPool",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "poolCount",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
]


@dataclass
class VerifiedInvestment:
    """Result of a successful on-chain investment verification."""
    investor: str
    pool_id: int
    amount_wei: int
    amount_matic: Decimal
    block_number: int
    tx_hash: str


@dataclass
class CreatedPool:
    """Result of a successful on-chain pool creation."""
    pool_id: int
    tx_hash: str
    block_number: int


def _load_web3():
    try:
        from web3 import Web3
        from web3.exceptions import TransactionNotFound
        from web3.logs import DISCARD
    except ImportError as exc:
        raise ValueError(
            "web3 is not installed. Install the backend web3 dependency before using blockchain endpoints."
        ) from exc
    return Web3, TransactionNotFound, DISCARD


def get_web3():
    """Return a connected Web3 instance using env-configured RPC URL."""
    Web3, _, _ = _load_web3()
    rpc_url = os.getenv(
        "POLYGON_AMOY_RPC_URL",
        "https://polygon-amoy.drpc.org",
    )
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        raise ConnectionError(f"Cannot connect to RPC: {rpc_url}")
    expected_chain_id = int(os.getenv("POLYGON_AMOY_CHAIN_ID", "80002"))
    chain_id = w3.eth.chain_id
    if chain_id != expected_chain_id:
        raise ConnectionError(f"RPC chain_id {chain_id} does not match expected Polygon Amoy chain_id {expected_chain_id}.")
    return w3


def create_pool_on_chain(name: str, apy: Decimal, duration_days: int, total_size: Decimal) -> CreatedPool:
    """
    Create the investor-facing pool on the InvoicePool contract.

    The Solidity contract restricts pool creation to the contract owner, so the
    backend must be configured with that owner's private key. If it is not, fail
    clearly rather than creating a database-only pool investors cannot fund.
    """
    Web3, _, DISCARD = _load_web3()
    contract_address = os.getenv("CONTRACT_ADDRESS")
    private_key = os.getenv("CONTRACT_OWNER_PRIVATE_KEY") or os.getenv("PRIVATE_KEY")

    if not contract_address:
        raise ValueError("CONTRACT_ADDRESS not configured in environment.")
    if contract_address.lower() == "0x0000000000000000000000000000000000000000":
        raise ValueError("CONTRACT_ADDRESS cannot be the zero address.")
    if not private_key:
        raise ValueError("CONTRACT_OWNER_PRIVATE_KEY not configured in environment.")
    if duration_days <= 0:
        raise ValueError("duration_days must be positive.")
    if total_size <= 0:
        raise ValueError("total_size must be positive.")

    w3 = get_web3()
    if not Web3.is_address(contract_address):
        raise ValueError("CONTRACT_ADDRESS is not a valid EVM address.")
    contract_address = Web3.to_checksum_address(contract_address)
    if w3.eth.get_code(contract_address) in (b"", "0x"):
        raise ValueError("No contract bytecode found at CONTRACT_ADDRESS.")
    contract = w3.eth.contract(address=contract_address, abi=CONTRACT_ABI)
    account = w3.eth.account.from_key(private_key)

    apy_bps = int((apy * Decimal("100")).to_integral_value())
    total_size_wei = w3.to_wei(str(total_size), "ether")

    create_call = contract.functions.createPool(
        name,
        apy_bps,
        duration_days,
        total_size_wei,
    )
    tx = create_call.build_transaction({
        "from": account.address,
        "nonce": w3.eth.get_transaction_count(account.address),
        "chainId": w3.eth.chain_id,
    })

    try:
        tx["gas"] = int(create_call.estimate_gas({"from": account.address}) * 1.2)
    except Exception:
        tx["gas"] = 300000

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)

    if not receipt:
        raise ValueError(f"Transaction receipt for {tx_hash} was not found.")

    if receipt.status != 1:
        raise ValueError(f"Pool creation transaction failed: {tx_hash.hex()}")

    created_events = contract.events.PoolCreated().process_receipt(
        receipt, errors=DISCARD,
    )
    if not created_events:
        raise ValueError("PoolCreated event not found after pool creation.")

    event = created_events[0]
    return CreatedPool(
        pool_id=int(event.args.poolId),
        tx_hash=tx_hash.hex(),
        block_number=receipt.blockNumber,
    )


def verify_investment_tx(tx_hash: str) -> VerifiedInvestment:
    """
    Independently verify an investment transaction on-chain.

    Raises ValueError on any verification failure.
    Raises ConnectionError if RPC is unreachable.
    """
    Web3, TransactionNotFound, DISCARD = _load_web3()
    contract_address = os.getenv("CONTRACT_ADDRESS")
    if not contract_address:
        raise ValueError("CONTRACT_ADDRESS not configured in environment.")

    if contract_address.lower() == "0x0000000000000000000000000000000000000000":
        raise ValueError("CONTRACT_ADDRESS cannot be the zero address.")
    if not Web3.is_address(contract_address):
        raise ValueError("CONTRACT_ADDRESS is not a valid EVM address.")
    contract_address = Web3.to_checksum_address(contract_address)
    w3 = get_web3()
    if w3.eth.get_code(contract_address) in (b"", "0x"):
        raise ValueError("No contract bytecode found at CONTRACT_ADDRESS.")

    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
    except TransactionNotFound:
        raise ValueError(f"Transaction {tx_hash} not found on-chain.")
    except Exception as e:
        logger.error("Failed to fetch tx receipt for %s: %s", tx_hash, e)
        raise ValueError(f"Failed to fetch transaction receipt: {e}")

    if not receipt:
        raise ValueError(f"Transaction receipt for {tx_hash} was not found.")

    if receipt.status != 1:
        raise ValueError(
            f"Transaction {tx_hash} failed on-chain (status={receipt.status})."
        )

    if not receipt.get("to"):
        raise ValueError(f"Transaction {tx_hash} did not target a contract address.")
    tx_to = Web3.to_checksum_address(receipt["to"])
    if tx_to != contract_address:
        raise ValueError(
            f"Transaction target {tx_to} does not match "
            f"configured contract {contract_address}."
        )

    contract = w3.eth.contract(address=contract_address, abi=CONTRACT_ABI)
    invested_events = contract.events.Invested().process_receipt(
        receipt, errors=DISCARD,
    )

    if not invested_events:
        raise ValueError(
            f"No Invested event found in transaction {tx_hash}. "
            "This transaction may not be an investment."
        )

    event = invested_events[0]
    investor = Web3.to_checksum_address(event.args.investor)
    pool_id = event.args.poolId
    amount_wei = event.args.amount
    amount_matic = Decimal(str(amount_wei)) / Decimal("1000000000000000000")

    logger.info(
        "Verified investment: investor=%s pool=%d amount=%s MATIC tx=%s block=%d",
        investor, pool_id, amount_matic, tx_hash, receipt.blockNumber,
    )

    return VerifiedInvestment(
        investor=investor,
        pool_id=pool_id,
        amount_wei=amount_wei,
        amount_matic=amount_matic,
        block_number=receipt.blockNumber,
        tx_hash=tx_hash,
    )