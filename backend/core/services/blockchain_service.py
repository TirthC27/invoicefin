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


@dataclass
class VerifiedInvestment:
    """Result of a successful on-chain verification."""
    investor: str           # checksummed wallet address
    pool_id: int            # contract pool ID
    amount_wei: int         # investment amount in wei
    amount_matic: Decimal   # investment amount in MATIC/ETH (18 decimals)
    block_number: int
    tx_hash: str


def get_web3() -> Web3:
    """Return a connected Web3 instance using env-configured RPC URL."""
    rpc_url = os.getenv(
        "SEPOLIA_RPC_URL",
        "https://ethereum-sepolia-rpc.publicnode.com"
    )
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        raise ConnectionError(f"Cannot connect to RPC: {rpc_url}")
    return w3


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
        "Verified investment: investor=%s pool=%d amount=%s ETH tx=%s block=%d",
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
