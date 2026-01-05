import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/+esm";

/* ===============================
   CONFIGURAÇÃO
================================ */
const CFG = {
  chainId: 56,
  chainHex: "0x38",
  paymentContract: "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD",
  tokenContract: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8",
  approveMultiplier: 2n,

  // 🔐 Blindagem
  storageKey: "NOX_PREMIUM_STATE",
  lockTTL: 5 * 60 * 1000 // 5 minutos
};

/* ===============================
   ABIs
================================ */
const PAYMENT_ABI = [
  "function payForAnalysis()",
  "function pricePerAnalysis() view returns(uint256)"
];

const ERC20_ABI = [
  "function approve(address,uint256)",
  "function allowance(address,address) view returns(uint256)"
];

/* ===============================
   STATE
================================ */
let provider;
let signer;
let wallet;
let busy = false;

/* ===============================
   STORAGE BLINDADO
================================ */
const now = () => Date.now();

const loadState = () => {
  try {
    return JSON.parse(localStorage.getItem(CFG.storageKey)) || {};
  } catch {
    return {};
  }
};

const saveState = data => {
  localStorage.setItem(CFG.storageKey, JSON.stringify(data));
};

const clearState = () => {
  localStorage.removeItem(CFG.storageKey);
};

/* ===============================
   UI HELPERS
================================ */
const el = id => document.getElementById(id);

const setStatus = html => {
  const box = el("paymentStatus");
  if (box) box.innerHTML = html;
};

const lockAnalyze = () => {
  const btn = el("analyzeBtn");
  if (!btn) return;
  btn.disabled = true;
  btn.style.display = "none";
};

const unlockAnalyze = () => {
  const btn = el("analyzeBtn");
  if (!btn) return;
  btn.disabled = false;
  btn.style.display = "block";
};

/* ===============================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", async () => {
  lockAnalyze();

  if (!window.ethereum) {
    setStatus("❌ Carteira Web3 não encontrada.");
    el("payBtn")?.setAttribute("disabled", "true");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);

  /* 🔁 RESTORE STATE (ANTI REFRESH / REPLAY) */
  const saved = loadState();
  if (
    saved?.paid === true &&
    saved?.used !== true &&
    now() - saved.timestamp < CFG.lockTTL
  ) {
    setStatus("✅ Pagamento confirmado.<br>Análise Premium disponível.");
    unlockAnalyze();
  }

  /* 🔁 LISTENERS GLOBAIS */
  window.ethereum.on("accountsChanged", clearState);
  window.ethereum.on("chainChanged", clearState);

  const payBtn = el("payBtn");
  if (!payBtn) return;

  payBtn.onclick = async () => {
    if (busy) return;

    const state = loadState();
    if (state?.paid && !state?.used) {
      setStatus("⚠️ Já existe uma análise Premium disponível.");
      unlockAnalyze();
      return;
    }

    busy = true;
    lockAnalyze();

    try {
      /* 🔐 CONNECT */
      const accounts = await provider.send("eth_requestAccounts", []);
      wallet = accounts?.[0];
      if (!wallet) throw new Error("Wallet inválida");

      signer = await provider.getSigner();

      /* 🌐 NETWORK */
      const net = await provider.getNetwork();
      if (Number(net.chainId) !== CFG.chainId) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CFG.chainHex }]
        });
      }

      /* 💰 CONTRACTS */
      const token = new ethers.Contract(
        CFG.tokenContract,
        ERC20_ABI,
        signer
      );
      const payment = new ethers.Contract(
        CFG.paymentContract,
        PAYMENT_ABI,
        signer
      );

      const price = await payment.pricePerAnalysis();
      const allowance = await token.allowance(wallet, CFG.paymentContract);

      /* 📝 APPROVE */
      if (allowance < price) {
        setStatus("✍️ Aguardando aprovação...");
        const txA = await token.approve(
          CFG.paymentContract,
          price * CFG.approveMultiplier
        );
        await txA.wait();
      }

      /* 💳 PAY */
      setStatus("💳 Confirmando pagamento...");
      const txP = await payment.payForAnalysis();
      const receipt = await txP.wait();

      /* 🔐 SAVE STATE (ANTI REPLAY) */
      saveState({
        paid: true,
        used: false,
        txHash: receipt.hash,
        wallet,
        timestamp: now()
      });

      setStatus("✅ Pagamento confirmado.<br>1 análise Premium liberada.");
      unlockAnalyze();

      window.dispatchEvent(new Event("nox-payment-ok"));

    } catch (e) {
      console.error(e);
      setStatus(
        e?.code === 4001
          ? "❌ Transação cancelada."
          : "❌ Falha no pagamento."
      );
      clearState();
    } finally {
      busy = false;
    }
  };

  /* ===============================
     CONSUMO ÚNICO DA ANÁLISE
  ================================ */
  window.addEventListener("nox-analysis-used", () => {
    const state = loadState();
    if (!state?.paid || state?.used) return;

    saveState({
      ...state,
      used: true
    });

    lockAnalyze();
    setStatus("⏳ Análise Premium utilizada.");
  });
});

/* ===============================
   EXPOSIÇÃO GLOBAL
================================ */
window.lockAnalyze = lockAnalyze;
window.unlockAnalyze = unlockAnalyze;
