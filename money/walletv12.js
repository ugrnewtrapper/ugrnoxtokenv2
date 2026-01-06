/* =========================================================
 * WALLET v12 – Web3-only
 * Compatível com backend
 * =======================================================*/

const CONTRACT_ADDRESS = "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD";
const TOKEN_ADDRESS    = "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8";
const PRICE_SELECTOR   = "0x2e7d9d84"; // pricePerAnalysis() do contrato
const APPROVE_SELECTOR = "0x095ea7b3"; // approve(address,uint256)
const PAY_SELECTOR     = "0x1f4b4c3b"; // payForAnalysis()
const BACKEND_URL      = "https://backendv12.srrimas2017.workers.dev";
const BSC_CHAIN_ID_HEX = "0x38";

let userWallet = null;
let lastTxHash = null;

/* =========================================================
 * CHECA SE ESTÁ RODANDO DENTRO DE UMA CARTEIRA WEB3
 * =======================================================*/
function requireWeb3() {
  if (!window.ethereum) throw new Error("Carteira Web3 não encontrada");
}

/* =========================================================
 * 1️⃣ CONECTAR CARTEIRA
 * =======================================================*/
async function connectWallet() {
  requireWeb3();
  const [account] = await ethereum.request({ method: "eth_requestAccounts" });

  const chainId = await ethereum.request({ method: "eth_chainId" });
  if (chainId !== BSC_CHAIN_ID_HEX) throw new Error("Conecte-se à BSC");

  userWallet = account;
  return account;
}

/* =========================================================
 * 2️⃣ PEGAR PREÇO DO CONTRATO
 * =======================================================*/
async function getPriceFromContract() {
  requireWeb3();
  const result = await ethereum.request({
    method: "eth_call",
    params: [{ to: CONTRACT_ADDRESS, data: PRICE_SELECTOR }, "latest"]
  });
  return BigInt(result);
}

/* =========================================================
 * 3️⃣ APPROVE TOKEN
 * =======================================================*/
async function approveToken() {
  requireWeb3();
  if (!userWallet) await connectWallet();

  const price = await getPriceFromContract();

  const data =
    APPROVE_SELECTOR +
    CONTRACT_ADDRESS.slice(2).padStart(64, "0") +
    price.toString(16).padStart(64, "0");

  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from: userWallet, to: TOKEN_ADDRESS, data, value: "0x0" }]
  });

  lastTxHash = txHash;
  return waitForConfirmation(txHash);
}

/* =========================================================
 * 4️⃣ PAGAR ANÁLISE
 * =======================================================*/
async function payForAnalysis() {
  requireWeb3();
  if (!userWallet) await connectWallet();

  // 1️⃣ Approve token
  await approveToken();

  // 2️⃣ Pagar análise no contrato
  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from: userWallet, to: CONTRACT_ADDRESS, data: PAY_SELECTOR, value: "0x0" }]
  });

  lastTxHash = txHash;
  await waitForConfirmation(txHash);

  return { wallet: userWallet, txHash };
}

/* =========================================================
 * 5️⃣ BACKEND: LIBERAR ANÁLISE
 * =======================================================*/
async function unlockAnalysis({ fixtureId }) {
  if (!fixtureId) throw new Error("fixtureId ausente");
  if (!userWallet) await connectWallet();

  const res = await fetch(`${BACKEND_URL}/analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fixtureId,
      user: userWallet,
      txHash: lastTxHash
    })
  });

  return res.json();
}

/* =========================================================
 * 6️⃣ AUX — ESPERA CONFIRMAÇÃO
 * =======================================================*/
async function waitForConfirmation(txHash) {
  requireWeb3();
  let receipt = null;
  while (!receipt) {
    receipt = await ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash]
    });
    await new Promise(r => setTimeout(r, 1500));
  }
  if (!receipt.status) throw new Error("Transação falhou ou revertida");
  return receipt;
}

/* =========================================================
 * EXPORT
 * =======================================================*/
window.walletv12 = {
  connectWallet,
  payForAnalysis,
  unlockAnalysis,
  getPriceFromContract
};
