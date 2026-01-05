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
    const res = await fetch(CFG.backend);
    if (!res.ok) throw new Error(`Backend retornou ${res.status}`);
    const data = await res.json();

    uiPrice.textContent = Number(data.scratchPrice || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });

    uiPrize.textContent = Number(data.prizeAmount || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });

    // Bloqueia botão se ciclo pausado
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
WALLET FLOW (ON CLICK)
============================= */
btn.onclick = async () => {
  btn.disabled = true;
  try {
    if (!window.ethereum) throw new Error("Carteira Web3 não encontrada.");

    setStatus("🔐 Conectando carteira...");
    const provider = new ethers.BrowserProvider(window.ethereum);

    // Solicita contas
    await provider.send("eth_requestAccounts", []);
    let signer = await provider.getSigner();

    // Confere rede
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CFG.chainId) {
      setStatus("🔄 Mudando para a rede BSC...");
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CFG.chainHex }]
      });
      signer = await provider.getSigner();
    }

    // Conecta contrato
    const scratch = new ethers.Contract(
      CFG.contract,
      [
        "function buyScratch()",
        "function paused() view returns(bool)",
        "event CycleCompleted(uint256,address,uint256,uint256,uint256)"
      ],
      signer
    );

    // Confere se ciclo pausado
    const isPaused = await scratch.paused().catch(() => true);
    if (isPaused) {
      setStatus("⛔ Ciclo pausado.");
      return;
    }

    // Executa compra
    setStatus("⏳ Processando raspadinha...");
    const tx = await scratch.buyScratch();
    const receipt = await tx.wait();

    // Processa logs de eventos
    let ganhou = false;
    let premio = "0";

    for (const log of receipt.logs) {
      try {
        const parsed = scratch.interface.parseLog(log);
        if (parsed?.name === "CycleCompleted") {
          ganhou = true;
          premio = ethers.formatEther(parsed.args?.[2] || 0);
          break;
        }
      } catch (err) {
        console.warn("Log não reconhecido:", err);
      }
    }

    // Atualiza status final
    if (ganhou) {
      setStatus(`🎉 <strong>VOCÊ GANHOU!</strong><br>🏆 ${premio} UGR`);
    } else {
      setStatus("😢 Não foi dessa vez. Tente novamente.");
    }

  } catch (err) {
    console.error("Erro na compra da raspadinha:", err);
    setStatus(`❌ ${err.message || "Operação cancelada ou erro."}`);
  } finally {
    btn.disabled = false;
  }
};
