"""
Management command to sync pools from the smart contract into the Django DB.

Usage:
    python manage.py sync_pools

This reads pool data from the InvoicePool smart contract on Polygon Amoy
and creates/updates corresponding Pool records in the database.

Requires: pip install web3
          CONTRACT_ADDRESS and POLYGON_AMOY_RPC_URL in .env
"""

import os
from decimal import Decimal
from django.core.management.base import BaseCommand
from core.models import Pool


# Minimal ABI — only what we need for reading pools
POOL_ABI = [
    {
        "inputs": [],
        "name": "poolCount",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "_poolId", "type": "uint256"}],
        "name": "getPool",
        "outputs": [
            {
                "components": [
                    {"name": "id", "type": "uint256"},
                    {"name": "name", "type": "string"},
                    {"name": "apyBps", "type": "uint256"},
                    {"name": "durationDays", "type": "uint256"},
                    {"name": "totalSize", "type": "uint256"},
                    {"name": "remainingSize", "type": "uint256"},
                    {"name": "isSettled", "type": "bool"},
                    {"name": "creator", "type": "address"},
                    {"name": "createdAt", "type": "uint256"},
                ],
                "type": "tuple",
            }
        ],
        "stateMutability": "view",
        "type": "function",
    },
]


class Command(BaseCommand):
    help = "Sync investment pools from the InvoicePool smart contract into the database."

    def handle(self, *args, **options):
        contract_address = os.getenv("CONTRACT_ADDRESS")
        rpc_url = os.getenv("POLYGON_AMOY_RPC_URL", "https://polygon-amoy.drpc.org")

        if not contract_address:
            self.stderr.write(self.style.ERROR("CONTRACT_ADDRESS not set in .env"))
            return

        try:
            from web3 import Web3
        except ImportError:
            self.stderr.write(self.style.ERROR(
                "web3 not installed. Run: pip install web3"
            ))
            return

        w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not w3.is_connected():
            self.stderr.write(self.style.ERROR(f"Cannot connect to RPC: {rpc_url}"))
            return

        contract = w3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=POOL_ABI,
        )

        pool_count = contract.functions.poolCount().call()
        self.stdout.write(f"Found {pool_count} pools on-chain.\n")

        created = 0
        updated = 0

        for i in range(1, pool_count + 1):
            p = contract.functions.getPool(i).call()

            pool_id = p[0]
            name = p[1]
            apy_bps = p[2]
            duration_days = p[3]
            total_size_wei = p[4]
            remaining_size_wei = p[5]
            is_settled = p[6]

            # Convert wei to MATIC (18 decimals)
            total_size = Decimal(str(total_size_wei)) / Decimal("1000000000000000000")
            remaining_size = Decimal(str(remaining_size_wei)) / Decimal("1000000000000000000")
            apy = Decimal(str(apy_bps)) / Decimal("100")

            obj, was_created = Pool.objects.update_or_create(
                contract_pool_id=pool_id,
                defaults={
                    "name": name,
                    "apy": apy,
                    "duration_days": duration_days,
                    "total_size": total_size,
                    "remaining_size": remaining_size,
                    "is_settled": is_settled,
                },
            )

            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"  Created: #{pool_id} {name}"))
            else:
                updated += 1
                self.stdout.write(f"  Updated: #{pool_id} {name}")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone! {created} created, {updated} updated."
        ))
