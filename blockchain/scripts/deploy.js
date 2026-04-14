import hre from "hardhat";

async function main() {
  console.log("Deploying InvoicePool to", hre.network.name, "...\n");

  const InvoicePool = await hre.ethers.getContractFactory("InvoicePool");
  const pool = await InvoicePool.deploy();
  await pool.waitForDeployment();

  const address = await pool.getAddress();
  console.log("✅ InvoicePool deployed at:", address);

  // ── Create 3 seed pools for demo ──────────────────────
  console.log("\nCreating seed pools...");

  const pools = [
    {
      name: "Tata Steel Export Invoice",
      apyBps: 1420,        // 14.20%
      durationDays: 90,
      totalSize: hre.ethers.parseEther("5"),  // 5 MATIC
    },
    {
      name: "Payverge Fintech Receivable",
      apyBps: 1280,        // 12.80%
      durationDays: 60,
      totalSize: hre.ethers.parseEther("3"),  // 3 MATIC
    },
    {
      name: "Flowtap Logistics Freight",
      apyBps: 1350,        // 13.50%
      durationDays: 45,
      totalSize: hre.ethers.parseEther("2"),  // 2 MATIC
    },
  ];

  for (const p of pools) {
    const tx = await pool.createPool(p.name, p.apyBps, p.durationDays, p.totalSize);
    await tx.wait();
    console.log(`  ✅ Pool created: "${p.name}" (${p.apyBps / 100}% APY, ${p.durationDays}d)`);
  }

  console.log(`\nDone! ${pools.length} pools created.`);
  console.log("\n─── Copy this to your .env files ───");
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
  console.log(`CONTRACT_ADDRESS=${address}`);
  console.log("────────────────────────────────────\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
