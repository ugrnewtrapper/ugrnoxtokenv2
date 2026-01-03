import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/+esm";
import {
  createWeb3Modal,
  defaultConfig
} from "https://unpkg.com/@web3modal/ethers@3.5.0/dist/index.js";

/* ================= CONFIG ================= */

const CFG = {
  projectId: "82a100d35a9c24cb871b0fec9f8a9671",
  chainId: 56,
  rpc: "https://bsc-dataseed.binance.org/"
};

/* ================= UI ================= */

const connectBtn = document.getElementById("connectBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusBox = document.getElementById("status");

const setStatus = m => statusBox.textContent = m;
const unlock = () => analyzeBtn.classList.remove("locked");

/* ================= REOWN ================= */

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

let signer;

/* ================= EVENTS ================= */

modal.subscribeEvents(async event => {
  if (event.name === "CONNECTED") {
    const provider = new ethers.BrowserProvider(
      modal.getWalletProvider()
    );
    signer = await provider.getSigner();
    const wallet = await signer.getAddress();

    unlock();
    setStatus(`✅ Conectado\n👛 ${wallet.slice(0,6)}...${wallet.slice(-4)}`);
  }
});

/* ================= BUTTON ================= */

connectBtn.onclick = async () => {
  setStatus("🔌 Escolha sua carteira...");
  await modal.open();
};
