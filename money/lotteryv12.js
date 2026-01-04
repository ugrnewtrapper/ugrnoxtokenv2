import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/+esm";

/* =============================
   CONFIGURAÇÃO
============================= */
const CFG = Object.freeze({
  chainId: 56,
  chainHex: "0x38",
  backend: "https://backendnoxv22.srrimas2017.workers.dev/",
  contract: "0xE058dac610F2a6040B35B4d3C9F8ABEfe57bb670",
  token: "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8"
});

/* =============================
   ABIs
============================= */
const SCRATCH_ABI = [
  "function buyScratch()",
  "function SCRATCH_PRICE() view returns(uint256)",
  "function prizeAmount() view returns(uint256)",
  "function paused() view returns(bool)",
  "event CycleCompleted(uint256 indexed cycleId,address indexed winner,uint256 prize,uint256 totalAccumulated,uint256 treasuryAmount)"
];

const ERC20_ABI = [
  "function approve(address,uint256)",
  "function allowance(address,address) view returns(uint256)"
];

/* =============================
   INIT AFTER DOM
============================= */
document.addEventListener("DOMContentLoaded", () => {

  /* =============================
     UI
  ============================= */
  const btn = document.getElementById("payBtn");
  const statusBox = document.getElementById("paymentStatus");
  const uiPrice = document.getElementById("uiPrice");
  const uiPrize = document.getElementById("uiPrize");

  if (!btn || !statusBox || !uiPrice || !uiPrize) {
    console.error("UI elements missing");
    return;
  }

  /* =============================
     HELPERS
  ============================= */
  const setStatus = (html) => statusBox.innerHTML = html;
  const lock = () => {
    btn.disabled = true;
    btn.textContent = "PROCESSANDO...";
  };
  const unlock = () => {
    btn.disabled = false;
    btn.textContent = "COMPRAR RASPADINHA";
  };

  /* =============================
     STATE
  ============================= */
  let provider;
  let signer;
  let busy = false;

  /* =============================
     WALLET CHECK
  ============================= */
  if (!window.ethereum) {
    setStatus("❌ Carteira Web3 não encontrada.");
    lock();
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);

  /* =============================
     FLUXO PRINCIPAL
  ============================= */
  btn.onclick = async () => {
    if (busy) return;
    busy = true;
    lock();

    try {
      setStatus("🔐 Conectando carteira...");
      await provider.send("eth_requestAccounts", []);
      signer = await provider.getSigner();

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== CFG.chainId) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CFG.chainHex }]
        });
        signer = await provider.getSigner();
      }

      const scratch = new ethers.Contract(CFG.contract, SCRATCH_ABI, signer);
      const token = new ethers.Contract(CFG.token, ERC20_ABI, signer);

      if (await scratch.paused()) {
        setStatus("⛔ Ciclo pausado. Aguarde.");
        unlock();
        return;
      }

      /* =============================
         PREÇO / PRÊMIO
      ============================= */
      setStatus("📡 Consultando raspadinha...");

      let price, prize;

      try {
        const data = await fetch(CFG.backend).then(r => r.json());
        price = data.scratchPrice;
        prize = data.prizeAmount;
      } catch {
        const p = await scratch.SCRATCH_PRICE();
        const pr = await scratch.prizeAmount();
        price = ethers.formatEther(p);
        prize = ethers.formatEther(pr);
      }

      uiPrice.textContent = price;
      uiPrize.textContent = prize;

      setStatus(`
        🎟️ Raspadinha<br>
        💰 Preço: ${price} UGR<br>
        🏆 Prêmio: ${prize} UGR<br><br>
        ✍️ Confirme na carteira
      `);

      /* =============================
         APPROVE
      ============================= */
      const wallet = await signer.getAddress();
      const allowance = await token.allowance(wallet, CFG.contract);
      const needed = await scratch.SCRATCH_PRICE();

      if (allowance < needed) {
        setStatus("✍️ Aprovando token UGR...");
        const txApprove = await token.approve(CFG.contract, needed);
        await txApprove.wait();
      }

      /* =============================
         COMPRA
      ============================= */
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
            premio = ethers.formatEther(parsed.args.prize);
          }
        } catch {}
      }

      if (ganhou) {
        setStatus(`🎉 <strong>VOCÊ GANHOU!</strong><br>🏆 ${premio} UGR`);
      } else {
        setStatus("😢 Não foi dessa vez.");
      }

    } catch (err) {
      console.error(err);
      setStatus("❌ Operação cancelada ou erro.");
    } finally {
      busy = false;
      unlock();
    }
  };
});
