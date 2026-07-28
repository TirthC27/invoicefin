"""
blockchain_service.py — On-chain transaction verification via Web3.

Reuses the same RPC / contract pattern already established in
core/management/commands/sync_pools.py.
"""

import os
import logging
from decimal import Decimal
from dataclasses import dataclass

from web3 import Web3
from web3.exceptions import TransactionNotFound
from web3.logs import DISCARD

logger = logging.getLogger(__name__)

# ── Invested event ABI (matches InvoicePool.sol) ──────────────────────────
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

# Minimal contract ABI — only the Invested event
CONTRACT_ABI = [INVESTED_EVENT_ABI]

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
    """Result of a successful on-chain verification."""
    investor: str           # checksummed wallet address
    pool_id: int            # contract pool ID
    amount_wei: int         # investment amount in wei
    amount_matic: Decimal   # investment amount in POL (18 decimals)
    block_number: int
    tx_hash: str


@dataclass
class CreatedPool:
    """Result of a successful on-chain pool creation."""
    pool_id: int
    tx_hash: str
    block_number: int

_w3_instance = None

def get_web3() -> Web3:
    """Return a connected Web3 instance using env-configured RPC URL."""
    global _w3_instance
    if _w3_instance is None:
        rpc_url = (os.getenv("POLYGON_AMOY_RPC_URL") or "").strip()
        if not rpc_url:
            raise ValueError("POLYGON_AMOY_RPC_URL not configured in environment.")
        _w3_instance = Web3(Web3.HTTPProvider(rpc_url))
    return _w3_instance


def create_pool_on_chain(
    name: str,
    apy_bps: int,
    duration_days: int,
    total_size_matic: Decimal,
) -> CreatedPool:
    """Create an InvoicePool pool on Polygon Amoy and return its contract ID."""
    contract_address = os.getenv("CONTRACT_ADDRESS")
    private_key = os.getenv("BLOCKCHAIN_PRIVATE_KEY") or os.getenv("PRIVATE_KEY")
    if not contract_address:
        raise ValueError("CONTRACT_ADDRESS not configured in environment.")
    if not private_key:
        raise ValueError("BLOCKCHAIN_PRIVATE_KEY not configured in environment.")

    w3 = get_web3()
    account = w3.eth.account.from_key(private_key)
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(contract_address),
        abi=POOL_WRITE_ABI,
    )
    total_size_wei = int(total_size_matic * Decimal("1000000000000000000"))
    nonce = w3.eth.get_transaction_count(account.address)

    tx = contract.functions.createPool(
        name,
        int(apy_bps),
        int(duration_days),
        total_size_wei,
    ).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "chainId": 80002,
        "gasPrice": w3.eth.gas_price,
    })
    tx["gas"] = int(w3.eth.estimate_gas(tx) * 1.2)

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    if receipt.status != 1:
        raise ValueError(f"Pool creation transaction failed: {tx_hash.hex()}")

    pool_id = contract.functions.poolCount().call()
    return CreatedPool(
        pool_id=int(pool_id),
        tx_hash=tx_hash.hex(),
        block_number=receipt.blockNumber,
    )


def verify_investment_tx(tx_hash: str) -> VerifiedInvestment:
    """
    Independently verify an investment transaction on-chain.

    1. Fetch the transaction receipt.
    2. Verify receipt.status == 1 (success).
    3. Verify the transaction targeted the configured contract address.
    4. Decode the Invested event from the logs.
    5. Return the verified investment data.

    Raises ValueError on any verification failure.
    Raises ConnectionError if RPC is unreachable.
    """
    contract_address = os.getenv("CONTRACT_ADDRESS")
    if not contract_address:
        raise ValueError("CONTRACT_ADDRESS not configured in environment.")

    contract_address = Web3.to_checksum_address(contract_address)
    w3 = get_web3()

    # ── 1. Fetch transaction receipt ──────────────────────────────────
    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
    except TransactionNotFound:
        raise ValueError(f"Transaction {tx_hash} not found on-chain.")
    except Exception as e:
        logger.error("Failed to fetch tx receipt for %s: %s", tx_hash, e)
        raise ValueError(f"Failed to fetch transaction receipt: {e}")

    # ── 2. Verify success ────────────────────────────────────────────
    if receipt.status != 1:
        raise ValueError(
            f"Transaction {tx_hash} failed on-chain (status={receipt.status})."
        )

    # ── 3. Verify contract address ───────────────────────────────────
    tx_to = Web3.to_checksum_address(receipt["to"])
    if tx_to != contract_address:
        raise ValueError(
            f"Transaction target {tx_to} does not match "
            f"configured contract {contract_address}."
        )

    # ── 4. Decode Invested event ─────────────────────────────────────
    contract = w3.eth.contract(address=contract_address, abi=CONTRACT_ABI)

    invested_events = contract.events.Invested().process_receipt(
        receipt, errors=DISCARD
    )

    if not invested_events:
        raise ValueError(
            f"No Invested event found in transaction {tx_hash}. "
            "This transaction may not be an investment."
        )

    # Use the first Invested event (one invest call = one event)
    event = invested_events[0]
    investor = Web3.to_checksum_address(event.args.investor)
    pool_id = event.args.poolId
    amount_wei = event.args.amount
    amount_matic = Decimal(str(amount_wei)) / Decimal("1000000000000000000")

    logger.info(
        "Verified investment: investor=%s pool=%d amount=%s POL tx=%s block=%d",
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
