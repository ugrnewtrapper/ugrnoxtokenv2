/* ======================================================
   WalletConnect v2 — NOX Premium
   ====================================================== */

import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.1/dist/ethers.min.js";
import {
  EthereumProvider
} from "https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.11.1/dist/index.es.js";

/* ===============================
   CONFIG
   =============================== */

const WC_CONFIG = {
  projectId: "SEU_PROJECT_ID_AQUI",
  chains: [56], // BSC Mainnet
  rpcMap: {
    56: "https://bsc-dataseed.binance.org/"
  },
  methods: [
    "eth_sendTransaction",
    "eth_signTransaction",
    "eth_sign",
    "personal_sign"
  ],
  events: ["chainChanged", "accountsChanged"],
  showQrModal: true
};

let wcProvider;
let ethersProvider;
let signer;
let userAddress;

/* ===============================
   CONECTAR
   =============================== */

export async function connectWalletWC() {
  wcProvider = await EthereumProvider.init(WC_CONFIG);

  await wcProvider.connect();

  ethersProvider = new ethers.BrowserProvider(wcProvider);
  signer = await ethersProvider.getSigner();
  userAddress = await signer.getAddress();

  return {
    provider: ethersProvider,
    signer,
    address: userAddress
  };
}

/* ===============================
   DESCONECTAR (opcional)
   =============================== */

export async function disconnectWalletWC() {
  if (wcProvider) {
    await wcProvider.disconnect();
  }
}
