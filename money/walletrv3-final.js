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

/* ================= UI ================= */

const connectBtn = document.getElementById("connectBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusBox = document.getElementById("status");

const setStatus = m => statusBox.textContent = m;
const lock = () => analyzeBtn.classList.add("locked");
const unlock = () => analyzeBtn.classList.remove("locked");

/* ================= REOWN INIT ================= */

const ethersConfig = defaultConfig({
  metadata: {
    name: "NOX Premium",
    description: "NOX Premium Analytics",
    url: location.origin,
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

let provider, signer, wallet;

/* ================= CONNECT ================= */

connectBtn.onclick = async () => {
  try {
    setStatus("🔌 Abrindo carteiras...");
    await modal.open(); // 🔥 AQUI A TELA DO REOWN ABRE

    const walletProvider = modal.getWalletProvider();
    provider = new ethers.BrowserProvider(walletProvider);
    signer = await provider.getSigner();
    wallet = await signer.getAddress();

    unlock();
    setStatus(`✅ Conectado\n👛 ${wallet.slice(0,6)}...${wallet.slice(-4)}`);
  } catch (e) {
    console.error(e);
    setStatus("❌ Conexão cancelada");
  }
};
