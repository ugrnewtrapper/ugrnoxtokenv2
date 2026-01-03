/* ===============================
   CONFIGURAÇÃO REAL
   =============================== */

const CONFIG = {
  chainId: 56,
  paymentContract: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8",
  backend: "https://backendnoxv22.srrimas2017.workers.dev/",
  wcProjectId: "SEU_PROJECT_ID_AQUI"
};

const ABI = [
  "function payForAnalysis() external",
  "event AnalysisPaid(address indexed user, uint256 amount)"
];

let provider, signer, userWallet;

/* ===============================
   STATUS
   =============================== */

function setStatus(text, ok = false) {
  const el = document.getElementById("status");
  if (!el) return;
  el.innerText = text;
  el.classList.toggle("connected", ok);
}

/* ===============================
   CONECTAR WALLET
   =============================== */

window.connectWallet = async function () {
  try {
    if (window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
    } else {
      const wcProvider = await EthereumProvider.init({
        projectId: CONFIG.wcProjectId,
        chains: [CONFIG.chainId],
        showQrModal: true,
        rpcMap: {
          56: "https://bsc-dataseed.binance.org/"
        }
      });

      await wcProvider.connect();
      provider = new ethers.BrowserProvider(wcProvider);
    }

    signer = await provider.getSigner();
    userWallet = await signer.getAddress();

    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CONFIG.chainId) {
      alert("Conecte-se à BSC Mainnet");
      return;
    }

    document.getElementById("analyzeBtn")?.classList.remove("locked");
    setStatus("Carteira conectada:\n" + userWallet, true);

  } catch (err) {
    console.error(err);
    alert("Falha ao conectar carteira");
  }
};

/* ===============================
   PAGAMENTO + BACKEND
   =============================== */

window.analyze = async function () {
  try {
    setStatus("🟡 Enviando transação...");

    const contract = new ethers.Contract(
      CONFIG.paymentContract,
      ABI,
      signer
    );

    const tx = await contract.payForAnalysis();
    setStatus("⏳ Aguardando confirmação...\n" + tx.hash);

    const receipt = await tx.wait();

    setStatus("🔍 Validando pagamento...");

    const res = await fetch(CONFIG.backend, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txHash: receipt.transactionHash,
        user: userWallet,
        fixtureId: "premium"
      })
    });

    const data = await res.json();
    if (!data.ok) throw new Error("Pagamento não validado");

    setStatus("✅ Pagamento confirmado!\nAnálise liberada.", true);

  } catch (err) {
    console.error(err);
    setStatus("❌ Erro: " + err.message);
  }
};
