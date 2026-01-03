<script type="module">
import { createWeb3Modal, defaultConfig } 
  from "https://unpkg.com/@web3modal/ethers@3.5.0/dist/index.js";

import { ethers } 
  from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/dist/ethers.min.js";

const NOX_CONFIG = {
  projectId: "82a100d35a9c24cb871b0fec9f8a9671",
  chainId: 56,
  rpcUrl: "https://bsc-dataseed.binance.org/",
  paymentContract: "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD",
  tokenAddress: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8"
};

const PAYMENT_ABI = [
  "function payForAnalysis() external",
  "function pricePerAnalysis() view returns (uint256)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

/* ===============================
   WEB3MODAL
   =============================== */

const ethersConfig = defaultConfig({
  metadata: {
    name: "NOX Premium",
    description: "NOX Premium Analytics",
    url: "https://ugr.app.br",
    icons: ["https://ugr.app.br/images/logo.png"]
  }
});

const modal = createWeb3Modal({
  projectId: NOX_CONFIG.projectId,
  ethersConfig,
  chains: [{
    chainId: 56,
    name: "BSC",
    rpcUrl: NOX_CONFIG.rpcUrl,
    currency: { name: "BNB", symbol: "BNB", decimals: 18 }
  }]
});

let provider, signer, userWallet;

/* ===============================
   UI
   =============================== */

const statusEl = document.getElementById("status");
const analyzeBtn = document.getElementById("analyzeBtn");
const connectBtn = document.getElementById("openWallet");

function setStatus(msg, ok = false) {
  statusEl.innerText = msg;
  statusEl.style.color = ok ? "#00ff9c" : "#fff";
}

/* ===============================
   CONNECT
   =============================== */

connectBtn.onclick = async () => {
  await modal.open();
};

modal.subscribeProvider(async () => {
  provider = new ethers.BrowserProvider(modal.getWalletProvider());
  signer = await provider.getSigner();
  userWallet = await signer.getAddress();

  analyzeBtn.classList.remove("locked");
  setStatus("✅ Conectado:\n" + userWallet, true);
});

/* ===============================
   PAYMENT
   =============================== */

analyzeBtn.onclick = async () => {
  try {
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

    setStatus("✅ Pagamento confirmado!", true);

  } catch (err) {
    console.error(err);
    setStatus("❌ " + (err.reason || err.message));
  }
};
</script>
