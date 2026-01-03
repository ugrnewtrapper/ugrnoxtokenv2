/* =====================================================
   NOX PREMIUM • WALLET MANAGER
   WalletConnect v2 + Injected Wallets
   ===================================================== */

const NOX_CONFIG = {
  chainId: 56,
  chainHex: "0x38",
  chainName: "BSC Mainnet",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  paymentContract: "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD",
  tokenAddress: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8",
  backend: "https://backendnoxv22.srrimas2017.workers.dev/",
  wcProjectId: "82a100d35a9c24cb871b0fec9f8a9671"
};

const PAYMENT_ABI = [
  "function payForAnalysis() external",
  "function pricePerAnalysis() view returns (uint256)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

let provider;
let signer;
let userWallet;
let wcProvider;
let connecting = false;

/* ===============================
   UI
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
   CONNECT WALLET
   =============================== */

async function connectWallet() {
  if (connecting) return;
  connecting = true;

  try {
    setStatus("🔌 Conectando carteira...");

    /* ---------- 1️⃣ INJECTED WALLET ---------- */
    if (window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
    }

    /* ---------- 2️⃣ WALLETCONNECT v2 ---------- */
    else {
      if (!window.WalletConnectEthereumProvider) {
        throw new Error("WalletConnect indisponível");
      }

      wcProvider = await window.WalletConnectEthereumProvider.init({
        projectId: NOX_CONFIG.wcProjectId,
        chains: [NOX_CONFIG.chainId],
        showQrModal: true, // QR no desktop
        rpcMap: {
          [NOX_CONFIG.chainId]: NOX_CONFIG.rpcUrl
        }
      });

      await wcProvider.connect(); // QR ou link automático
      provider = new ethers.BrowserProvider(wcProvider);
    }

    signer = await provider.getSigner();
    userWallet = await signer.getAddress();

    const network = await provider.getNetwork();
    if (Number(network.chainId) !== NOX_CONFIG.chainId) {
      setStatus("❌ Troque para BSC Mainnet");
      connecting = false;
      return;
    }

    unlockAnalyze();
    setStatus("✅ Carteira conectada:\n" + userWallet, true);

  } catch (err) {
    console.error("CONNECT ERROR:", err);

    if (err.code === 4001) {
      setStatus("❌ Conexão rejeitada pelo usuário");
    } else {
      setStatus("❌ Falha ao conectar carteira");
    }
  } finally {
    connecting = false;
  }
}

/* ===============================
   PAYMENT FLOW
   =============================== */

async function analyze() {
  try {
    if (!signer || !userWallet) {
      alert("Conecte a carteira primeiro");
      return;
    }

    setStatus("🔍 Verificando token...");

    const token = new ethers.Contract(
      NOX_CONFIG.tokenAddress,
      ERC20_ABI,
      signer
    );

    const payment = new ethers.Contract(
      NOX_CONFIG.paymentContract,
      PAYMENT_ABI,
      signer
    );

    const price = await payment.pricePerAnalysis();
    const allowance = await token.allowance(
      userWallet,
      NOX_CONFIG.paymentContract
    );

    /* ---------- APPROVE ---------- */
    if (allowance < price) {
      setStatus("📝 Aprovando token...");

      const approveTx = await token.approve(
        NOX_CONFIG.paymentContract,
        price
      );

      await approveTx.wait();
    }

    /* ---------- PAY ---------- */
    setStatus("💳 Enviando pagamento...");

    const tx = await payment.payForAnalysis();
    setStatus("⏳ Confirmando...\n" + tx.hash);

    const receipt = await tx.wait();

    /* ---------- BACKEND ---------- */
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
    if (!data.ok) throw new Error("Pagamento inválido");

    setStatus("✅ Pagamento confirmado!\nAnálise liberada.", true);

  } catch (err) {
    console.error("PAY ERROR:", err);
    setStatus("❌ Erro: " + err.message);
  }
  }
