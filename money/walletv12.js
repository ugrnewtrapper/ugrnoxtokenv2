/* =========================================================
 * WALLET v12 - NOX Premium Analytics
 * =========================================================*/

if (!window.ethereum) {
  throw new Error("⚠️ Web3 não encontrado. Use MetaMask ou outro navegador com carteira.");
}

/* =========================================================
 * CONFIGURAÇÕES
 * =======================================================*/

const CONTRACT_ADDRESS = "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD"; // contrato de cobrança
const TOKEN_ADDRESS    = "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8"; // token BEP20
const PRICE_SELECTOR   = "0x2e7d9d84"; // pricePerAnalysis() no contrato

const BACKEND_URL      = "https://backendv12.srrimas2017.workers.dev";
const BSC_CHAIN_ID_HEX = "0x38";
const FETCH_TIMEOUT    = 8000;

/* =========================================================
 * ESTADO
 * =======================================================*/

let userWallet = sessionStorage.getItem("wallet") || null;
let lastTxHash = sessionStorage.getItem("txHash") || null;

/* =========================================================
 * HELPERS
 * =======================================================*/

// Obter preço atual do contrato
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

// Aguardar confirmação da transação
async function waitForConfirmation(txHash) {
  let receipt = null;
  while (!receipt) {
    receipt = await ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash]
    });
    await new Promise(r => setTimeout(r, 1500));
  }
  if (!receipt.status) throw new Error("❌ Transação falhou");
  return receipt;
}

/* =========================================================
 * 1️⃣ CONECTAR CARTEIRA
 * =======================================================*/
async function connectWallet() {
  const [account] = await ethereum.request({ method: "eth_requestAccounts" });
  const chainId = await ethereum.request({ method: "eth_chainId" });
  if (chainId !== BSC_CHAIN_ID_HEX) throw new Error("⚠️ Conecte-se à BSC");

  userWallet = account;
  sessionStorage.setItem("wallet", account);
  return account;
}

/* =========================================================
 * 2️⃣ APPROVE TOKEN
 * =======================================================*/
async function approveToken() {
  const price = await getPriceFromContract();

  // Primeiro, zerar allowance (previne problemas com alguns tokens)
  const zeroTx = await ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from: userWallet,
      to: TOKEN_ADDRESS,
      data: "0x095ea7b3" + CONTRACT_ADDRESS.slice(2).padStart(64, "0") + "0".padStart(64, "0"),
      value: "0x0"
    }]
  });
  await waitForConfirmation(zeroTx);

  // Agora, aprovar o contrato para gastar o token
  const data = "0x095ea7b3" + CONTRACT_ADDRESS.slice(2).padStart(64, "0") + price.toString(16).padStart(64, "0");
  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from: userWallet,
      to: TOKEN_ADDRESS,
      data,
      value: "0x0"
    }]
  });

  await waitForConfirmation(txHash);
  return txHash;
}

/* =========================================================
 * 3️⃣ PAGAR ANÁLISE (CONTRATO)
 * =======================================================*/
async function payForAnalysis() {
  if (!userWallet) await connectWallet();

  // 1️⃣ Approve
  await approveToken();

  // 2️⃣ payForAnalysis()
  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from: userWallet,
      to: CONTRACT_ADDRESS,
      data: "0x1f4b4c3b",
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
  if (!fixtureId) throw new Error("❌ fixtureId ausente");

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
 * EXPORT
 * =======================================================*/
window.walletv12 = {
  connectWallet,
  payForAnalysis,
  unlockAnalysis
};
