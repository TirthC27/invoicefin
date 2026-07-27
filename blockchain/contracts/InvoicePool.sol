// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InvoicePool
 * @notice Invoicefi invoice financing pools on Polygon Amoy.
 *         Exporters create pools backed by invoices; investors fund them for yield.
 */
contract InvoicePool is ReentrancyGuard {

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

    address public owner;
    uint256 public poolCount;

    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => InvestorPosition)) public positions;
    mapping(uint256 => address[]) public poolInvestors;

    event PoolCreated(uint256 indexed poolId, string name, uint256 totalSize);
    event Invested(address indexed investor, uint256 indexed poolId, uint256 amount);
    event PoolSettled(uint256 indexed poolId, uint256 settlementFunding);
    event PayoutClaimed(address indexed investor, uint256 indexed poolId, uint256 payout);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Create a new investment pool backed by an invoice.
     * @param _name Human-readable pool name
     * @param _apyBps Annual yield in basis points (e.g. 1400 = 14%)
     * @param _durationDays Invoice tenor in days
     * @param _totalSize Total pool capacity in wei
     */
    function createPool(
        string calldata _name,
        uint256 _apyBps,
        uint256 _durationDays,
        uint256 _totalSize
    ) external onlyOwner {
        require(_totalSize > 0, "Size must be > 0");
        require(_apyBps > 0 && _apyBps <= 10000, "APY out of range");
        require(_durationDays > 0, "Duration must be > 0");

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

    /**
     * @notice Invest POL into a pool.
     * @param _poolId The pool to invest in.
     */
    function invest(uint256 _poolId) external payable nonReentrant {
        Pool storage pool = pools[_poolId];
        require(pool.id != 0, "Pool not found");
        require(!pool.isSettled, "Pool already settled");
        require(msg.value > 0, "Must send POL");
        require(msg.value <= pool.remainingSize, "Exceeds remaining size");

        InvestorPosition storage pos = positions[_poolId][msg.sender];

        if (pos.amount == 0) {
            poolInvestors[_poolId].push(msg.sender);
        }

        pos.amount += msg.value;
        pool.remainingSize -= msg.value;

        emit Invested(msg.sender, _poolId, msg.value);
    }

    /**
     * @notice Mark a pool settled and optionally fund the contract with payout liquidity.
     * @dev Investors withdraw individually with claimPayout(), avoiding a loop over all investors.
     * @param _poolId The pool to settle.
     */
    function settlePool(uint256 _poolId) external payable onlyOwner nonReentrant {
        Pool storage pool = pools[_poolId];
        require(pool.id != 0, "Pool not found");
        require(!pool.isSettled, "Already settled");

        pool.isSettled = true;
        emit PoolSettled(_poolId, msg.value);
    }

    /**
     * @notice Claim principal plus yield for a settled pool.
     * @param _poolId The settled pool to claim from.
     */
    function claimPayout(uint256 _poolId) external nonReentrant {
        uint256 payout = getClaimableAmount(_poolId, msg.sender);
        require(payout > 0, "Nothing to claim");
        require(address(this).balance >= payout, "Insufficient settlement funds");

        positions[_poolId][msg.sender].claimed = true;

        (bool sent, ) = payable(msg.sender).call{value: payout}("");
        require(sent, "Transfer failed");

        emit PayoutClaimed(msg.sender, _poolId, payout);
    }

    function getPool(uint256 _poolId) external view returns (Pool memory) {
        require(pools[_poolId].id != 0, "Pool not found");
        return pools[_poolId];
    }

    function getInvestment(uint256 _poolId, address _investor)
        external
        view
        returns (uint256 amount, bool claimed)
    {
        InvestorPosition storage pos = positions[_poolId][_investor];
        return (pos.amount, pos.claimed);
    }

    function getClaimableAmount(uint256 _poolId, address _investor) public view returns (uint256) {
        Pool storage pool = pools[_poolId];
        require(pool.id != 0, "Pool not found");

        InvestorPosition storage pos = positions[_poolId][_investor];
        if (!pool.isSettled || pos.amount == 0 || pos.claimed) {
            return 0;
        }

        uint256 yieldAmount = (pos.amount * pool.apyBps * pool.durationDays) / (10000 * 365);
        return pos.amount + yieldAmount;
    }

    function getPoolInvestorCount(uint256 _poolId) external view returns (uint256) {
        return poolInvestors[_poolId].length;
    }

    receive() external payable {}
}