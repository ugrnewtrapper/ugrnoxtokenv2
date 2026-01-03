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

let provider, signer, userWallet, wcProvider;
let connecting = false;

/* ================= UI ================= */

function setStatus(text, ok = false) {
  const el = document.getElementById("status");
  if (!el) return;
  el.innerText = text;
  el.classList.toggle("connected", ok);
}

function unlockAnalyze() {
  document.getElementById("analyzeBtn")?.classList.remove("locked");
}

/* ================= NETWORK ================= */

async function ensureBSC() {
  const net = await provider.getNetwork();
  if (Number(net.chainId) === NOX_CONFIG.chainId) return;

  try {
    await provider.send("wallet_switchEthereumChain", [
      { chainId: NOX_CONFIG.chainHex }
    ]);
  } catch (e) {
    if (e.code === 4902) {
      await provider.send("wallet_addEthereumChain", [{
        chainId: NOX_CONFIG.chainHex,
        chainName: NOX_CONFIG.chainName,
        rpcUrls: [NOX_CONFIG.rpcUrl],
        blockExplorerUrls: [NOX_CONFIG.explorer],
        nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }
      }]);
    } else throw e;
  }
}

/* ================= INJECTED ================= */

async function connectInjected() {
  try {
    connecting = true;
    setStatus("🔌 Conectando carteira...");

    if (!window.ethereum) throw new Error("Carteira não detectada");

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    await ensureBSC();
    await finalize();

  } catch (e) {
    handleError(e);
  } finally {
    connecting = false;
  }
}

/* ================= WALLETCONNECT ================= */

async function connectWalletConnect() {
  try {
    connecting = true;
    setStatus("📱 Abrindo QR / Link...");

    wcProvider = await WalletConnectEthereumProvider.init({
      projectId: NOX_CONFIG.wcProjectId,
      chains: [NOX_CONFIG.chainId],
      showQrModal: true,
      rpcMap: { [NOX_CONFIG.chainId]: NOX_CONFIG.rpcUrl }
    });

    await wcProvider.connect();
    provider = new ethers.BrowserProvider(wcProvider);
    await finalize();

  } catch (e) {
    handleError(e);
  } finally {
    connecting = false;
  }
}

/* ================= FINALIZE ================= */

async function finalize() {
  signer = await provider.getSigner();
  userWallet = await signer.getAddress();
  unlockAnalyze();
  setStatus("✅ Conectado:\n" + userWallet, true);
}

/* ================= PAYMENT ================= */

async function analyze() {
  try {
    if (!signer) return alert("Conecte a carteira");

    setStatus("💳 Processando pagamento...");

    const token = new ethers.Contract(NOX_CONFIG.tokenAddress, ERC20_ABI, signer);
    const payment = new ethers.Contract(NOX_CONFIG.paymentContract, PAYMENT_ABI, signer);

    const price = await payment.pricePerAnalysis();
    const allowance = await token.allowance(userWallet, NOX_CONFIG.paymentContract);

    if (allowance < price) {
      const tx1 = await token.approve(NOX_CONFIG.paymentContract, price);
      await tx1.wait();
    }

    const tx2 = await payment.payForAnalysis();
    await tx2.wait();

    setStatus("✅ Pagamento confirmado!", true);

  } catch (e) {
    handleError(e);
  }
}

/* ================= ERRORS ================= */

function handleError(e) {
  console.error(e);
  if (e.code === 4001) setStatus("❌ Ação rejeitada");
  else setStatus("❌ " + (e.message || "Erro"));
}

/* ================= GLOBAL ================= */

window.connectInjected = connectInjected;
window.connectWalletConnect = connectWalletConnect;
window.analyze = analyze;
