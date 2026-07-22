// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InvoicePool
 * @notice Invoicefi invoice financing pools on Polygon Amoy.
 *         Exporters create pools backed by invoices; investors fund them for yield.
 */
contract InvoicePool is ReentrancyGuard {

    /* ── Types ───────────────────────────────────────────── */
    struct Pool {
        uint256 id;
        string  name;
        uint256 apyBps;          // basis points (1400 = 14.00%)
        uint256 durationDays;
        uint256 totalSize;       // in wei
        uint256 remainingSize;   // in wei
        bool    isSettled;
        address creator;
        uint256 createdAt;
    }

    struct InvestorPosition {
        uint256 amount;
        bool    claimed;
    }

    /* ── State ───────────────────────────────────────────── */
    address public owner;
    uint256 public poolCount;

    mapping(uint256 => Pool) public pools;
    // poolId => investor => position
    mapping(uint256 => mapping(address => InvestorPosition)) public positions;
    // poolId => list of investors (for settlement iteration)
    mapping(uint256 => address[]) public poolInvestors;

    /* ── Events ──────────────────────────────────────────── */
    event PoolCreated(uint256 indexed poolId, string name, uint256 totalSize);
    event Invested(address indexed investor, uint256 indexed poolId, uint256 amount);
    event PoolSettled(uint256 indexed poolId, uint256 totalDistributed);

    /* ── Modifiers ───────────────────────────────────────── */
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /* ── Constructor ─────────────────────────────────────── */
    constructor() {
        owner = msg.sender;
    }

    /* ── Pool Management ─────────────────────────────────── */

    /**
     * @notice Create a new investment pool backed by an invoice.
     * @param _name        Human-readable pool name
     * @param _apyBps      Annual yield in basis points (e.g. 1400 = 14%)
     * @param _durationDays Invoice tenor in days
     * @param _totalSize    Total pool capacity in wei
     */
    function createPool(
        string calldata _name,
        uint256 _apyBps,
        uint256 _durationDays,
        uint256 _totalSize
    ) external onlyOwner {
        require(_totalSize > 0, "Size must be > 0");
        require(_apyBps > 0 && _apyBps <= 10000, "APY out of range");

        poolCount++;
        pools[poolCount] = Pool({
            id: poolCount,
            name: _name,
            apyBps: _apyBps,
            durationDays: _durationDays,
            totalSize: _totalSize,
            remainingSize: _totalSize,
            isSettled: false,
            creator: msg.sender,
            createdAt: block.timestamp
        });

        emit PoolCreated(poolCount, _name, _totalSize);
    }

    /* ── Investment ───────────────────────────────────────── */

    /**
     * @notice Invest MATIC into a pool.
     * @param _poolId The pool to invest in.
     */
    function invest(uint256 _poolId) external payable nonReentrant {
        Pool storage pool = pools[_poolId];
        require(pool.id != 0, "Pool not found");
        require(!pool.isSettled, "Pool already settled");
        require(msg.value > 0, "Must send MATIC");
        require(msg.value <= pool.remainingSize, "Exceeds remaining size");

        // Track position
        InvestorPosition storage pos = positions[_poolId][msg.sender];

        if (pos.amount == 0) {
            // First investment in this pool — add to investors list
            poolInvestors[_poolId].push(msg.sender);
        }

        pos.amount += msg.value;
        pool.remainingSize -= msg.value;

        emit Invested(msg.sender, _poolId, msg.value);
    }

    /* ── Settlement ──────────────────────────────────────── */

    /**
     * @notice Settle a pool — distribute principal + yield to all investors.
     *         Owner must fund the contract with enough MATIC to cover yield.
     * @param _poolId The pool to settle.
     */
    function settlePool(uint256 _poolId) external onlyOwner nonReentrant {
        Pool storage pool = pools[_poolId];
        require(pool.id != 0, "Pool not found");
        require(!pool.isSettled, "Already settled");

        uint256 totalDistributed = 0;
        address[] storage investors = poolInvestors[_poolId];

        for (uint256 i = 0; i < investors.length; i++) {
            InvestorPosition storage pos = positions[_poolId][investors[i]];

            if (pos.amount > 0 && !pos.claimed) {
                // Calculate yield: principal * apyBps / 10000 * durationDays / 365
                uint256 yieldAmount = (pos.amount * pool.apyBps * pool.durationDays) / (10000 * 365);
                uint256 payout = pos.amount + yieldAmount;

                pos.claimed = true;
                totalDistributed += payout;

                (bool sent, ) = payable(investors[i]).call{value: payout}("");
                require(sent, "Transfer failed");
            }
        }

        pool.isSettled = true;
        emit PoolSettled(_poolId, totalDistributed);
    }

    /* ── View Functions ──────────────────────────────────── */

    function getPool(uint256 _poolId) external view returns (Pool memory) {
        require(pools[_poolId].id != 0, "Pool not found");
        return pools[_poolId];
    }

    function getInvestment(uint256 _poolId, address _investor)
        external view returns (uint256 amount, bool claimed)
    {
        InvestorPosition storage pos = positions[_poolId][_investor];
        return (pos.amount, pos.claimed);
    }

    function getPoolInvestorCount(uint256 _poolId) external view returns (uint256) {
        return poolInvestors[_poolId].length;
    }

    /* ── Receive MATIC (for funding settlement yield) ──── */
    receive() external payable {}
}
