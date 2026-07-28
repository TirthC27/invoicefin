import os, sys, django
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'invoicefin_backend.settings')
django.setup()

from web3 import Web3
from core.services.blockchain_service import get_web3

w3 = get_web3()
pk = (os.getenv('BLOCKCHAIN_PRIVATE_KEY') or '').strip('"\'')
account = w3.eth.account.from_key(pk)
print('Backend Wallet Address:', account.address)

balance_wei = w3.eth.get_balance(account.address)
print('Backend Wallet Balance (MATIC):', balance_wei / 1e18)

contract_address = os.getenv('CONTRACT_ADDRESS')
print('Configured Contract Address:', contract_address)

abi = [{'inputs': [], 'name': 'owner', 'outputs': [{'internalType': 'address', 'name': '', 'type': 'address'}], 'stateMutability': 'view', 'type': 'function'}]
contract = w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=abi)
try:
    owner = contract.functions.owner().call()
    print('On-chain Contract Owner:', owner)
    print('Is Backend Wallet Owner?:', owner.lower() == account.address.lower())
except Exception as e:
    print('Failed to read contract owner:', e)
