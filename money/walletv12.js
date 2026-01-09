import { ethers } from "ethers";

const BSC_CHAIN_ID = 56n;
const CONTRACT_ADDRESS = "0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD";
const TOKEN_ADDRESS = "0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8";

const PAYMENT_ABI = [
  "function payForAnalysis() external",
  "function pricePerAnalysis() view returns (uint256)",
  "function paused() view returns (bool)",
  "event AnalysisPaid(address indexed user, uint256 amount)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

export class WalletV12 {
  provider;
  signer;
  user;
  _paying = false;

  async connect() {
    if (!window.ethereum) {
      throw new Error("Carteira não encontrada");
    }

    if (this.provider) {
      window.ethereum.removeAllListeners("accountsChanged");
      window.ethereum.removeAllListeners("chainChanged");
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    await this.provider.send("eth_requestAccounts", []);
    await this.#validateNetwork();

    this.signer = await this.provider.getSigner();
    this.user = await this.signer.getAddress();

    window.ethereum.on("accountsChanged", async accounts => {
      this.user = accounts.length ? accounts[0] : null;
      this.signer = this.user ? await this.provider.getSigner() : null;
    });

    window.ethereum.on("chainChanged", () => {
      this.user = null;
      this.signer = null;
      this.provider = null;
    });

    return this.user;
  }

  async pay() {
    if (this._paying) {
      throw new Error("Pagamento já em andamento");
    }

    if (!this.provider || !this.signer || !this.user) {
      throw new Error("Carteira desconectada");
    }

    this._paying = true;
    const userSnapshot = this.user;

    try {
      await this.#validateNetwork();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        PAYMENT_ABI,
        this.signer
      );

      if (await contract.paused()) {
        throw new Error("Contrato pausado");
      }

      const initialPrice = await contract.pricePerAnalysis();

      const token = new ethers.Contract(
        TOKEN_ADDRESS,
        ERC20_ABI,
        this.signer
      );

      const allowance = await token.allowance(userSnapshot, CONTRACT_ADDRESS);

      if (allowance < initialPrice) {
        const approveTx = await token.approve(CONTRACT_ADDRESS, initialPrice);
        await approveTx.wait();
      }

      const priceBeforePay = await contract.pricePerAnalysis();
      if (priceBeforePay !== initialPrice) {
        throw new Error("Preço alterado, tente novamente");
      }

      const tx = await contract.payForAnalysis();
      const receipt = await tx.wait();

      if (receipt.status !== 1) {
        throw new Error("Pagamento falhou");
      }

      const iface = new ethers.Interface(PAYMENT_ABI);

      const paidEvent = receipt.logs
        .filter(log => log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase())
        .map(log => {
          try {
            return iface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === "AnalysisPaid");

      if (!paidEvent) {
        throw new Error("Evento de pagamento não encontrado");
      }

      const { user, amount } = paidEvent.args;

      if (user.toLowerCase() !== userSnapshot.toLowerCase()) {
        throw new Error("Pagamento não pertence ao usuário");
      }

      if (amount !== priceBeforePay) {
        throw new Error("Valor pago incorreto");
      }

      return {
        txHash: tx.hash,
        from: userSnapshot,
        price: priceBeforePay.toString(),
        singleUse: true
      };
    } finally {
      this._paying = false;
    }
  }

  async #validateNetwork() {
    if (!this.provider) {
      throw new Error("Provider inválido");
    }

    const network = await this.provider.getNetwork();
    if (network.chainId !== BSC_CHAIN_ID) {
      throw new Error("Rede incorreta");
    }
  }
}
