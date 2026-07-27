"""
Blockchain read-only verification:
- Connect to POLYGON_AMOY_RPC_URL
- Confirm chain_id = 80002
- Confirm bytecode exists at CONTRACT_ADDRESS
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

rpc_url = os.getenv("POLYGON_AMOY_RPC_URL", "https://polygon-amoy.drpc.org")
contract_address = os.getenv("CONTRACT_ADDRESS")
expected_chain_id = int(os.getenv("POLYGON_AMOY_CHAIN_ID", "80002"))

print(f"RPC URL: {rpc_url}")
print(f"Contract: {contract_address}")
print(f"Expected chain_id: {expected_chain_id}")

try:
    from web3 import Web3
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    connected = w3.is_connected()
    print(f"Connected: {connected}")
    
    if connected:
        chain_id = w3.eth.chain_id
        print(f"Actual chain_id: {chain_id}")
        
        if chain_id == expected_chain_id:
            print(f"[OK] Chain ID matches Polygon Amoy ({expected_chain_id})")
        else:
            print(f"[FAIL] Chain ID mismatch: got {chain_id}, expected {expected_chain_id}")
        
        if contract_address and Web3.is_address(contract_address):
            checksum_addr = Web3.to_checksum_address(contract_address)
            code = w3.eth.get_code(checksum_addr)
            if code and code != b'' and code != '0x':
                print(f"[OK] Contract bytecode found at {checksum_addr} ({len(code)} bytes)")
            else:
                print(f"[FAIL] No bytecode at {checksum_addr}")
        else:
            print("[FAIL] CONTRACT_ADDRESS is invalid or not set")
    else:
        print("[FAIL] Cannot connect to RPC")
        
except ImportError:
    print("[FAIL] web3 not installed")
except Exception as e:
    print(f"[ERROR] {e}")

