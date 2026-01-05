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
   UI ELEMENTS
================================ */
const payBtn = document.getElementById("payBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusBox = document.getElementById("paymentStatus");

/* ===============================
   HELPERS
================================ */
const setStatus = (html) => statusBox.innerHTML = html;

const lockAnalyze = () => {
  analyzeBtn.disabled = true;
  analyzeBtn.style.display = "none"; // mantém escondido enquanto não pago
};

const unlockAnalyze = () => {
  analyzeBtn.disabled = false;
  analyzeBtn.style.display = "block"; // mostra o botão após pagamento
};

/* ===============================
   STATE
================================ */
let provider;
let signer;
let wallet;
let busy = false;

/* ===============================
   INIT
================================ */
lockAnalyze();

if (!window.ethereum) {
  setStatus("❌ Carteira Web3 não encontrada.<br>Abra no navegador da sua carteira.");
  payBtn.disabled = true;
  throw new Error("No wallet");
}

provider = new ethers.BrowserProvider(window.ethereum);

/* ===============================
   CONEXÃO + PAGAMENTO
================================ */
payBtn.onclick = async () => {
  if (busy) return;
  busy = true;
  lockAnalyze();

  try {
    /* 🔐 CONECTAR CARTEIRA */
    const accounts = await provider.send("eth_requestAccounts", []);
    wallet = accounts[0];

    signer = await provider.getSigner();

    /* 🌐 CHECAR REDE */
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CFG.chainId) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CFG.chainHex }]
        });
      } catch {
        setStatus("❌ Conecte à rede BSC.");
        busy = false;
        return;
      }
    }

    /* 💰 CONTRATOS */
    const token = new ethers.Contract(CFG.tokenContract, ERC20_ABI, signer);
    const payment = new ethers.Contract(CFG.paymentContract, PAYMENT_ABI, signer);

    const price = await payment.pricePerAnalysis();
    const allowance = await token.allowance(wallet, CFG.paymentContract);

    /* 📝 APPROVE */
    if (allowance < price) {
      setStatus("✍️ Aguardando aprovação do token...");
      const txApprove = await token.approve(CFG.paymentContract, price);
      await txApprove.wait();
    }

    /* 💳 PAGAMENTO */
    setStatus("💳 Confirmando pagamento...");
    const txPay = await payment.payForAnalysis();
    await txPay.wait();

    /* ✅ LIBERADO */
    setStatus("✅ Pagamento confirmado.<br>1 análise Premium liberada.");
    unlockAnalyze();

    // 🔔 dispara evento global para front escutar
    window.dispatchEvent(new Event("nox-payment-ok"));

  } catch (err) {
    console.error(err);
    setStatus("❌ Operação cancelada ou erro na transação.");
  } finally {
    busy = false;
  }
};

/* ===============================
   EVENTOS GLOBAIS (OPCIONAL)
================================ */
// Permite integrar com front que escuta "nox-payment-ok"
window.lockAnalyze = lockAnalyze;
window.unlockAnalyze = unlockAnalyze;
