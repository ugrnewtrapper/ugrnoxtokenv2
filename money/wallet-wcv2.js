import { SignClient } from "https://cdn.jsdelivr.net/npm/@walletconnect/sign-client@2.11.1/dist/index.js";
import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm";
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/+esm";

/* CONFIG */
const CFG = {
  projectId: "82a100d35a9c24cb871b0fec9f8a9671",
  chainId: 56,
  rpc: "https://bsc-dataseed.binance.org/",
  payment: "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD",
  token: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8"
};

/* ABI */
const PAYMENT_ABI = [
  "function payForAnalysis()",
  "function pricePerAnalysis() view returns(uint256)"
];
const ERC20_ABI = [
  "function approve(address,uint256)",
  "function allowance(address,address) view returns(uint256)"
];

/* UI */
const connectBtn = document.getElementById("connectBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusBox = document.getElementById("status");
const qrBox = document.getElementById("qr");

const setStatus = t => statusBox.textContent = t;
const lock = () => analyzeBtn.classList.add("locked");
const unlock = () => analyzeBtn.classList.remove("locked");

/* STATE */
let client, session, provider, signer, wallet, busy=false;

/* INIT */
client = await SignClient.init({
  projectId: CFG.projectId,
  metadata: {
    name: "NOX Premium",
    description: "Premium Web3 Access",
    url: location.origin,
    icons: ["https://walletconnect.com/walletconnect-logo.png"]
  }
});

/* CONNECT */
connectBtn.onclick = async () => {
  setStatus("📱 Escaneie com sua carteira...");
  qrBox.innerHTML = "";

  const { uri, approval } = await client.connect({
    requiredNamespaces: {
      eip155: {
        methods: ["eth_sendTransaction","eth_sign"],
        chains: ["eip155:56"],
        events: ["accountsChanged"]
      }
    }
  });

  if (uri) {
    const canvas = document.createElement("canvas");
    qrBox.appendChild(canvas);
    await QRCode.toCanvas(canvas, uri, { width: 220 });
  }

  session = await approval();

  wallet = session.namespaces.eip155.accounts[0].split(":")[2];

  provider = new ethers.JsonRpcProvider(CFG.rpc);
  signer = provider.getSigner(wallet);

  unlock();
  setStatus(`✅ Conectado\n👛 ${wallet.slice(0,6)}...${wallet.slice(-4)}`);
};

/* PAYMENT */
analyzeBtn.onclick = async () => {
  if (busy || !wallet) return;
  busy = true; lock();

  try {
    const token = new ethers.Contract(CFG.token, ERC20_ABI, signer);
    const pay = new ethers.Contract(CFG.payment, PAYMENT_ABI, signer);

    const price = await pay.pricePerAnalysis();
    const allowance = await token.allowance(wallet, CFG.payment);

    if (allowance < price) {
      await token.approve(CFG.payment, price);
    }

    await pay.payForAnalysis();
    setStatus("✅ Premium liberado!");
    unlock();

  } catch {
    setStatus("❌ Transação cancelada");
  } finally {
    busy = false;
  }
};
