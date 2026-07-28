/* Polygon Amoy Testnet Configuration */

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
    import.meta.env.VITE_ALCHEMY_RPC_URL,
    import.meta.env.VITE_POLYGON_AMOY_RPC_URL,
    'https://polygon-amoy.drpc.org',
    'https://rpc-amoy.polygon.technology',
    'https://polygon-amoy-bor-rpc.publicnode.com',
  ].filter(Boolean),
  blockExplorerUrls: ['https://amoy.polygonscan.com/'],
};

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

export function isContractConfigured() {
  return Boolean(CONTRACT_ADDRESS) && CONTRACT_ADDRESS.toLowerCase() !== ZERO_ADDRESS;
}

export const INVOICE_POOL_ABI = [
  'function poolCount() view returns (uint256)',
  'function pools(uint256) view returns (uint256 id, string name, uint256 apyBps, uint256 durationDays, uint256 totalSize, uint256 remainingSize, bool isSettled, address creator, uint256 createdAt)',
  'function getPool(uint256 _poolId) view returns (tuple(uint256 id, string name, uint256 apyBps, uint256 durationDays, uint256 totalSize, uint256 remainingSize, bool isSettled, address creator, uint256 createdAt))',
  'function getInvestment(uint256 _poolId, address _investor) view returns (uint256 amount, bool claimed)',
  'function getClaimableAmount(uint256 _poolId, address _investor) view returns (uint256)',
  'function getPoolInvestorCount(uint256 _poolId) view returns (uint256)',
  'function invest(uint256 _poolId) payable',
  'function createPool(string _name, uint256 _apyBps, uint256 _durationDays, uint256 _totalSize)',
  'function settlePool(uint256 _poolId) payable',
  'function claimPayout(uint256 _poolId)',
  'event PoolCreated(uint256 indexed poolId, string name, uint256 totalSize)',
  'event Invested(address indexed investor, uint256 indexed poolId, uint256 amount)',
  'event PoolSettled(uint256 indexed poolId, uint256 settlementFunding)',
  'event PayoutClaimed(address indexed investor, uint256 indexed poolId, uint256 payout)',
];
