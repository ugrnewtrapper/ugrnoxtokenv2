import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/+esm";

const CFG = {
  backend: "https://backendnoxv22.srrimas2017.workers.dev/",
  chainId: 56,
  chainHex: "0x38",
  contract: "0xE058dac610F2a6040B35B4d3C9F8ABEfe57bb670"
};

const uiPrice = document.getElementById("uiPrice");
const uiPrize = document.getElementById("uiPrize");
const btn = document.getElementById("payBtn");
const statusBox = document.getElementById("paymentStatus");

const setStatus = (html) => statusBox.innerHTML = html;

async function loadPublicData() {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);

    const res = await fetch(CFG.backend, { signal: controller.signal });
    const data = await res.json();

    uiPrice.textContent = Number(data.scratchPrice).toLocaleString("pt-BR");
    uiPrize.textContent = Number(data.prizeAmount).toLocaleString("pt-BR");
  } catch {
    uiPrice.textContent = "--";
    uiPrize.textContent = "--";
  }
}

loadPublicData();

btn?.addEventListener("click", async () => {
  try {
    if (!window.ethereum) {
      setStatus("❌ MetaMask não encontrada");
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
      setStatus("⛔ Ciclo pausado");
      btn.disabled = false;
      return;
    }

    setStatus("⏳ Processando...");
    const tx = await scratch.buyScratch();
    const receipt = await tx.wait();

    let premio = null;

    for (const log of receipt.logs) {
      try {
        const parsed = scratch.interface.parseLog(log);
        if (parsed.name === "CycleCompleted") {
          premio = ethers.formatEther(parsed.args[2]);
        }
      } catch {}
    }

    if (premio) {
      setStatus(`🎉 <strong>VOCÊ GANHOU</strong><br>${premio} UGR`);
    } else {
      setStatus("😢 Não foi dessa vez");
    }

  } catch (e) {
    setStatus("❌ Operação cancelada");
  } finally {
    btn.disabled = false;
  }
});
