/* =====================================================
   NOX PREMIUM • WALLET MANAGER
   Arquivo: money/wallet.js
   Suporte:
   - MetaMask / TrustWallet (Desktop)
   - WalletConnect v2 (Mobile / Fallback)
   ===================================================== */

/* ===============================
   CONFIGURAÇÃO GLOBAL
   =============================== */

const NOX_CONFIG = {
  chainId: 56,
  chainHex: "0x38",
  chainName: "BSC Mainnet",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  paymentContract: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8",
  backend: "https://backendnoxv22.srrimas2017.workers.dev/",
  wcProjectId: "82a100d35a9c24cb871b0fec9f8a9671"
};

const NOX_ABI = [
  "function payForAnalysis() external",
  "event AnalysisPaid(address indexed user, uint256 amount)"
];

/* ===============================
   ESTADO GLOBAL
   =============================== */

let provider = null;
let signer = null;
let userWallet = null;

/* ===============================
   HELPERS UI
   =============================== */

function setStatus(text, ok = false) {
  const el = document.getElementById("status");
  if (!el) return;

  el.innerText = text;
  el.classList.toggle("connected", ok);
}

function unlockAnalyze() {
  const btn = document.getElementById("analyzeBtn");
  if (btn) btn.classList.remove("locked");
}

/* ===============================
   DETECÇÃO DE MOBILE
   =============================== */

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/* ===============================
   CONEXÃO WALLET (AUTO)
   =============================== */

async function connectWallet() {
  try {
    setStatus("🔌 Conectando carteira...");

    // 1️⃣ Desktop com MetaMask / Trust
    if (window.ethereum && !isMobile()) {
      provider = new ethers.BrowserProvider(window.ethereum);

      await provider.send("eth_requestAccounts", []);
    }

    // 2️⃣ Mobile ou fallback → WalletConnect v2
    else {
      const wcProvider = await EthereumProvider.init({
        projectId: NOX_CONFIG.wcProjectId,
        chains: [NOX_CONFIG.chainId],
        showQrModal: true,
        rpcMap: {
          [NOX_CONFIG.chainId]: NOX_CONFIG.rpcUrl
        }
      });

      await wcProvider.connect();
      provider = new ethers.BrowserProvider(wcProvider);
    }

    signer = await provider.getSigner();
    userWallet = await signer.getAddress();

    // 🔍 Verificar rede
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== NOX_CONFIG.chainId) {
      setStatus("❌ Conecte-se à BSC Mainnet");
      return;
    }

    unlockAnalyze();
    setStatus("✅ Carteira conectada:\n" + userWallet, true);

  } catch (err) {
    console.error(err);
    setStatus("❌ Falha ao conectar carteira");
    alert("Erro ao conectar carteira");
  }
}

/* ===============================
   PAGAMENTO + BACKEND
   =============================== */

async function analyze() {
  if (!signer || !userWallet) {
    alert("Conecte a carteira primeiro");
    return;
  }

  try {
    setStatus("🟡 Enviando transação...");

    const contract = new ethers.Contract(
      NOX_CONFIG.paymentContract,
      NOX_ABI,
      signer
    );

    const tx = await contract.payForAnalysis();
    setStatus("⏳ Aguardando confirmação...\n" + tx.hash);

    const receipt = await tx.wait();

    setStatus("🔍 Validando pagamento...");

    const res = await fetch(NOX_CONFIG.backend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txHash: receipt.transactionHash,
        user: userWallet,
        fixtureId: "premium"
      })
    });

    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error || "Pagamento não validado");
    }

    setStatus("✅ Pagamento confirmado!\nAnálise liberada.", true);

    // 👉 AQUI você chama sua análise premium real

  } catch (err) {
    console.error(err);
    setStatus("❌ Erro: " + err.message);
  }
}

/* ===============================
   AUTO-RECONNECT (OPCIONAL)
   =============================== */

window.addEventListener("load", async () => {
  if (window.ethereum && window.ethereum.selectedAddress) {
    try {
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      userWallet = await signer.getAddress();
      unlockAnalyze();
      setStatus("🔁 Carteira reconectada:\n" + userWallet, true);
    } catch (_) {}
  }
});
