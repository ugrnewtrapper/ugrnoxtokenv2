import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/+esm";

/* ===============================
   CONFIGURAÇÃO
================================ */
const CFG = {
  chainId: 56, // BSC
  chainHex: "0x38",
  rpc: "https://bsc-dataseed.binance.org/",
  paymentContract: "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD",
  tokenContract: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8"
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
   BACKEND PREMIUM
================================ */
const BACKEND_ANALYZE = "https://backendnoxv22.srrimas2017.workers.dev";

/* ===============================
   UI ELEMENTS
================================ */
const payBtn = document.getElementById("payBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusBox = document.getElementById("paymentStatus");
const resultBox = document.getElementById("results") || document.getElementById("result");

/* ===============================
   HELPERS
================================ */
const setStatus = (html) => {
  if (statusBox) statusBox.innerHTML = html;
};

const lockAnalyze = () => {
  if (!analyzeBtn) return;
  analyzeBtn.disabled = true;
  analyzeBtn.style.display = "none";
};

const unlockAnalyze = () => {
  if (!analyzeBtn) return;
  analyzeBtn.disabled = false;
  analyzeBtn.style.display = "block";
};

const startLoading = (element, baseText = "📊 Gerando análise") => {
  let dots = 0;
  const interval = setInterval(() => {
    if (!element) return clearInterval(interval);
    element.innerHTML = `${baseText}${".".repeat(dots % 4)}`;
    dots++;
  }, 500);
  return interval;
};

/* ===============================
   STATE
================================ */
let provider;
let signer;
let wallet;
let busy = false;
let analysisInProgress = false;

window.selectedFixture = null;
let analysisConsumed = false;

/* ===============================
   INIT
================================ */
lockAnalyze();

if (!window.ethereum) {
  setStatus("❌ Carteira Web3 não encontrada.<br>Abra no navegador da sua carteira.");
  if (payBtn) payBtn.disabled = true;
  throw new Error("No wallet");
}

provider = new ethers.BrowserProvider(window.ethereum);

/* ===============================
   CONEXÃO + PAGAMENTO
================================ */
if (payBtn) {
  payBtn.onclick = async () => {
    if (busy) return;
    busy = true;
    lockAnalyze();

    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      wallet = accounts?.[0];
      if (!wallet) throw new Error("Wallet não encontrada");

      signer = await provider.getSigner();

      // Rede
      let network = await provider.getNetwork();
      if (Number(network.chainId) !== CFG.chainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: CFG.chainHex }]
          });
          network = await provider.getNetwork();
          if (Number(network.chainId) !== CFG.chainId) {
            throw new Error("Rede incorreta");
          }
        } catch {
          setStatus("❌ Conecte à rede BSC.");
          busy = false;
          return;
        }
      }

      // Contratos
      const token = new ethers.Contract(CFG.tokenContract, ERC20_ABI, signer);
      const payment = new ethers.Contract(CFG.paymentContract, PAYMENT_ABI, signer);

      const price = await payment.pricePerAnalysis();
      const allowance = await token.allowance(wallet, CFG.paymentContract);

      if (allowance < price) {
        setStatus("✍️ Aguardando aprovação do token...");
        const txApprove = await token.approve(CFG.paymentContract, price);
        await txApprove.wait();
      }

      setStatus("💳 Confirmando pagamento...");
      const txPay = await payment.payForAnalysis();
      await txPay.wait();

      setStatus("✅ Pagamento confirmado.<br>1 análise Premium liberada.");
      unlockAnalyze();

      window.dispatchEvent(new Event("nox-payment-ok"));

    } catch (err) {
      console.error(err);
      setStatus("❌ Operação cancelada ou erro na transação.");
    } finally {
      busy = false;
    }
  };
}

/* =============================
   SELECIONAR PARTIDA
============================= */
function selectMatch(el) {
  document.querySelectorAll(".match").forEach(m => m.classList.remove("selected"));
  el.classList.add("selected");
  window.selectedFixture = Number(el.dataset.fixture);

  if (resultBox) {
    resultBox.innerHTML = `
      <h3>📌 Partida selecionada</h3>
      <p>${el.innerText}</p>
    `;
  }
}

/* =============================
   ANALISAR PARTIDA (PREMIUM)
============================= */
async function analyzeMatch(force = false) {
  if (!force && analysisConsumed) {
    alert("⚠️ Esta análise já foi consumida.");
    return;
  }

  if (analysisInProgress) {
    alert("⏳ Análise já em andamento. Aguarde...");
    return;
  }

  if (!window.selectedFixture) {
    alert("⚠️ Selecione uma partida");
    if (resultBox) resultBox.innerHTML = "⚠️ Selecione uma partida para continuar.";
    return;
  }

  const apiKey = document.getElementById("apikey")?.value
              || document.getElementById("apiKey")?.value;

  if (!apiKey) {
    alert("⚠️ Informe sua API Key");
    return;
  }

  if (!resultBox) return;

  analysisInProgress = true;
  let loadingInterval = startLoading(resultBox);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(BACKEND_ANALYZE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, fixtureId: Number(window.selectedFixture) }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    clearInterval(loadingInterval);

    const data = await res.json();

    if (data.error) {
      resultBox.innerHTML = "❌ " + data.error;
      return;
    }

    analysisConsumed = true;

    resultBox.innerHTML = `
      <h3>${data.teams.home} x ${data.teams.away}</h3>
      <ul>
        <li>⚽ Artilheiro:
          <strong>${data.players?.topGoals?.player || "—"} (${data.players?.topGoals?.value || "—"})</strong>
        </li>
        <li>🎯 Assistências:
          <strong>${data.players?.topAssists?.player || "—"} (${data.players?.topAssists?.value || "—"})</strong>
        </li>
        <li>🥅 Chutes:
          <strong>${data.players?.topShots?.player || "—"} (${data.players?.topShots?.value || "—"})</strong>
        </li>
        <li>🟨 Moda de cartões:
          <strong>${data.discipline?.cardsMode || "—"}</strong>
        </li>
        <li>🚩 Moda de escanteios:
          <strong>${data.discipline?.cornersMode || "—"}</strong>
        </li>
      </ul>
    `;

  } catch (err) {
    console.error(err);
    clearInterval(loadingInterval);
    resultBox.innerHTML = "❌ Erro ao buscar análise ou timeout do backend.";
  } finally {
    clearInterval(loadingInterval);
    analysisInProgress = false;
  }
}

/* =============================
   EVENTO DE PAGAMENTO (1x)
============================= */
window.addEventListener("nox-payment-ok", () => {
  analysisConsumed = false; // libera 1 análise
  if (resultBox) resultBox.innerHTML = "📊 Gerando análise Premium...";
  analyzeMatch(true);
});

/* =============================
   BINDS PREMIUM
============================= */
if (analyzeBtn) {
  analyzeBtn.addEventListener("click", () => {
    alert("⚠️ Efetue o pagamento Premium para liberar a análise.");
  });
}

/* =============================
   EXPOSIÇÃO GLOBAL
============================= */
window.selectMatch = selectMatch;
window.analyzeMatch = analyzeMatch;
window.lockAnalyze = lockAnalyze;
window.unlockAnalyze = unlockAnalyze;
