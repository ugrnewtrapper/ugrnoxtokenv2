import { createWeb3Modal, defaultConfig } from
  "https://unpkg.com/@web3modal/ethers@3/dist/index.js";

// 🔥 ISSO É O QUE VOCÊ NÃO ESTAVA CARREGANDO
import "https://unpkg.com/@web3modal/ui@3/dist/index.js";

/* CONFIG */

const projectId = "82a100d35a9c24cb871b0fec9f8a9671";

const metadata = {
  name: "UGR Premium",
  description: "UGR Premium Access",
  url: window.location.origin,
  icons: ["https://ugr.app.br/images/logo.png"]
};

const chains = [
  {
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: "https://bsc-dataseed.binance.org/"
  }
];

/* INIT — SEM ISSO O BOTÃO NÃO EXISTE */

createWeb3Modal({
  projectId,
  chains,
  ethersConfig: defaultConfig({
    metadata,
    defaultChainId: 56
  })
});

/* EVENTO (OPCIONAL, MAS PROVA QUE FUNCIONA) */

const status = document.getElementById("status");

window.addEventListener("w3m-connected", (e) => {
  status.textContent = "✅ Carteira conectada";
});

window.addEventListener("w3m-disconnected", () => {
  status.textContent = "🔒 Carteira não conectada";
});
