/**
 * =========================================================
 * walletv12.js – CORRIGIDO PARA ORCS
 * Rede: BSC (BNB - 18 decimais)
 * Backend: Cloudflare Workers (worker2.js)
 * =========================================================
 */

/* =========================================================
 * CONFIGURAÇÕES
 * =======================================================*/

// Endereço do contrato na BSC
const CONTRACT_ADDRESS = "0xSEU_CONTRATO_BSC_AQUI";

// Valor do pagamento em BNB
const PAYMENT_AMOUNT_BNB = "0.01";

// 🔥 URL REAL DO ORCS (SEM BARRA FINAL)
const BACKEND_URL = "https://backendnoxv22.srrimas2017.workers.dev";

// ChainId da BSC
const BSC_CHAIN_ID_HEX = "0x38";

// Timeout para chamadas HTTP
const FETCH_TIMEOUT = 8000;

/* =========================================================
 * ESTADO PERSISTENTE
 * =======================================================*/
let userWallet = sessionStorage.getItem("wallet") || null;
let lastTxHash = sessionStorage.getItem("txHash") || null;

/* =========================================================
 * CONECTAR CARTEIRA + VALIDAR BSC
 * =======================================================*/
async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("Carteira Web3 não encontrada");
  }

  const accounts = await ethereum.request({
    method: "eth_requestAccounts"
  });

  userWallet = accounts[0];
  sessionStorage.setItem("wallet", userWallet);

  const chainId = await ethereum.request({
    method: "eth_chainId"
  });

  if (chainId !== BSC_CHAIN_ID_HEX) {
    throw new Error("Conecte-se à Binance Smart Chain (BSC)");
  }

  return userWallet;
}

/* =========================================================
 * PAGAMENTO
 * =======================================================*/
async function payForAnalysis() {
  if (!userWallet) {
    await connectWallet();
  }

  const tx = {
    from: userWallet,
    to: CONTRACT_ADDRESS,
    value: bnbToHex(PAYMENT_AMOUNT_BNB),
    data: "0x"
  };

  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [tx]
  });

  lastTxHash = txHash;
  sessionStorage.setItem("txHash", txHash);

  await waitForConfirmation(txHash);

  return { wallet: userWallet, txHash };
}

/* =========================================================
 * LIBERAR ANÁLISE (ROTA ORCS)
 * =======================================================*/
async function unlockAnalysis({ apiKey, fixtureId }) {
  if (!apiKey || !fixtureId) {
    throw new Error("apiKey ou fixtureId ausente");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${BACKEND_URL}/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        apiKey,
        fixtureId,
        wallet: userWallet,
        txHash: lastTxHash
      })
    });

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
 * UTIL – BNB → WEI (18 DECIMAIS, SEGURO)
 * =======================================================*/
function bnbToHex(value) {
  const [intPart, decPart = ""] = value.split(".");
  const wei = BigInt(intPart + decPart.padEnd(18, "0"));
  return "0x" + wei.toString(16);
}

/* =========================================================
 * UTIL – CONFIRMAÇÃO ON-CHAIN
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

  if (!receipt.status) {
    throw new Error("Transação falhou");
  }
}

/* =========================================================
 * EXPORT GLOBAL
 * =======================================================*/
window.walletv12 = {
  connectWallet,
  payForAnalysis,
  unlockAnalysis
};
