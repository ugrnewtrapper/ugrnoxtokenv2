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

const analyzeBtn = document.getElementById("analyzeBtn");
const statusBox = document.getElementById("status");

const setStatus = m => statusBox.textContent = m;
const unlock = () => analyzeBtn.classList.remove("locked");

/* ================= REOWN INIT (GLOBAL) ================= */

createWeb3Modal({
  projectId: CFG.projectId,
  ethersConfig: defaultConfig({
    metadata: {
      name: "NOX Premium",
      description: "NOX Premium Analytics",
      url: window.location.origin,
      icons: ["https://walletconnect.com/walletconnect-logo.png"]
    },
    defaultChainId: CFG.chainId,
    rpcUrl: CFG.rpc
  }),
  chains: [{
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: CFG.rpc
  }]
});

/* ================= CONNECTION STATE ================= */

let signer;

/* O REOWN EXPÕE O PROVIDER GLOBALMENTE */
window.addEventListener("w3m-connect", async () => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  const wallet = await signer.getAddress();

  unlock();
  setStatus(`✅ Conectado\n👛 ${wallet.slice(0,6)}...${wallet.slice(-4)}`);
});
