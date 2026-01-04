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

const setStatus = (html) => statusBox.innerHTML = html;

/* =============================
   LOAD PRICE / PRIZE (NO WALLET)
============================= */
async function loadPublicData() {
  try {
    const res = await fetch(CFG.backend);
    const data = await res.json();

    uiPrice.textContent = Number(data.scratchPrice).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });

    uiPrize.textContent = Number(data.prizeAmount).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });
  } catch (e) {
    console.error(e);
    uiPrice.textContent = "--";
    uiPrize.textContent = "--";
  }
}

loadPublicData();

/* =============================
   WALLET FLOW (ON CLICK)
============================= */
btn.onclick = async () => {
  try {
    if (!window.ethereum) {
      setStatus("❌ Carteira Web3 não encontrada.");
      return;
    }

    btn.disabled = true;
    setStatus("🔐 Conectando carteira...");

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    let signer = await provider.getSigner();

    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CFG.chainId) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CFG.chainHex }]
      });
      signer = await provider.getSigner();
    }

    const scratch = new ethers.Contract(
      CFG.contract,
      [
        "function buyScratch()",
        "function paused() view returns(bool)",
        "event CycleCompleted(uint256,address,uint256,uint256,uint256)"
      ],
      signer
    );

    if (await scratch.paused()) {
      setStatus("⛔ Ciclo pausado.");
      btn.disabled = false;
      return;
    }

    setStatus("⏳ Processando raspadinha...");
    const tx = await scratch.buyScratch();
    const receipt = await tx.wait();

    let ganhou = false;
    let premio = "0";

    for (const log of receipt.logs) {
      try {
        const parsed = scratch.interface.parseLog(log);
        if (parsed.name === "CycleCompleted") {
          ganhou = true;
          premio = ethers.formatEther(parsed.args[2]);
        }
      } catch {}
    }

    if (ganhou) {
      setStatus(`🎉 <strong>VOCÊ GANHOU!</strong><br>🏆 ${premio} UGR`);
    } else {
      setStatus("😢 Não foi dessa vez. Tente novamente.");
    }

  } catch (err) {
    console.error(err);
    setStatus("❌ Operação cancelada ou erro.");
  } finally {
    btn.disabled = false;
  }
};
