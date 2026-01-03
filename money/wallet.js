/* =====================================================
   NOX PREMIUM • WALLET MANAGER
   Arquivo: money/wallet.js
   Suporte:
   - MetaMask / TrustWallet (Desktop + Mobile)
   - WalletConnect v2 (Fallback)
   ===================================================== */

/* ===============================
   CONFIGURAÇÃO GLOBAL
   =============================== */

const NOX_CONFIG = {
  chainId: 56,
  chainHex: "0x38",
  chainName: "BSC Mainnet",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  paymentContract: "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD",
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
let connecting = false;

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
   CONEXÃO WALLET (ROBUSTA)
   =============================== */

async function connectWallet() {
  if (connecting) return;
  connecting = true;

  try {
    setStatus("🔌 Conectando carteira...");

    // 🔥 REGRA DE OURO:
    // SE existir window.ethereum → SEMPRE usar
    if (window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
    } 
    // Fallback real → WalletConnect
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
    console.error("Wallet error:", err);

    // Usuário cancelou
    if (err.code === 4001) {
      setStatus("❌ Conexão rejeitada pelo usuário");
      return;
    }

    setStatus("❌ Falha ao conectar carteira");
  } finally {
    connecting = false;
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

    // 👉 Aqui você chama a análise premium real

  } catch (err) {
    console.error(err);
    setStatus("❌ Erro: " + err.message);
  }
}
