import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

/* =============================================================
   CONFIGURAÇÃO
   ============================================================= */

const CFG = {
    backend: "https://backendacd.tokenascend2026.workers.dev",
    chainId: 56,
    chainHex: "0x38",
    contract: "0x420DBe8B8130b86F9707afE2b2fA2FBBD9eF3060"
};

const BSC_CHAIN_PARAMS = {
    chainId: CFG.chainHex,
    chainName: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"]
};

const CONTRACT_ABI = [
    "function claim(address paymentToken, uint256 paymentAmount, bytes calldata backendSignature) external"
];

const ERC20_ABI = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
];

const SHARE_COUNTDOWN_SECONDS = 30;

/* =============================================================
   ELEMENTOS
   ============================================================= */

const shareBtn = document.getElementById("shareBtn");
const airdropBtn = document.getElementById("airdropBtn");
const countdownText = document.getElementById("countdownText");
const txStatus = document.getElementById("txStatus");
const paymentTokenSelect = document.getElementById("paymentToken");
const statRemaining = document.getElementById("statRemaining");
const statClaims = document.getElementById("statClaims");
const walletNotice = document.getElementById("walletNotice");
const metamaskLink = document.getElementById("metamaskLink");
const trustWalletLink = document.getElementById("trustWalletLink");
const networkNotice = document.getElementById("networkNotice");
const switchNetworkBtn = document.getElementById("switchNetworkBtn");

function setStatus(msg, tipo) {
    txStatus.className = `tx-status ${tipo}`;
    txStatus.innerHTML = msg;
}

const MENSAGENS_ERRO = {
    unsupported_payment_token: "Este token não é aceito para pagamento.",
    already_claimed: "Este endereço já reivindicou o airdrop.",
    airdrop_exhausted: "O airdrop acabou — não há mais ACD disponível.",
    rate_not_configured_on_chain: "A cotação deste token ainda não foi configurada. Tente novamente mais tarde.",
    missing_params: "Erro interno ao montar a solicitação.",
    invalid_address: "Endereço inválido."
};

/* =============================================================
   STATUS AO VIVO (carregado assim que a página abre)
   ============================================================= */

async function carregarStatus() {
    try {
        const res = await fetch(`${CFG.backend}/status`, { cache: "no-store" });
        const data = await res.json();

        const remaining = Number(BigInt(data.airdropRemaining) / 1000000000000000000n);
        statRemaining.textContent = remaining.toLocaleString("pt-BR") + " ACD";
        statClaims.textContent = data.claimsCompleted;
    } catch (err) {
        console.error("Erro ao carregar status:", err);
        statRemaining.textContent = "indisponível";
        statClaims.textContent = "indisponível";
    }
}

carregarStatus();

/* =============================================================
   DETECÇÃO DE CARTEIRA E PROVIDER
   (com fallback específico para Trust Wallet, igual ao script
   que já funciona no seu outro projeto)
   ============================================================= */

function temCarteiraInjetada() {
    return typeof window.ethereum !== "undefined";
}

function getWeb3Provider() {
    if (!window.ethereum) return null;

    if (window.ethereum.isTrust || window.ethereum.isTrustWallet) {
        return new ethers.BrowserProvider(window.ethereum, "any");
    }

    return new ethers.BrowserProvider(window.ethereum);
}

function montarLinksDeAbrirNaCarteira() {
    const hostEPath = window.location.host + window.location.pathname + window.location.search;
    metamaskLink.href = `https://metamask.app.link/dapp/${hostEPath}`;
    trustWalletLink.href = `https://link.trustwallet.com/open_url?url=${encodeURIComponent(window.location.href)}`;
}

function mostrarAvisoCarteira() {
    montarLinksDeAbrirNaCarteira();
    walletNotice.style.display = "block";
}

if (!temCarteiraInjetada()) {
    mostrarAvisoCarteira();
}

/* =============================================================
   CHECAGEM DE REDE (BNB Smart Chain, chainId 56)
   ============================================================= */

async function checarRede() {
    if (!temCarteiraInjetada()) return;

    try {
        const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
        const chainIdAtual = parseInt(chainIdHex, 16);

        if (chainIdAtual !== CFG.chainId) {
            networkNotice.style.display = "block";
            airdropBtn.disabled = true;
        } else {
            networkNotice.style.display = "none";
            if (countdownText.textContent.includes("liberado")) {
                airdropBtn.disabled = false;
            }
        }
    } catch (err) {
        // Sem permissão pra ler a rede ainda (carteira não conectada) — ignora
    }
}

async function trocarParaBSC() {
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: CFG.chainHex }]
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [BSC_CHAIN_PARAMS]
                });
            } catch (addError) {
                throw new Error("Não foi possível adicionar a BNB Smart Chain na sua carteira.");
            }
        } else if (switchError.code === 4001) {
            throw new Error("Troca de rede cancelada. É necessário estar na BNB Smart Chain para continuar.");
        } else {
            throw new Error("Não foi possível trocar de rede automaticamente. Troque manualmente para BNB Smart Chain na sua carteira.");
        }
    }
    await checarRede();
}

switchNetworkBtn.addEventListener("click", (e) => {
    e.preventDefault();
    trocarParaBSC().catch((err) => setStatus(`❌ ${err.message}`, "error"));
});

if (temCarteiraInjetada()) {
    checarRede();
    window.ethereum.on("chainChanged", checarRede);
    window.ethereum.on("accountsChanged", checarRede);
}

/* =============================================================
   PASSO 1 — COMPARTILHAR + CRONÔMETRO DE 30s
   ============================================================= */

function compartilharEIniciarContagem() {
    const shareData = {
        title: "ASCEND Airdrop",
        text: "Entrei no ecossistema ASCEND e resgatei meu airdrop! Participe também:",
        url: window.location.href
    };

    if (navigator.share) {
        navigator.share(shareData).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareData.url).catch(() => {});
        alert("Link copiado! Compartilhe com seus amigos.");
    }

    iniciarContagemRegressiva();
}

function iniciarContagemRegressiva() {
    shareBtn.disabled = true;

    let segundosRestantes = SHARE_COUNTDOWN_SECONDS;
    countdownText.innerHTML = `Liberando o airdrop em <strong>${segundosRestantes}s</strong>...`;

    const intervalo = setInterval(() => {
        segundosRestantes--;

        if (segundosRestantes <= 0) {
            clearInterval(intervalo);
            countdownText.innerHTML = "🔓 Airdrop liberado!";

            // Só libera de verdade se a rede também já estiver correta
            if (networkNotice.style.display !== "block") {
                airdropBtn.disabled = false;
            }

            txStatus.className = "tx-status info";
            txStatus.textContent = 'Pronto! Clique em "PARTICIPAR DO AIRDROP" para continuar.';
            return;
        }

        countdownText.innerHTML = `Liberando o airdrop em <strong>${segundosRestantes}s</strong>...`;
    }, 1000);
}

shareBtn.addEventListener("click", compartilharEIniciarContagem);

/* =============================================================
   PASSO 2 — CONECTAR CARTEIRA + REIVINDICAR
   ============================================================= */

async function participarAirdrop() {
    airdropBtn.disabled = true;

    try {
        const provider = getWeb3Provider();
        if (!provider) {
            mostrarAvisoCarteira();
            walletNotice.scrollIntoView({ behavior: "smooth", block: "center" });
            throw new Error("Carteira Web3 não encontrada. Use os botões acima para abrir o site no app da sua carteira.");
        }

        setStatus("🔐 Conectando carteira...", "info");
        await provider.send("eth_requestAccounts", []);
        let signer = await provider.getSigner();
        const address = await signer.getAddress();

        const network = await provider.getNetwork();
        if (Number(network.chainId) !== CFG.chainId) {
            setStatus("🔄 Trocando para a BNB Smart Chain...", "info");
            await trocarParaBSC();
            signer = await provider.getSigner();
        }

        const paymentToken = paymentTokenSelect.value;

        setStatus("Consultando o backend e gerando assinatura...", "info");

        const res = await fetch(`${CFG.backend}/claim-signature`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address, paymentToken })
        });

        const data = await res.json();

        if (data.error) {
            setStatus(MENSAGENS_ERRO[data.error] || `Erro: ${data.error}`, "error");
            airdropBtn.disabled = false;
            return;
        }

        const { paymentAmount, signature } = data;

        // Se houver taxa a pagar, garante allowance suficiente antes do claim.
        if (BigInt(paymentAmount) > 0n) {
            setStatus("Verificando aprovação do token de pagamento...", "info");

            const tokenContract = new ethers.Contract(paymentToken, ERC20_ABI, signer);
            const allowance = await tokenContract.allowance(address, CFG.contract);

            if (BigInt(allowance) < BigInt(paymentAmount)) {
                setStatus("Aprove o gasto do token na sua carteira...", "info");
                const approveTx = await tokenContract.approve(CFG.contract, paymentAmount);
                await approveTx.wait();
            }
        }

        setStatus("Confirme a transação de reivindicação na sua carteira...", "info");

        const contract = new ethers.Contract(CFG.contract, CONTRACT_ABI, signer);
        const claimTx = await contract.claim(paymentToken, paymentAmount, signature);

        setStatus("Transação enviada, aguardando confirmação na blockchain...", "info");
        await claimTx.wait();

        setStatus(
            `✅ Airdrop reivindicado com sucesso! <a href="https://bscscan.com/tx/${claimTx.hash}" target="_blank" rel="noopener">Ver transação</a>`,
            "success"
        );

        carregarStatus();

    } catch (err) {
        console.error("Erro no airdrop:", err);

        let msg = err && err.message ? err.message : "Ocorreu um erro inesperado.";

        if (err && (err.code === 4001 || err.code === "ACTION_REJECTED")) {
            msg = "Transação cancelada na carteira.";
        }

        setStatus(`❌ ${msg}`, "error");
        airdropBtn.disabled = false;
    }
}

airdropBtn.addEventListener("click", participarAirdrop);
