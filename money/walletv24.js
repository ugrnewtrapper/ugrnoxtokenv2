/**
 * wallet-frontend.js
 * Arquivo 4 – Wallet Frontend (mobile/web)
 * Função: Frontend auxiliar replicando walletv24.js
 *
 * RESPONSABILIDADES:
 * - Conectar carteira Web3 (MetaMask / Trust Wallet)
 * - Realizar pagamento via token BNB Chain (BEP-20)
 * - Capturar automaticamente txHash da transação
 * - Enviar txHash + userId para worker.js
 * - Obter autorização e executar análise
 * - Sem lógica financeira local
 */

// Contrato / token (mesmo do backend wallet24.js)
const CONTRACT_ADDRESS = '0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD';
const TOKEN_ADDRESS = '0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8';
const TOKEN_DECIMALS = 18; // padrão BEP-20

// URL do worker.js
const WORKER_URL = 'https://seu-worker-url.com/analyze';

// Cache local de txHash usados
const usedTxMap = new Map();

// Valida txHash
function isValidTxHash(txHash) {
  return typeof txHash === 'string' && /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

// Marca txHash como usado (localStorage + sessão)
function markTxUsed(txHash) {
  usedTxMap.set(txHash, { usedAt: Date.now() });
  try {
    const persisted = JSON.parse(localStorage.getItem('usedTxMap') || '{}');
    persisted[txHash] = Date.now();
    localStorage.setItem('usedTxMap', JSON.stringify(persisted));
  } catch {}
}

// Verifica se txHash já foi usado
function isTxUsed(txHash) {
  if (usedTxMap.has(txHash)) return true;
  try {
    const persisted = JSON.parse(localStorage.getItem('usedTxMap') || '{}');
    if (persisted[txHash]) {
      usedTxMap.set(txHash, { usedAt: persisted[txHash] });
      return true;
    }
  } catch {}
  return false;
}

// ----------------------------
// WalletFrontend class
// ----------------------------
class WalletFrontend {
  constructor(workerUrl = WORKER_URL) {
    this.workerUrl = workerUrl;
    this.provider = null;
    this.signer = null;
  }

  /**
   * Conecta carteira Web3
   * Retorna endereço conectado
   */
  async connectWallet() {
    if (!window.ethereum) throw new Error('Carteira Web3 não detectada');
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    this.signer = this.provider.getSigner();
    const address = await this.signer.getAddress();
    return address;
  }

  /**
   * Realiza pagamento automático no token BEP-20
   * Retorna txHash da transação
   */
  async payToken(amount) {
    if (!this.signer) throw new Error('Carteira não conectada');

    // Conecta contrato do token
    const tokenContract = new ethers.Contract(
      TOKEN_ADDRESS,
      [
        'function transfer(address to, uint256 amount) returns (bool)',
      ],
      this.signer
    );

    const amountBN = ethers.parseUnits(amount.toString(), TOKEN_DECIMALS);

    // Executa transação e captura txHash
    const tx = await tokenContract.transfer(CONTRACT_ADDRESS, amountBN);
    const receipt = await tx.wait(); // espera confirmação

    if (!receipt.status) throw new Error('Transação falhou');

    return tx.hash; // txHash automático
  }

  /**
   * Solicita autorização e envia txHash para worker.js
   */
  async chargeAndAuthorize(userId, txHash) {
    if (!userId || !isValidTxHash(txHash) || isTxUsed(txHash)) {
      return { authorized: false, transactionId: null };
    }

    try {
      const response = await fetch(this.workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, txHash }),
      });

      const data = await response.json();
      if (data.success && data.transactionId) {
        markTxUsed(txHash);
        return { authorized: true, transactionId: data.transactionId };
      }

      return { authorized: false, transactionId: null };
    } catch (err) {
      console.error('Erro ao comunicar com worker.js:', err);
      return { authorized: false, transactionId: null };
    }
  }

  /**
   * Executa análise completa
   * 1) Paga token automaticamente
   * 2) Obtém txHash
   * 3) Autoriza análise no worker
   * 4) Retorna análise estatística
   */
  async runAnalysis({ userId, amount, apiKey, date, matchId }) {
    // Passo 1: pagamento
    const txHash = await this.payToken(amount);

    // Passo 2: autorização no backend
    const auth = await this.chargeAndAuthorize(userId, txHash);
    if (!auth.authorized) throw new Error('Pagamento não autorizado');

    // Passo 3: execução da análise
    const payload = { userId, apiKey, date, matchId, txHash };
    const response = await fetch(this.workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Erro desconhecido no worker');

    return result.analysis;
  }
}

// Export
export default WalletFrontend;
