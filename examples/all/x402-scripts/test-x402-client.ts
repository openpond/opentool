import { payX402 } from "opentool/x402";

async function main() {
  // Get private key from environment
  const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    console.error("❌ PRIVATE_KEY environment variable required");
    process.exit(1);
  }

  console.log("🔐 Testing x402 payment with private key signer...\n");

  const result = await payX402({
    privateKey,
    url: "http://localhost:7000/premium-report",
    body: { symbol: "BTC" },
    rpcUrl: "https://sepolia.base.org",
  });

  if (result.success) {
    console.log("✅ Payment successful!");
    console.log("\nPayment Details:");
    console.log(`  Amount: ${result.paymentDetails?.amount}`);
    console.log(`  Currency: ${result.paymentDetails?.currency}`);
    console.log(`  Network: ${result.paymentDetails?.network}`);
    console.log(`  Signature: ${result.paymentDetails?.signature?.slice(0, 20)}...`);

    if (result.response) {
      const data = await result.response.json();
      console.log("\nResponse:");
      console.log(JSON.stringify(data, null, 2));
    }
  } else {
    console.error("❌ Payment failed:");
    console.error(result.error);
  }
}

main().catch(console.error);
