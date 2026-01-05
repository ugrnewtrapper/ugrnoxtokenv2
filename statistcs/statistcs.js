import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/+esm";

/* ===============================
   CONFIGURAÇÃO
================================ */
const CFG = {
  chainId: 56,
  chainHex: "0x38",
  paymentContract: "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD",
  tokenContract: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8",
  backend: "https://backendnoxv22.srrimas2017.workers.dev",

  storageKey: "NOX_PREMIUM_ULTRA",
  schemaVersion: 1,
  lockTTL: 5 * 60 * 1000
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
   HELPERS
================================ */
const now = () => Date.now();
const $ = id => document.getElementById(id);
const safe = (v, d = "—") =>
  v === undefined || v === null || Number.isNaN(v) ? d : v;

const isValidFixture = id =>
  Number.isInteger(id) && id > 0;

const microtask = fn =>
  typeof queueMicrotask === "function"
    ? queueMicrotask(fn)
    : setTimeout(fn, 0);

/* ===============================
   STORAGE VERSIONADO
================================ */
const keyOf = (w, c) => `${CFG.storageKey}:${w || "x"}:${c || "x"}`;

const loadState = (w, c) => {
  try {
    const s = JSON.parse(localStorage.getItem(keyOf(w, c))) || {};
    if (s.schemaVersion !== CFG.schemaVersion) return {};
    return s;
  } catch {
    return {};
  }
};

const saveState = (w, c, s) => {
  try {
    localStorage.setItem(
      keyOf(w, c),
      JSON.stringify({ ...s, schemaVersion: CFG.schemaVersion })
    );
  } catch {}
};

const clearState = (w, c) => {
  try { localStorage.removeItem(keyOf(w, c)); } catch {}
};

/* ===============================
   UI
================================ */
const payBtn = $("payBtn");
const analyzeBtn = $("analyzeBtn");
const statusBox = $("paymentStatus");
const resultBox = $("results") || $("result");

const setStatus = h => {
  try { statusBox && (statusBox.innerHTML = h); } catch {}
};

const lockAnalyze = () => {
  try { analyzeBtn && (analyzeBtn.disabled = true, analyzeBtn.style.display = "none"); } catch {}
};

const unlockAnalyze = () => {
  try { analyzeBtn && (analyzeBtn.disabled = false, analyzeBtn.style.display = "block"); } catch {}
};

/* ===============================
   GLOBAL
================================ */
let provider;
let signer;
let wallet;
let chainId;
let busy = false;
let analysisLock = false;
let watchdog = null;

window.selectedFixture = null;

/* ===============================
   INIT
================================ */
if (!window.ethereum) {
  setStatus("❌ Carteira Web3 não encontrada.");
  payBtn && (payBtn.disabled = true);
  throw new Error("No wallet");
}

provider = new ethers.BrowserProvider(window.ethereum);

/* ===============================
   RESTORE ROBUSTO
================================ */
(async () => {
  try {
    let acc = await provider.listAccounts();
    if (!acc.length) acc = await provider.send("eth_requestAccounts", []);
    wallet = acc[0]?.address || acc[0];
    chainId = Number((await provider.getNetwork()).chainId);

    const state = loadState(wallet, chainId);
    if (state?.paid && !state?.used && now() - state.timestamp < CFG.lockTTL) {
      setStatus("✅ Pagamento confirmado.<br>Análise Premium disponível.");
      unlockAnalyze();
    }
  } catch {}
})();

/* ===============================
   RESET
================================ */
const resetAll = () => {
  if (wallet && chainId) clearState(wallet, chainId);
  wallet = undefined;
  chainId = undefined;
  analysisLock = false;
  unlockAnalyze();
  setStatus("🔄 Carteira ou rede alterada.");
};

window.ethereum.on("accountsChanged", resetAll);
window.ethereum.on("chainChanged", resetAll);

/* ===============================
   PAGAMENTO
================================ */
payBtn && (payBtn.onclick = async () => {
  if (busy) return;
  busy = true;
  lockAnalyze();

  let wSnap, cSnap;

  try {
    const acc = await provider.send("eth_requestAccounts", []);
    wallet = acc[0];
    signer = await provider.getSigner();
    chainId = Number((await provider.getNetwork()).chainId);

    if (chainId !== CFG.chainId) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CFG.chainHex }]
      });
      chainId = CFG.chainId;
    }

    wSnap = wallet;
    cSnap = chainId;

    const token = new ethers.Contract(CFG.tokenContract, ERC20_ABI, signer);
    const payment = new ethers.Contract(CFG.paymentContract, PAYMENT_ABI, signer);

    const price = await payment.pricePerAnalysis();
    const allowance = await token.allowance(wallet, CFG.paymentContract);

    if (allowance < price) {
      setStatus("✍️ Aguardando aprovação...");
      await (await token.approve(CFG.paymentContract, price)).wait();
    }

    setStatus("💳 Confirmando pagamento...");
    const receipt = await (await payment.payForAnalysis()).wait();

    saveState(wSnap, cSnap, {
      paid: true,
      used: false,
      txHash: receipt.hash,
      timestamp: now()
    });

    setStatus("✅ Pagamento confirmado.<br>1 análise Premium liberada.");
    unlockAnalyze();

  } catch (e) {
    console.error(e);
    clearState(wSnap, cSnap);
    setStatus("❌ Falha no pagamento.");
  } finally {
    busy = false;
  }
});

/* ===============================
   SELEÇÃO
================================ */
window.selectMatch = el => {
  document.querySelectorAll(".match").forEach(m =>
    m.classList.remove("selected")
  );
  el.classList.add("selected");
  const id = Number(el.dataset.fixture);
  window.selectedFixture = isValidFixture(id) ? id : null;
};

/* ===============================
   ANÁLISE PREMIUM
================================ */
window.analyzeMatch = () => {
  microtask(async () => {
    if (analysisLock) return;
    analysisLock = true;

    clearTimeout(watchdog);
    watchdog = setTimeout(() => (analysisLock = false), 20000);

    let wSnap = wallet;
    let cSnap = chainId;

    try {
      const state = loadState(wSnap, cSnap);
      if (!state?.paid || state?.used) {
        alert("⚠️ Análise Premium indisponível.");
        return;
      }

      if (now() - state.timestamp > CFG.lockTTL) {
        clearState(wSnap, cSnap);
        setStatus("⏱️ Análise expirada.");
        unlockAnalyze();
        return;
      }

      if (!isValidFixture(window.selectedFixture)) {
        alert("⚠️ Selecione uma partida válida.");
        return;
      }

      const apiKey = $("apikey")?.value || $("apiKey")?.value;
      if (!apiKey) {
        alert("⚠️ Informe sua API Key.");
        return;
      }

      lockAnalyze();
      resultBox && (resultBox.innerHTML = "📊 Gerando análise Premium...");

      let timeout;
      const controller = typeof AbortController !== "undefined"
        ? new AbortController()
        : null;

      timeout = setTimeout(() => controller?.abort(), 12000);

      const res = await fetch(CFG.backend, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          fixtureId: window.selectedFixture
        }),
        signal: controller?.signal
      }).finally(() => clearTimeout(timeout));

      const data = await res.json();

      if (data.status === "failed" || !data?.teams) {
        throw new Error("Resposta inválida");
      }

      if (data.status === "completed") {
        saveState(wSnap, cSnap, { ...state, used: true });
        setStatus("⏳ Análise Premium utilizada.");
      } else {
        setStatus("⚠️ Análise parcial — tente novamente.");
      }

      resultBox && (resultBox.innerHTML = `
        <h3>${safe(data.teams.home)} x ${safe(data.teams.away)}</h3>
        <ul>
          <li>⚽ Artilheiro: <strong>${safe(data.players?.topGoals?.player)} (${safe(data.players?.topGoals?.value)})</strong></li>
          <li>🎯 Assistências: <strong>${safe(data.players?.topAssists?.player)} (${safe(data.players?.topAssists?.value)})</strong></li>
          <li>🥅 Chutes: <strong>${safe(data.players?.topShots?.player)} (${safe(data.players?.topShots?.value)})</strong></li>
          <li>🟨 Moda cartões: <strong>${safe(data.statistics?.cardsMode)}</strong></li>
          <li>🚩 Moda escanteios: <strong>${safe(data.statistics?.cornersMode)}</strong></li>
        </ul>
      `);

    } catch (e) {
      console.error(e);
      resultBox && (resultBox.innerHTML = "❌ Erro ao gerar análise.");
      unlockAnalyze();
    } finally {
      clearTimeout(watchdog);
      analysisLock = false;
    }
  });
};
