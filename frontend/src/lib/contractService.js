import { Contract, parseEther, formatEther } from 'ethers';
import { CONTRACT_ADDRESS, INVOICE_POOL_ABI } from './networkConfig';

/* ── Get contract instance ───────────────────────────────── */

export function getContract(signerOrProvider) {
  return new Contract(CONTRACT_ADDRESS, INVOICE_POOL_ABI, signerOrProvider);
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
  const contract = getContract(signer);
  const value = parseEther(amountInMatic.toString());

  // Call the payable invest function
  const tx = await contract.invest(poolId, { value });

  return {
    txHash: tx.hash,
    wait: async () => {
      const receipt = await tx.wait();
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
