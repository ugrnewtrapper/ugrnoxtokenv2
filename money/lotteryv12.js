import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/+esm";

/* =============================
CONFIG
============================= */
const CFG = {
  backend: "https://backendnoxv22.srrimas2017.workers.dev/",
  chainId: 56,
  chainHex: "0x38",
  contract: "0xE058dac610F2a6040B35B4d3C9F8ABEfe57bb670",
  token: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8"
};

/* =============================
UI
============================= */
const uiPrice = document.getElementById("uiPrice");
const uiPrize = document.getElementById("uiPrize");
const btn = document.getElementById("payBtn");
const statusBox = document.getElementById("paymentStatus");

const setStatus = (html) => (statusBox.innerHTML = html);

/* =============================
LOAD PRICE / PRIZE (NO WALLET)
============================= */
async function loadPublicData() {
  try {
    const res = await fetch(CFG.backend, { cache: "no-store" });
    if (!res.ok) throw new Error(`Backend retornou ${res.status}`);
    const data = await res.json();

    uiPrice.textContent = Number(data.scratchPrice || 0).toLocaleString("pt-BR", {
      maximumFractionDigits: 4
    });

    uiPrize.textContent = Number(data.prizeAmount || 0).toLocaleString("pt-BR", {
      maximumFractionDigits: 4
    });

    if (data.paused) {
      setStatus("⛔ Ciclo pausado pelo contrato.");
      btn.disabled = true;
    }
  } catch (e) {
    console.error("Erro ao carregar dados públicos:", e);
    uiPrice.textContent = "--";
    uiPrize.textContent = "--";
    setStatus("❌ Não foi possível carregar informações da raspadinha.");
  }
}

loadPublicData();

/* =============================
DETECT PROVIDER (META / TRUST)
============================= */
function getWeb3Provider() {
  if (!window.ethereum) return null;

  // Trust Wallet mobile precisa de fallback
  if (window.ethereum.isTrust || window.ethereum.isTrustWallet) {
    return new ethers.BrowserProvider(window.ethereum, "any");
  }

  // MetaMask / outros
  return new ethers.BrowserProvider(window.ethereum);
}

/* =============================
WALLET FLOW
============================= */
btn.onclick = async () => {
  btn.disabled = true;

  try {
    const provider = getWeb3Provider();
    if (!provider) throw new Error("Carteira Web3 não encontrada.");

    setStatus("🔐 Conectando carteira...");
    await provider.send("eth_requestAccounts", []);
    let signer = await provider.getSigner();

    /* =============================
       CONFERE / TROCA REDE
    ============================= */
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CFG.chainId) {
      setStatus("🔄 Mudando para a rede BSC...");
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CFG.chainHex }]
      });
      signer = await provider.getSigner();
    }

    /* =============================
       CONTRATO
    ============================= */
    const scratch = new ethers.Contract(
      CFG.contract,
      [
        "function buyScratch()",
        "function paused() view returns (bool)",
        "event CycleCompleted(uint256,address,uint256,uint256,uint256)"
      ],
      signer
    );

    const isPaused = await scratch.paused().catch(() => true);
    if (isPaused) {
      setStatus("⛔ Ciclo pausado.");
      return;
    }

    /* =============================
       EXECUÇÃO
    ============================= */
    // Executa compra (Trust Wallet SAFE)
setStatus("⏳ Processando raspadinha...");

const tx = await signer.sendTransaction({
  to: CFG.contract,
  data: "0x11d1735b", // buyScratch()
  gasLimit: 300000
});

const receipt = await tx.wait();

    /* =============================
       PROCESSA EVENTOS (ROBUSTO)
    ============================= */
    let ganhou = false;
    let premio = "0";

    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() !== CFG.contract.toLowerCase()) continue;
        const parsed = scratch.interface.parseLog(log);
        if (parsed && parsed.name === "CycleCompleted") {
          ganhou = true;
          premio = ethers.formatEther(parsed.args[2]);
          break;
        }
      } catch {
        // Ignora logs não relacionados
      }
    }

    /* =============================
       RESULTADO
    ============================= */
    if (ganhou) {
      setStatus(`🎉 <strong>VOCÊ GANHOU!</strong><br>🏆 ${premio} UGR`);
    } else {
      setStatus("😢 Não foi dessa vez. Tente novamente.");
    }

  } catch (err) {
    console.error("Erro na raspadinha:", err);
    setStatus(`❌ ${err?.message || "Operação cancelada ou erro."}`);
  } finally {
    btn.disabled = false;
  }
};
