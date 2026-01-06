/**
 * =========================================================
 * walletv12.js (CORRIGIDO)
 * Rede: BSC (BNB - 18 decimais)
 * =========================================================
 *
 * Responsabilidades:
 * 1. Conectar carteira Web3
 * 2. Garantir que está na rede BSC
 * 3. Executar pagamento em BNB
 * 4. Aguardar confirmação mínima
 * 5. Enviar prova (wallet + txHash) ao backend
 *
 * Compatível com:
 * - Navegador
 * - MetaMask
 * - Backend Cloudflare Workers (worker2.js)
 * =========================================================
 */

/* =========================================================
 * CONFIGURAÇÕES
 * =======================================================*/

// Endereço do contrato na BSC
const CONTRACT_ADDRESS = "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD";

// ABI mínima (função payable)
const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "pay",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

// Valor do pagamento em BNB (18 decimais)
const PAYMENT_AMOUNT_BNB = "0.01";

// Backend Cloudflare Worker
const BACKEND_URL = "https://backendv12.srrimas2017.workers.dev";

// ChainId da BSC
const BSC_CHAIN_ID_HEX = "0x38";

// Timeout para chamadas HTTP
const FETCH_TIMEOUT = 8000;

/* =========================================================
 * ESTADO (PERSISTENTE)
 * =======================================================*/

let userWallet = sessionStorage.getItem("wallet") || null;
let lastTxHash = sessionStorage.getItem("txHash") || null;

/* =========================================================
 * 1️⃣ CONECTAR CARTEIRA E VALIDAR REDE
 * =======================================================*/
async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("Carteira Web3 não encontrada (MetaMask)");
  }

  // Solicita conta
  const accounts = await ethereum.request({
    method: "eth_requestAccounts"
  });

  userWallet = accounts[0];
  sessionStorage.setItem("wallet", userWallet);

  // Verifica rede
  const chainId = await ethereum.request({
    method: "eth_chainId"
  });

  if (chainId !== BSC_CHAIN_ID_HEX) {
    throw new Error("Rede incorreta. Conecte-se à Binance Smart Chain (BSC).");
  }

  return userWallet;
}

/* =========================================================
 * 2️⃣ EXECUTAR PAGAMENTO (BNB)
 * =======================================================*/
async function payForAnalysis() {
  if (!userWallet) {
    await connectWallet();
  }

  // Monta transação (BNB nativo)
  const tx = {
    from: userWallet,
    to: CONTRACT_ADDRESS,
    value: bnbToHex(PAYMENT_AMOUNT_BNB),
    data: "0x" // chamada simples (fallback payable)
  };

  // Envia transação
  const txHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [tx]
  });

  lastTxHash = txHash;
  sessionStorage.setItem("txHash", txHash);

  // Aguarda confirmação mínima (1 bloco)
  await waitForConfirmation(txHash);

  return {
    wallet: userWallet,
    txHash
  };
}

/* =========================================================
 * 3️⃣ ENVIAR PROVA AO BACKEND (LIBERAR ANÁLISE)
 * =======================================================*/
async function unlockAnalysis({ apiKey, fixtureId }) {
  if (!userWallet || !lastTxHash) {
    throw new Error("Pagamento não encontrado");
  }

  if (!apiKey || !fixtureId) {
    throw new Error("API Key ou fixtureId ausente");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${BACKEND_URL}/analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
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
 * FUNÇÃO AUXILIAR — CONVERSÃO SEGURA BNB → WEI
 * =======================================================*/
function bnbToHex(value) {
  // Converte string decimal para wei sem perda de precisão
  const [intPart, decPart = ""] = value.split(".");
  const wei = BigInt(intPart + decPart.padEnd(18, "0"));
  return "0x" + wei.toString(16);
}

/* =========================================================
 * FUNÇÃO AUXILIAR — AGUARDA CONFIRMAÇÃO
 * =======================================================*/
async function waitForConfirmation(txHash) {
  let receipt = null;

  while (!receipt) {
    receipt = await ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash]
    });

    // Aguarda 1.5s entre tentativas
    await new Promise(r => setTimeout(r, 1500));
  }

  if (!receipt.status) {
    throw new Error("Transação falhou");
  }

  return receipt;
}

/* =========================================================
 * EXPORT GLOBAL (HTML / OUTROS JS)
 * =======================================================*/
window.walletv12 = {
  connectWallet,
  payForAnalysis,
  unlockAnalysis
};
