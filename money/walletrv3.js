import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/+esm";
import {
  createWeb3Modal,
  defaultConfig
} from "https://unpkg.com/@web3modal/ethers@3.5.0/dist/index.js";

/* ================= CONFIG ================= */

const CFG = {
  projectId: "82a100d35a9c24cb871b0fec9f8a9671",
  chainId: 56,
  rpc: "https://bsc-dataseed.binance.org/",
  payment: "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD",
  token: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8"
};

const PAYMENT_ABI = [
  "function payForAnalysis()",
  "function pricePerAnalysis() view returns(uint256)"
];

const ERC20_ABI = [
  "function approve(address,uint256)",
  "function allowance(address,address) view returns(uint256)"
];

/* ================= UI ================= */

const connectBtn = document.getElementById("connectBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusBox = document.getElementById("status");

const setStatus = (m) => statusBox.textContent = m;
const lock = () => analyzeBtn.classList.add("locked");
const unlock = () => analyzeBtn.classList.remove("locked");

/* ================= REOWN CONFIG ================= */

const ethersConfig = defaultConfig({
  metadata: {
    name: "NOX Premium",
    description: "NOX Premium Analytics",
    url: window.location.origin,
    icons: ["https://walletconnect.com/walletconnect-logo.png"]
  },
  defaultChainId: CFG.chainId,
  rpcUrl: CFG.rpc
});

const modal = createWeb3Modal({
  projectId: CFG.projectId,
  ethersConfig,
  chains: [{
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: CFG.rpc
  }]
});

/* ================= STATE ================= */

let provider;
let signer;
let wallet;
let busy = false;

/* ================= CONNECT ================= */

connectBtn.addEventListener("click", async () => {
  try {
    setStatus("🔌 Abrindo carteiras...");

    // ⚠️ ESTE É O PONTO CRÍTICO
    // SEM parâmetros, sem view forçada
    await modal.open();

    const walletProvider = modal.getWalletProvider();
    if (!walletProvider) throw new Error("Provider não encontrado");

    provider = new ethers.BrowserProvider(walletProvider);
    signer = await provider.getSigner();
    wallet = await signer.getAddress();

    const net = await provider.getNetwork();
    if (Number(net.chainId) !== CFG.chainId) {
      setStatus("❌ Conecte-se à BNB Smart Chain");
      lock();
      return;
    }

    unlock();
    setStatus(
      `✅ Carteira conectada\n` +
      `👛 ${wallet.slice(0,6)}...${wallet.slice(-4)}`
    );

  } catch (err) {
    console.error(err);
    setStatus("❌ Conexão cancelada");
  }
});

/* ================= PAYMENT ================= */

analyzeBtn.addEventListener("click", async () => {
  if (busy || !signer) return;
  busy = true;
  lock();

  try {
    setStatus("💳 Verificando pagamento...");

    const token = new ethers.Contract(CFG.token, ERC20_ABI, signer);
    const pay = new ethers.Contract(CFG.payment, PAYMENT_ABI, signer);

    const price = await pay.pricePerAnalysis();
    const allowance = await token.allowance(wallet, CFG.payment);

    if (allowance < price) {
      setStatus("✍️ Aguardando aprovação...");
      const tx1 = await token.approve(CFG.payment, price);
      await tx1.wait();
    }

    setStatus("⏳ Confirmando transação...");
    const tx2 = await pay.payForAnalysis();
    await tx2.wait();

    setStatus("✅ Premium liberado!");
    unlock();

  } catch (err) {
    console.error(err);
    setStatus("❌ Transação cancelada ou falhou");
  } finally {
    busy = false;
  }
});
