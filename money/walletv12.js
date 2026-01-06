import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/+esm";

/* =============================
CONFIG
============================= */
const CFG = {
  backend: "https://backendv12.srrimas2017.workers.dev",
  chainId: 56,
  chainHex: "0x38",

  tokenAddress: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8",
  paymentContract: "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD",

  tokenABI: [
    "function approve(address,uint256) returns (bool)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ],

  paymentABI: [
    "function payForAnalysis()",
    "function pricePerAnalysis() view returns (uint256)",
    "event AnalysisPaid(address indexed user, uint256 amount)"
  ]
};

/* =============================
PROVIDER
============================= */
function getProvider() {
  if (!window.ethereum) return null;
  return new ethers.BrowserProvider(window.ethereum, "any");
}

/* =============================
MAIN FLOW
============================= */
export async function payAndAnalyze(fixtureId, apiKey) {
  const provider = getProvider();
  if (!provider) throw new Error("Carteira Web3 não encontrada");

  await provider.send("eth_requestAccounts", []);
  let signer = await provider.getSigner();
  const wallet = await signer.getAddress();

  /* ---------- Network check */
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== CFG.chainId) {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CFG.chainHex }]
    });
    signer = await provider.getSigner();
  }

  /* ---------- Contracts */
  const token = new ethers.Contract(
    CFG.tokenAddress,
    CFG.tokenABI,
    signer
  );

  const payment = new ethers.Contract(
    CFG.paymentContract,
    CFG.paymentABI,
    signer
  );

  /* ---------- Price */
  const price = await payment.pricePerAnalysis();
  const balance = await token.balanceOf(wallet);
  if (balance < price) throw new Error("Saldo insuficiente");

  /* ---------- Approve if needed */
  const allowance = await token.allowance(wallet, CFG.paymentContract);
  if (allowance < price) {
    const txApprove = await token.approve(CFG.paymentContract, price);
    await txApprove.wait();
  }

  /* ---------- Pay */
  const txPay = await payment.payForAnalysis();
  const receipt = await txPay.wait();

  /* ---------- Send to backend */
  const res = await fetch(`${CFG.backend}/analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      fixtureId,
      wallet,
      txHash: receipt.hash
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Erro no backend");
  }

  return await res.json();
}
