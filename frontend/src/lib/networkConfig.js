/* ── Sepolia Testnet Configuration ──────────────────────── */

export const POLYGON_AMOY = {
  chainId: '0xaa36a7',           // 11155111 in decimal
  chainIdDecimal: 11155111,
  chainName: 'Sepolia Testnet',
  nativeCurrency: {
    name: 'SepoliaETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
  blockExplorerUrls: ['https://sepolia.etherscan.io/'],
};

/* ── Contract Config ─────────────────────────────────────── */

export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

/* ── ABI (InvoicePool) — only the functions we call ─────── */
export const INVOICE_POOL_ABI = [
  // Read
  'function poolCount() view returns (uint256)',
  'function pools(uint256) view returns (uint256 id, string name, uint256 apyBps, uint256 durationDays, uint256 totalSize, uint256 remainingSize, bool isSettled, address creator, uint256 createdAt)',
  'function getPool(uint256 _poolId) view returns (tuple(uint256 id, string name, uint256 apyBps, uint256 durationDays, uint256 totalSize, uint256 remainingSize, bool isSettled, address creator, uint256 createdAt))',
  'function getInvestment(uint256 _poolId, address _investor) view returns (uint256 amount, bool claimed)',
  'function getPoolInvestorCount(uint256 _poolId) view returns (uint256)',

  // Write
  'function invest(uint256 _poolId) payable',
  'function createPool(string _name, uint256 _apyBps, uint256 _durationDays, uint256 _totalSize)',
  'function settlePool(uint256 _poolId)',

  // Events
  'event PoolCreated(uint256 indexed poolId, string name, uint256 totalSize)',
  'event Invested(address indexed investor, uint256 indexed poolId, uint256 amount)',
  'event PoolSettled(uint256 indexed poolId, uint256 totalDistributed)',
];
