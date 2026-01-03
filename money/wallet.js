/* =====================================================
   NOX PREMIUM • WALLET MANAGER
   Arquivo: money/wallet.js
   ===================================================== */

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

let provider = null;
let signer = null;
let userWallet = null;
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
   CONNECT WALLET
   =============================== */

async function connectWallet() {
  if (connecting) return;
  connecting = true;

  try {
    setStatus("🔌 Conectando carteira...");

    // PRIORIDADE TOTAL: window.ethereum
    if (window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // 🔁 TENTAR TROCAR / ADICIONAR BSC
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: NOX_CONFIG.chainHex }]
        });
      } catch (err) {
        if (err.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: NOX_CONFIG.chainHex,
              chainName: NOX_CONFIG.chainName,
              rpcUrls: [NOX_CONFIG.rpcUrl],
              nativeCurrency: {
                name: "BNB",
                symbol: "BNB",
                decimals: 18
              },
              blockExplorerUrls: ["https://bscscan.com"]
            }]
          });
        } else {
          throw err;
        }
      }

    } else {
      // WALLETCONNECT CORRETO (UMD)
      const wcProvider =
        await window.WalletConnectEthereumProvider.init({
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

    unlockAnalyze();
    setStatus("✅ Carteira conectada:\n" + userWallet, true);

  } catch (err) {
    console.error("Wallet error:", err);

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
   PAY + BACKEND
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

  } catch (err) {
    console.error(err);
    setStatus("❌ Erro: " + err.message);
  }
                            }
