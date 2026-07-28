import { Contract, parseEther, JsonRpcProvider } from 'ethers';
import { CONTRACT_ADDRESS, DEDICATED_RPC_URL, INVOICE_POOL_ABI, POLYGON_AMOY } from './networkConfig';

const TRANSACTION_CONFIRMATION_TIMEOUT_MS = 90000;
const WALLET_INTERACTION_TIMEOUT_MS = 20000;

const withTimeout = (promise, ms, code, message) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = new Error(message);
      timeoutError.code = code;
      reject(timeoutError);
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

// Dedicated provider for read/gas operations to avoid MetaMask rate limits
export const dedicatedProvider = new JsonRpcProvider(DEDICATED_RPC_URL, {
  chainId: POLYGON_AMOY.chainIdDecimal,
  name: POLYGON_AMOY.chainName,
});
dedicatedProvider.pollingInterval = 15000;

/* ── Get contract instance ───────────────────────────────── */

export function getContract(signerOrProvider = dedicatedProvider) {
  return new Contract(CONTRACT_ADDRESS, INVOICE_POOL_ABI, signerOrProvider);
}

/* ── Invest in a pool ────────────────────────────────────── */

export async function investInPool(signer, poolId, amountInMatic) {
  const value = parseEther(amountInMatic.toString());

  // Use dedicated provider to build the transaction (avoids Metamask eth_blockNumber rate limit)
  const readContract = getContract(dedicatedProvider);
  const txData = await readContract.invest.populateTransaction(poolId, { value });
  
  // Get fee data from the dedicated provider
  const feeData = await dedicatedProvider.getFeeData();
  
  // Estimate gas using dedicated provider
  const gasEstimate = await dedicatedProvider.estimateGas({
    ...txData,
    from: await signer.getAddress()
  });

  // Construct the final transaction to send to the wallet for signing only
  const txReq = {
    ...txData,
    gasLimit: (gasEstimate * 120n) / 100n, // Add 20% buffer
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  };

  const tx = await withTimeout(
    signer.sendTransaction(txReq),
    WALLET_INTERACTION_TIMEOUT_MS,
    'WALLET_INTERACTION_TIMEOUT',
    "Your wallet isn't responding."
  );

  return {
    txHash: tx.hash,
    wait: async () => {
      const receipt = await dedicatedProvider.waitForTransaction(
        tx.hash,
        1,
        TRANSACTION_CONFIRMATION_TIMEOUT_MS
      );
      if (!receipt) {
        const timeoutError = new Error('Transaction confirmation timed out.');
        timeoutError.code = 'TRANSACTION_CONFIRMATION_TIMEOUT';
        timeoutError.txHash = tx.hash;
        throw timeoutError;
      }
      return {
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
      };
    },
  };
}
