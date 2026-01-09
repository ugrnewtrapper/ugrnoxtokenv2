import { ethers } from "ethers";

/* =============================
   CONFIGURAÇÕES
   ============================= */

const BNB_RPC_URLS = [
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
  "https://bsc-dataseed1.ninicoin.io/"
];

const CHAIN_ID = 56;
const BACKEND_V12_URL = "https://backendv12.srrimas2017.workers.dev";

const TOKEN_ADDRESS =
  "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8".toLowerCase();

const PAYMENT_CONTRACT =
  "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD".toLowerCase();

/* =============================
   ABIs MÍNIMAS
   ============================= */

const PAYMENT_ABI = [
  "event AnalysisPaid(address indexed user, uint256 amount)",
  "function pricePerAnalysis() view returns (uint256)"
];

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

/* =============================
   PROVIDER COM FALLBACK REAL
   ============================= */

async function getProvider() {
  for (const url of BNB_RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(url, CHAIN_ID);
      await provider.getBlockNumber();
      return provider;
    } catch (_) {}
  }
  throw new Error("NO_RPC_AVAILABLE");
}

/* =============================
   VALIDAÇÃO PRINCIPAL
   ============================= */

export async function validatePaymentAndRequestAnalysis({
  txHash,
  fixtureId,
  apiKey
}) {
  if (!ethers.isHexString(txHash) || !fixtureId || !apiKey) {
    throw new Error("INVALID_INPUT");
  }

  const provider = await getProvider();

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== CHAIN_ID) {
    throw new Error("INVALID_CHAIN");
  }

  const tx = await provider.getTransaction(txHash);
  if (!tx || !tx.to || tx.to.toLowerCase() !== PAYMENT_CONTRACT) {
    throw new Error("INVALID_PAYMENT_CONTRACT");
  }

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1 || !receipt.blockNumber) {
    throw new Error("TX_FAILED_OR_PENDING");
  }

  /* =============================
     EVENTO AnalysisPaid
     ============================= */

  const paymentContract = new ethers.Contract(
    PAYMENT_CONTRACT,
    PAYMENT_ABI,
    provider
  );

  const iface = paymentContract.interface;
  const analysisEvent = iface.getEvent("AnalysisPaid").topicHash;

  const log = receipt.logs.find(
    l =>
      l.address.toLowerCase() === PAYMENT_CONTRACT &&
      l.topics[0] === analysisEvent
  );

  if (!log) {
    throw new Error("ANALYSIS_PAID_EVENT_NOT_FOUND");
  }

  const parsed = iface.parseLog(log);
  const paidUser = parsed.args.user.toLowerCase();
  const paidAmount = parsed.args.amount;

  if (paidUser !== tx.from.toLowerCase()) {
    throw new Error("INVALID_PAYER");
  }

  const expectedPrice = await paymentContract.pricePerAnalysis();
  if (paidAmount.toString() !== expectedPrice.toString()) {
    throw new Error("INVALID_AMOUNT");
  }

  /* =============================
     EVENTO Transfer (TOKEN)
     ============================= */

  const erc20Iface = new ethers.Interface(ERC20_ABI);
  const transferTopic = erc20Iface.getEvent("Transfer").topicHash;

  const tokenLog = receipt.logs.find(
    l =>
      l.address.toLowerCase() === TOKEN_ADDRESS &&
      l.topics[0] === transferTopic
  );

  if (!tokenLog) {
    throw new Error("TOKEN_TRANSFER_NOT_FOUND");
  }

  /* =============================
     CHAMADA BACKEND V12
     ============================= */

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${BACKEND_V12_URL}/api/analisar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ apiKey, fixtureId, txHash })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.code || "BACKEND_REJECTED");
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
