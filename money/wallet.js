/* =====================================================
   NOX PREMIUM • WALLET MANAGER
   Injected + WalletConnect v2 (QR / Link)
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
  "function allowance(address owner, address spender) view returns (uint256)"
];

let provider;
let signer;
let userWallet;
let wcProvider;
let connecting = false;

/* ===============================
   UI HELPERS
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
   CONNECT MENU
   =============================== */

function connectWallet() {
  if (connecting) return;

  const choice = document.createElement("div");
  choice.style.position = "fixed";
  choice.style.inset = "0";
  choice.style.background = "rgba(0,0,0,0.7)";
  choice.style.display = "flex";
  choice.style.alignItems = "center";
  choice.style.justifyContent = "center";
  choice.style.zIndex = "9999";

  choice.innerHTML = `
    <div style="
      background:#020617;
      border:1px solid #00ff9c;
      border-radius:16px;
      padding:22px;
      width:90%;
      max-width:320px;
      text-align:center;
      box-shadow:0 0 30px rgba(0,255,156,0.35)
    ">
      <h3 style="margin-top:0">Conectar Carteira</h3>

      <button id="btnInjected" style="width:100%;padding:12px;margin-top:10px;border-radius:10px;font-weight:600">
        🔗 Conexão Direta (MetaMask / Trust)
      </button>

      <button id="btnWC" style="width:100%;padding:12px;margin-top:10px;border-radius:10px;font-weight:600">
        📱 QR Code / Link (WalletConnect)
      </button>

      <button id="btnCancel" style="width:100%;padding:10px;margin-top:14px;background:transparent;color:#aaa">
        Cancelar
      </button>
    </div>
  `;

  document.body.appendChild(choice);

  document.getElementById("btnInjected").onclick = async () => {
    document.body.removeChild(choice);
    await connectInjected();
  };

  document.getElementById("btnWC").onclick = async () => {
    document.body.removeChild(choice);
    await connectWalletConnect();
  };

  document.getElementById("btnCancel").onclick = () => {
    document.body.removeChild(choice);
  };
}

/* ===============================
   INJECTED WALLET
   =============================== */

async function connectInjected() {
  try {
    connecting = true;
    setStatus("🔌 Conectando carteira...");

    if (!window.ethereum) {
      throw new Error("Nenhuma carteira detectada");
    }

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);

    await finalizeConnection();
  } catch (err) {
    handleConnectError(err);
  } finally {
    connecting = false;
  }
}

/* ===============================
   WALLETCONNECT v2
   =============================== */

async function connectWalletConnect() {
  try {
    connecting = true;
    setStatus("📱 Abrindo QR / Link...");

    wcProvider = await window.WalletConnectEthereumProvider.init({
      projectId: NOX_CONFIG.wcProjectId,
      chains: [NOX_CONFIG.chainId],
      showQrModal: true,
      rpcMap: {
        [NOX_CONFIG.chainId]: NOX_CONFIG.rpcUrl
      }
    });

    await wcProvider.connect();
    provider = new ethers.BrowserProvider(wcProvider);

    await finalizeConnection();
  } catch (err) {
    handleConnectError(err);
  } finally {
    connecting = false;
  }
}

/* ===============================
   FINALIZE
   =============================== */

async function finalizeConnection() {
  signer = await provider.getSigner();
  userWallet = await signer.getAddress();

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== NOX_CONFIG.chainId) {
    setStatus("❌ Troque para BSC Mainnet");
    return;
  }

  unlockAnalyze();
  setStatus("✅ Carteira conectada:\n" + userWallet, true);
}

function handleConnectError(err) {
  console.error(err);

  if (err.code === 4001) {
    setStatus("❌ Conexão rejeitada");
  } else {
    setStatus("❌ Falha ao conectar carteira");
  }
}

/* ===============================
   PAYMENT FLOW (INALTERADO)
   =============================== */

async function analyze() {
  try {
    if (!signer) {
      alert("Conecte a carteira primeiro");
      return;
    }

    setStatus("💳 Processando pagamento...");

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
    const allowance = await token.allowance(userWallet, NOX_CONFIG.paymentContract);

    if (allowance < price) {
      const approveTx = await token.approve(NOX_CONFIG.paymentContract, price);
      await approveTx.wait();
    }

    const tx = await payment.payForAnalysis();
    await tx.wait();

    setStatus("✅ Pagamento confirmado!", true);
  } catch (err) {
    console.error(err);
    setStatus("❌ Erro: " + err.message);
  }
  }
