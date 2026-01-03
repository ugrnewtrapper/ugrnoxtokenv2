import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/+esm";
import { createWeb3Modal }
  from "https://unpkg.com/@web3modal/ethers@3.5.0/dist/index.js";

/* ================= CONFIG ================= */

const CFG = {
  projectId: "82a100d35a9c24cb871b0fec9f8a9671",
  chainId: 56,
  rpc: "https://bsc-dataseed.binance.org/",
  payment: "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD",
  token: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8"
};

/* ================= ABI ================= */

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

const setStatus = m => statusBox.textContent = m;
const lock = () => analyzeBtn.classList.add("locked");
const unlock = () => analyzeBtn.classList.remove("locked");

let provider, signer, wallet, busy = false;

/* ================= REOWN ================= */

const modal = createWeb3Modal({
  projectId: CFG.projectId,
  chains: [{
    chainId: CFG.chainId,
    name: "BNB Smart Chain",
    rpcUrl: CFG.rpc,
    currency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18
    }
  }]
});

/* ================= CONNECT ================= */

connectBtn.onclick = async () => {
  try {
    setStatus("🔌 Abrindo carteiras...");

    const wcProvider = await modal.open();
    provider = new ethers.BrowserProvider(wcProvider);

    signer = await provider.getSigner();
    wallet = await signer.getAddress();

    const net = await provider.getNetwork();
    if (Number(net.chainId) !== CFG.chainId) {
      setStatus("❌ Conecte-se à BSC");
      lock();
      return;
    }

    unlock();
    setStatus(`✅ Conectado\n👛 ${wallet.slice(0,6)}...${wallet.slice(-4)}`);

  } catch (e) {
    console.error(e);
    setStatus("❌ Conexão cancelada");
  }
};

/* ================= PAYMENT ================= */

analyzeBtn.onclick = async () => {
  if (busy || !signer) return;
  busy = true;
  lock();

  try {
    setStatus("💳 Processando pagamento...");

    const token = new ethers.Contract(CFG.token, ERC20_ABI, signer);
    const pay = new ethers.Contract(CFG.payment, PAYMENT_ABI, signer);

    const price = await pay.pricePerAnalysis();
    const allowance = await token.allowance(wallet, CFG.payment);

    if (allowance < price) {
      setStatus("✍️ Aprovação necessária...");
      const tx1 = await token.approve(CFG.payment, price);
      await tx1.wait();
    }

    setStatus("⏳ Confirmando pagamento...");
    const tx2 = await pay.payForAnalysis();
    await tx2.wait();

    setStatus("✅ Premium liberado!");
    unlock();

  } catch (e) {
    console.error(e);
    setStatus("❌ " + (e.reason || e.message));
  } finally {
    busy = false;
  }
};
