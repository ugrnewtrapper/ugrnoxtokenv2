<script>
/* =====================================================
   NOX PREMIUM • WALLET MANAGER
   Injected + WalletConnect v2 (QR / Link)
   ===================================================== */

const NOX_CONFIG = {
  chainId: 56,
  chainHex: "0x38",
  chainName: "BSC Mainnet",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  explorer: "https://bscscan.com",
  paymentContract: "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD",
  tokenAddress: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8",
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
   CONNECT MODAL
   =============================== */

function connectWallet() {
  if (connecting) return;

  const modal = document.createElement("div");
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,.7);
    display:flex;align-items:center;justify-content:center
  `;

  modal.innerHTML = `
    <div style="background:#020617;border:1px solid #00ff9c;
      border-radius:16px;padding:22px;width:90%;max-width:320px;text-align:center">
      <h3>Conectar Carteira</h3>
      <button id="inj" style="width:100%;padding:12px;margin-top:10px">🔗 MetaMask / Trust</button>
      <button id="wc" style="width:100%;padding:12px;margin-top:10px">📱 QR / Link</button>
      <button id="cancel" style="width:100%;margin-top:12px;background:none;color:#aaa">Cancelar</button>
    </div>
  `;

  document.body.appendChild(modal);

  inj.onclick = async () => {
    modal.remove();
    await connectInjected();
  };

  wc.onclick = async () => {
    modal.remove();
    await connectWalletConnect();
  };

  cancel.onclick = () => modal.remove();
}

/* ===============================
   NETWORK
   =============================== */

async function ensureBSC() {
  const net = await provider.getNetwork();
  if (Number(net.chainId) === NOX_CONFIG.chainId) return;

  try {
    await provider.send("wallet_switchEthereumChain", [
      { chainId: NOX_CONFIG.chainHex }
    ]);
  } catch (err) {
    if (err.code === 4902) {
      await provider.send("wallet_addEthereumChain", [{
        chainId: NOX_CONFIG.chainHex,
        chainName: NOX_CONFIG.chainName,
        rpcUrls: [NOX_CONFIG.rpcUrl],
        blockExplorerUrls: [NOX_CONFIG.explorer],
        nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }
      }]);
    } else {
      throw err;
    }
  }
}

/* ===============================
   INJECTED
   =============================== */

async function connectInjected() {
  try {
    connecting = true;
    setStatus("🔌 Conectando...");

    if (!window.ethereum) throw new Error("Carteira não detectada");

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    await ensureBSC();
    await finalizeConnection();

  } catch (err) {
    handleError(err);
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
    setStatus("📱 Abrindo WalletConnect...");

    wcProvider = await WalletConnectEthereumProvider.init({
      projectId: NOX_CONFIG.wcProjectId,
      chains: [NOX_CONFIG.chainId],
      showQrModal: true,
      rpcMap: { [NOX_CONFIG.chainId]: NOX_CONFIG.rpcUrl }
    });

    await wcProvider.connect();
    provider = new ethers.BrowserProvider(wcProvider);
    await finalizeConnection();

  } catch (err) {
    handleError(err);
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
  unlockAnalyze();
  setStatus("✅ Conectado:\n" + userWallet, true);
}

/* ===============================
   PAYMENT
   =============================== */

async function analyze() {
  try {
    if (!signer) return alert("Conecte a carteira");

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
      const tx1 = await token.approve(NOX_CONFIG.paymentContract, price);
      await tx1.wait();
    }

    const tx2 = await payment.payForAnalysis();
    await tx2.wait();

    setStatus("✅ Pagamento confirmado", true);

  } catch (err) {
    handleError(err);
  }
}

/* ===============================
   ERRORS
   =============================== */

function handleError(err) {
  console.error(err);
  if (err.code === 4001) {
    setStatus("❌ Ação rejeitada");
  } else {
    setStatus("❌ " + (err.message || "Erro desconhecido"));
  }
}

/* ===============================
   🔓 EXPOSIÇÃO GLOBAL (CRÍTICO)
   =============================== */

window.connectWallet = connectWallet;
window.connectInjected = connectInjected;
window.connectWalletConnect = connectWalletConnect;
window.analyze = analyze;

</script>
