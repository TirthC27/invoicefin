import { Contract, JsonRpcProvider, parseEther, formatEther, isAddress } from 'ethers';
import { CONTRACT_ADDRESS, INVOICE_POOL_ABI, POLYGON_AMOY, isContractConfigured } from './networkConfig';

const WALLET_INTERACTION_TIMEOUT_MS = 45000;
const TRANSACTION_CONFIRMATION_TIMEOUT_MS = 120000;

let dedicatedProvider = null;

const getDedicatedProvider = () => {
  if (dedicatedProvider) return dedicatedProvider;
  const rpcUrl = POLYGON_AMOY.rpcUrls[0];
  if (!rpcUrl) return null;

  dedicatedProvider = new JsonRpcProvider(rpcUrl, {
    chainId: POLYGON_AMOY.chainIdDecimal,
    name: POLYGON_AMOY.chainName,
  });
  dedicatedProvider.pollingInterval = 15000;
  return dedicatedProvider;
};

const withTimeout = (promise, ms, message) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

/* ── Get contract instance ───────────────────────────────── */

export function getContract(signerOrProvider) {
  if (!isContractConfigured() || !isAddress(CONTRACT_ADDRESS)) {
    throw new Error('Contract is not configured. Set VITE_CONTRACT_ADDRESS to the deployed InvoicePool address.');
  }
  return new Contract(CONTRACT_ADDRESS, INVOICE_POOL_ABI, signerOrProvider);
}

export function formatWalletError(err) {
  const message = err?.shortMessage || err?.info?.error?.message || err?.reason || err?.message || '';
  if (err?.code === 4001 || /user rejected/i.test(message)) {
    return 'Transaction was rejected in MetaMask.';
  }
  if (/network|chain/i.test(message)) {
    return 'Wrong network. Please switch MetaMask to Polygon Amoy.';
  }
  if (/could not coalesce|failed to fetch|network error|rpc|unavailable/i.test(message)) {
    return 'Polygon Amoy RPC is unavailable. Try another RPC in MetaMask or retry shortly.';
  }
  if (/revert|execution reverted|call exception/i.test(message)) {
    return 'Transaction reverted on-chain.';
  }
  if (/contract is not configured/i.test(message)) {
    return message;
  }
  return message || 'Transaction failed.';
}

/* ── Read all pools ──────────────────────────────────────── */

export async function fetchPools(provider) {
  const contract = getContract(provider);
  const count = await contract.poolCount();
  const pools = [];

  for (let i = 1; i <= Number(count); i++) {
    const p = await contract.getPool(i);
    pools.push({
      id: Number(p.id),
      name: p.name,
      apyBps: Number(p.apyBps),
      apyPercent: (Number(p.apyBps) / 100).toFixed(2),
      durationDays: Number(p.durationDays),
      totalSize: formatEther(p.totalSize),
      remainingSize: formatEther(p.remainingSize),
      totalSizeWei: p.totalSize,
      remainingSizeWei: p.remainingSize,
      isSettled: p.isSettled,
      creator: p.creator,
      createdAt: Number(p.createdAt),
      percentFilled: p.totalSize > 0n
        ? (100 - Number((p.remainingSize * 100n) / p.totalSize))
        : 100,
    });
  }

  return pools;
}

/* ── Invest in a pool ────────────────────────────────────── */

export async function investInPool(signer, poolId, amountInMatic) {
  const walletProvider = signer?.provider;
  const provider = getDedicatedProvider();
  if (!walletProvider) {
    throw new Error('Wallet provider is not available. Please reconnect MetaMask and try again.');
  }
  if (!provider) {
    throw new Error('Blockchain RPC provider is not available. Please try again in a moment.');
  }

  const value = parseEther(amountInMatic.toString());

  // Build the transaction with the dedicated RPC provider, then sign it in MetaMask.
  const readContract = getContract(provider);
  const txData = await readContract.invest.populateTransaction(poolId, { value });
  
  // Get fee data from the dedicated provider.
  const feeData = await provider.getFeeData();
  
  // Estimate gas using the dedicated provider.
  const gasEstimate = await provider.estimateGas({
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
      const receipt = await provider.waitForTransaction(
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

/* ── Read investor position ──────────────────────────────── */

export async function getMyInvestment(provider, poolId, investorAddress) {
  const contract = getContract(provider);
  const [amount, claimed] = await contract.getInvestment(poolId, investorAddress);
  return {
    amount: formatEther(amount),
    amountWei: amount,
    claimed,
  };
}

/* -- Settlement / payout helpers ----------------------------------------- */

export async function settlePool(signer, poolId, settlementFunding = '0') {
  const contract = getContract(signer);
  const tx = await contract.settlePool(poolId, { value: parseEther(settlementFunding.toString()) });
  return tx.wait();
}

export async function claimPayout(signer, poolId) {
  const contract = getContract(signer);
  const tx = await contract.claimPayout(poolId);
  return tx.wait();
}

export async function getClaimableAmount(provider, poolId, investorAddress) {
  const contract = getContract(provider);
  const amount = await contract.getClaimableAmount(poolId, investorAddress);
  return {
    amount: formatEther(amount),
    amountWei: amount,
  };
}