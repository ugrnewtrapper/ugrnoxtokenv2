/* =====================================================
   NOX PREMIUM – RELEASE V33 (PRODUÇÃO)
   Backend obrigatório | Segurança máxima front
   ===================================================== */

import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js';

/* ======================
   CONFIGURAÇÃO
   ====================== */

const CHAIN_ID = 56;
const CHAIN_HEX = '0x38';

const PAYMENT_CONTRACT = '0xcf1Fe056d9E20f419873f42B4d87d243B6583bBD';
const PAYMENT_TOKEN    = '0xa131ebbfB81118F1A7228A54Cc435e1E86744EB8';

/* Backend REAL (obrigatório) */
const BACKEND_RELEASE_URL =
  'https://backendv12.srrimas2017.workers.dev/release';

/* ======================
   ABI
   ====================== */

const PAYMENT_ABI = [
    'function payForAnalysis() external',
    'function pricePerAnalysis() view returns (uint256)',
    'function paused() view returns (bool)',
    'event AnalysisPaid(address indexed user, uint256 amount)'
];

const ERC20_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)'
];

/* ======================
   CONTROLE DE ESTADO
   ====================== */

let paymentLock = false;

/* ======================
   EXPORT PRINCIPAL
   ====================== */

export async function requestAnalysisRelease() {

    if (sessionStorage.getItem('nox_paid_tx')) {
        return true;
    }

    if (paymentLock) return false;
    paymentLock = true;

   if (!sessionStorage.getItem('nox_session_id')) {
  throw new Error('Sessão inválida');
   }
   
    try {
        /* WALLET */
        const eth = window.ethereum || window.trustwallet;
        if (!eth) throw new Error('Wallet não detectada');

        const provider = new ethers.providers.Web3Provider(eth, 'any');
        await provider.send('eth_requestAccounts', []);

        const network = await provider.getNetwork();
        if (network.chainId !== CHAIN_ID) {
            await switchToBSC(eth);
        }

        const signer = provider.getSigner();
        const wallet = await signer.getAddress();

        /* CONTRATOS */
        const payment = new ethers.Contract(
            PAYMENT_CONTRACT,
            PAYMENT_ABI,
            signer
        );

        const token = new ethers.Contract(
            PAYMENT_TOKEN,
            ERC20_ABI,
            signer
        );

        /* PAUSE */
        if (await payment.paused()) {
            throw new Error('Contrato pausado');
        }

        /* PREÇO */
        const price = await payment.pricePerAnalysis();

        const balance = await token.balanceOf(wallet);
        if (balance.lt(price)) {
            throw new Error('Saldo insuficiente');
        }

        /* APPROVE */
        const allowance = await token.allowance(wallet, PAYMENT_CONTRACT);
        if (allowance.lt(price)) {
            const approveTx = await token.approve(PAYMENT_CONTRACT, price);
            await approveTx.wait();
        }

        /* PAGAMENTO */
        const tx = await payment.payForAnalysis();
        const receipt = await tx.wait();

        if (!receipt.status) {
            throw new Error('Transação revertida');
        }

        /* EVENTO */
        const event = receipt.events?.find(e => e.event === 'AnalysisPaid');
        if (!event || event.args.user.toLowerCase() !== wallet.toLowerCase()) {
            throw new Error('Evento inválido');
        }

        /* BACKEND – OBRIGATÓRIO */
const backendOK = await authorizeBackend({
    txHash: receipt.transactionHash
});

if (!backendOK) {
    throw new Error('Backend recusou pagamento');
}
        /* CACHE DE SESSÃO */
        sessionStorage.setItem('nox_paid_tx', receipt.transactionHash);

        return true;

    } catch (err) {
        console.error('[RELEASE]', err.message || err);
        alert(err.message || 'Erro no pagamento');
        return false;

    } finally {
        paymentLock = false;
    }
}

/* ======================
   BACKEND AUTH (BLOCKING)
   ====================== */

async function authorizeBackend(payload) {

    const res = await fetch(BACKEND_RELEASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  sessionId: sessionStorage.getItem('nox_session_id'),
  proof: payload.txHash
})
    });

    if (!res.ok) return false;

    const data = await res.json();
return data?.released === true;
}

/* ======================
   SWITCH BSC
   ====================== */

async function switchToBSC(eth) {
    await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_HEX }]
    });
}
