import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/+esm";
import { createWeb3Modal, defaultConfig } from
  "https://unpkg.com/@web3modal/ethers@3/dist/index.js";

const CFG = {
  projectId: "82a100d35a9c24cb871b0fec9f8a9671",
  chainId: 56,
  rpc: "https://bsc-dataseed.binance.org/"
};

const metadata = {
  name: "NOX Premium",
  description: "NOX Premium Analytics",
  url: location.origin,
  icons: ["https://ugr.app.br/images/logo.png"]
};

const modal = createWeb3Modal({
  projectId: CFG.projectId,
  chains: [{
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: CFG.rpc
  }],
  ethersConfig: defaultConfig({ metadata })
});

const connectBtn = document.getElementById("connectBtn");
const status = document.getElementById("status");
const analyzeBtn = document.getElementById("analyzeBtn");

connectBtn.onclick = async () => {
  await modal.open();
};

modal.subscribeProvider(async provider => {
  if (!provider) {
    status.textContent = "🔒 Carteira não conectada";
    analyzeBtn.classList.add("locked");
    return;
  }

  const ethersProvider = new ethers.BrowserProvider(provider);
  const signer = await ethersProvider.getSigner();
  const addr = await signer.getAddress();

  status.textContent = `✅ Conectado\n${addr.slice(0,6)}...${addr.slice(-4)}`;
  analyzeBtn.classList.remove("locked");
});
