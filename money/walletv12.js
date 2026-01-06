/* =========================================================
 * walletv12.js - Versão Web3 segura
 * =========================================================
 * Funciona apenas dentro de navegadores com carteira Web3 (MetaMask, Brave, etc.)
 * Compatível com backend atual
 * ========================================================= */

import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.9.1/dist/ethers.esm.min.js";

/* =========================================================
 * CONFIGURAÇÕES
 * =======================================================*/
const CONTRACT_ADDRESS = "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD";
const TOKEN_ADDRESS    = "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8";
const PRICE_SELECTOR   = "0x2e7d9d84"; // função pricePerAnalysis()
const BACKEND_URL      = "https://backendv12.srrimas2017.workers.dev";
const BSC_CHAIN_ID     = 56; // BSC Mainnet

/* =========================================================
 * ESTADO
 * =======================================================*/
let provider;
let signer;
let userWallet = sessionStorage.getItem("wallet") || null;
let lastTxHash = sessionStorage.getItem("txHash") || null;

/* =========================================================
 * ABI MÍNIMA
 * =======================================================*/
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

const PAYMENT_ABI = [
  "function payForAnalysis() external"
];

/* =========================================================
 * 1️⃣ CONECTAR CARTEIRA
 * =======================================================*/
async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask ou carteira Web3 não encontrada");

  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  const account = await signer.getAddress();

  const network = await provider.getNetwork();
  if (network.chainId !== BSC_CHAIN_ID) {
    throw new Error("Conecte-se à Binance Smart Chain");
  }

  userWallet = account;
  sessionStorage.setItem("wallet", account);
  return account;
}

/* =========================================================
 * 2️⃣ PEGAR PREÇO DO CONTRATO
 * =======================================================*/
async function getPriceFromContract() {
  if (!signer) await connectWallet();

  const contract = new ethers.Contract(CONTRACT_ADDRESS, ["function pricePerAnalysis() view returns(uint256)"], provider);
  const price = await contract.pricePerAnalysis();
  return price;
}

/* =========================================================
 * 3️⃣ APPROVE TOKEN
 * =======================================================*/
async function approveToken() {
  if (!signer) await connectWallet();

  const price = await getPriceFromContract();
  const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, signer);

  const allowance = await token.allowance(userWallet, CONTRACT_ADDRESS);
  if (allowance >= price) return; // já aprovado

  const tx = await token.approve(CONTRACT_ADDRESS, price);
  const receipt = await tx.wait();

  if (receipt.status !== 1) throw new Error("Approve falhou");

  return receipt;
}

/* =========================================================
 * 4️⃣ PAGAR ANÁLISE
 * =======================================================*/
async function payForAnalysis() {
  if (!signer) await connectWallet();

  // 1️⃣ Approve
  await approveToken();

  // 2️⃣ Pagar
  const contract = new ethers.Contract(CONTRACT_ADDRESS, PAYMENT_ABI, signer);
  const tx = await contract.payForAnalysis();
  const receipt = await tx.wait();

  if (receipt.status !== 1) throw new Error("Pagamento falhou");

  lastTxHash = receipt.transactionHash;
  sessionStorage.setItem("txHash", lastTxHash);

  return { wallet: userWallet, txHash: lastTxHash };
}

/* =========================================================
 * 5️⃣ BACKEND
 * =======================================================*/
async function unlockAnalysis({ fixtureId }) {
  if (!fixtureId) throw new Error("fixtureId ausente");

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
  unlockAnalysis,
  getPriceFromContract
};
