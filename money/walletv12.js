/* =========================================================
 * CONFIGURAÇÕES
 * =======================================================*/

const CONTRACT_ADDRESS = "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD";
const TOKEN_ADDRESS    = "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8";
// pricePerAnalysis()
const PRICE_SELECTOR = "0x2e7d9d84";

async function getPriceFromContract() {
  const result = await ethereum.request({
    method: "eth_call",
    params: [{
      to: CONTRACT_ADDRESS,
      data: PRICE_SELECTOR
    }, "latest"]
  });
  return BigInt(result);
}

const BACKEND_URL = "https://backendv12.srrimas2017.workers.dev";
const BSC_CHAIN_ID_HEX = "0x38";
const FETCH_TIMEOUT = 8000;

/* =========================================================
 * ESTADO
 * =======================================================*/

let userWallet = sessionStorage.getItem("wallet") || null;
let lastTxHash = sessionStorage.getItem("txHash") || null;

/* =========================================================
 * 1️⃣ CONECTAR CARTEIRA
 * =======================================================*/
async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask não encontrada");

  const [account] = await ethereum.request({
    method: "eth_requestAccounts"
  });

  const chainId = await ethereum.request({ method: "eth_chainId" });
  if (chainId !== BSC_CHAIN_ID_HEX) throw new Error("Conecte-se à BSC");

  userWallet = account;
  sessionStorage.setItem("wallet", account);
  return account;
}

/* =========================================================
 * 2️⃣ APPROVE TOKEN
 * =======================================================*/
async function approveToken(amount) {
  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from: userWallet,
      to: TOKEN_ADDRESS,
      data: '0x095ea7b3' + 
            CONTRACT_ADDRESS.slice(2).padStart(64, "0") + 
            amount.toString(16).padStart(64, "0"),
      value: "0x0"
    }]
  });

  await waitForConfirmation(txHash);
}

/* =========================================================
 * 3️⃣ PAGAR ANÁLISE (CONTRATO)
 * =======================================================*/
async function payForAnalysis() {
  if (!userWallet) await connectWallet();

  // 1️⃣ Pegando preço do contrato
  const price = await getPriceFromContract();

  // 2️⃣ Approve
  await approveToken(price);

  // 3️⃣ Chamada do contrato usando selector + ABI mínima
  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from: userWallet,
      to: CONTRACT_ADDRESS,
      data: '0x1f4b4c3b', // payForAnalysis()
      value: "0x0"
    }]
  });

  lastTxHash = txHash;
  sessionStorage.setItem("txHash", txHash);

  await waitForConfirmation(txHash);

  return { wallet: userWallet, txHash };
}

/* =========================================================
 * 4️⃣ BACKEND
 * =======================================================*/
async function unlockAnalysis({ fixtureId }) {
  if (!fixtureId) throw new Error("fixtureId ausente");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(`${BACKEND_URL}/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        fixtureId,
        user: userWallet,
        txHash: lastTxHash
      })
    });
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
 * AUX — CONFIRMAÇÃO
 * =======================================================*/
async function waitForConfirmation(txHash) {
  let receipt = null;
  while (!receipt) {
    receipt = await ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash]
    });
    await new Promise(r => setTimeout(r, 1500));
  }
  if (!receipt.status) throw new Error("Transação falhou");
  return receipt;
}

/* =========================================================
 * EXPORT
 * =======================================================*/
window.walletv12 = {
  connectWallet,
  payForAnalysis,
  unlockAnalysis
};
