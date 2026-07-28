/* Polygon Amoy Testnet Configuration */

const ALCHEMY_RPC_URL = import.meta.env.VITE_ALCHEMY_RPC_URL?.trim();

if (!ALCHEMY_RPC_URL) {
  throw new Error('Missing VITE_ALCHEMY_RPC_URL - set this in frontend/.env');
}

export const DEDICATED_RPC_URL = ALCHEMY_RPC_URL;

export const POLYGON_AMOY = {
  chainId: '0x13882',
  chainIdDecimal: 80002,
  chainName: 'Polygon Amoy',
  nativeCurrency: {
    name: 'POL',
    symbol: 'POL',
    decimals: 18,
  },
  rpcUrls: [
    DEDICATED_RPC_URL
  ],
  blockExplorerUrls: ['https://amoy.polygonscan.com/'],
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
