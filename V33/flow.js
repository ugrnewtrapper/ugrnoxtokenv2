/* =====================================================
   NOX PREMIUM – FLOW V33
   Função: Orquestrador principal
   ===================================================== */

console.log('NOX FLOW V33 iniciado');

/* ======================
   IMPORTS
   ====================== */
import { loadCompetitions } from './competitions.js';
import { requestAnalysisRelease } from './release.js';
import { runCalculator } from './calculator.js';

/* ======================
   DOM READY (OBRIGATÓRIO)
   ====================== */
document.addEventListener('DOMContentLoaded', () => {

    console.log('DOM carregado');
   let NOX_PAY_LOCK = false;

    /* ======================
       ESTADO GLOBAL CONTROLADO
       ====================== */
    const NOX_STATE = {
        apiKey: null,
        selectedDate: null,
        selectedMatch: null,
        analysisUnlocked: false
    };

    /* ======================
       ELEMENTOS DO DOM
       ====================== */
    const apiKeyInput      = document.getElementById('apiKey');
    const dateInput        = document.getElementById('matchDate');
    const loadBtn          = document.getElementById('loadCompetitions');
    const competitionsBox  = document.getElementById('competitionsList');
    const selectedMatchBox = document.getElementById('selectedMatch');
    const analyzeBtn       = document.getElementById('analyzeMatch');

    if (
        !apiKeyInput ||
        !dateInput ||
        !loadBtn ||
        !competitionsBox ||
        !selectedMatchBox ||
        !analyzeBtn
    ) {
        console.error('Erro: elementos do DOM não encontrados');
        return;
    }

    /* ======================
       SEGURANÇA BÁSICA DE INPUT
       ====================== */
    function sanitize(value) {
        return value.replace(/[<>]/g, '');
    }

    /* ======================
       API KEY
       ====================== */
    apiKeyInput.addEventListener('change', () => {
        const value = sanitize(apiKeyInput.value.trim());

        if (value.length < 10) {
            alert('API Key inválida');
            return;
        }

        NOX_STATE.apiKey = value;
        console.log('API Key definida');
    });

    /* ======================
       DATA
       ====================== */
    dateInput.addEventListener('change', () => {
        NOX_STATE.selectedDate = dateInput.value;
        console.log('Data selecionada:', NOX_STATE.selectedDate);
    });

    /* ======================
       CARREGAR COMPETIÇÕES
       ====================== */
    loadBtn.addEventListener('click', async () => {

        if (!NOX_STATE.apiKey || !NOX_STATE.selectedDate) {
            alert('Informe API Key e data');
            return;
        }

        competitionsBox.innerHTML = 'Carregando competições...';

        try {
            const competitions = await loadCompetitions(
                NOX_STATE.apiKey,
                NOX_STATE.selectedDate
            );

            renderCompetitions(competitions);

        } catch (err) {
            competitionsBox.innerHTML = 'Erro ao carregar competições';
            console.error('Erro loadCompetitions:', err);
        }
    });

    /* ======================
       RENDER COMPETIÇÕES
       ====================== */
    function renderCompetitions(data) {

        competitionsBox.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
            competitionsBox.innerHTML = 'Nenhuma competição encontrada';
            return;
        }

        data.forEach(country => {
            if (!country || !Array.isArray(country.matches)) return;

            const countryBlock = document.createElement('div');
            countryBlock.innerHTML = `<strong>${country.name}</strong>`;

            country.matches.forEach(match => {
                if (!match) return;

                const matchEl = document.createElement('div');
                matchEl.style.cursor = 'pointer';
                matchEl.innerText = `${match.time} - ${match.home} x ${match.away}`;

                matchEl.onclick = () => selectMatch(match);

                countryBlock.appendChild(matchEl);
            });

            competitionsBox.appendChild(countryBlock);
        });
    }

    /* ======================
       SELEÇÃO DA PARTIDA
       ====================== */
    function selectMatch(match) {
        NOX_STATE.selectedMatch = match;

        competitionsBox.innerHTML = '';
        selectedMatchBox.innerHTML = `
            Partida selecionada:<br>
            ${match.home} x ${match.away} – ${match.time}
        `;

        console.log('Partida selecionada:', match);
    }

    /* ======================
       ANALISAR (PAGAMENTO + CÁLCULO)
       ====================== */
    analyzeBtn.addEventListener('click', async () => {
if (NOX_PAY_LOCK) return;
       NOX_PAY_LOCK = true;
        if (!NOX_STATE.selectedMatch) {
            alert('Selecione uma partida');
           NOX_PAY_LOCK = false;
            return;
        }

        try {
            // NÃO TOCA NO DOM AINDA
// chama pagamento (wallet + contrato + backend)
const paid = await requestAnalysisRelease({ action: 'start' });

if (!paid) {
    alert('Pagamento não confirmado');
    NOX_PAY_LOCK = false;
    return;
}

// agora sim muda UI
analyzeBtn.innerText = 'Calculando...';
analyzeBtn.disabled = true;

            NOX_STATE.analysisUnlocked = true;
            analyzeBtn.innerText = 'Calculando...';

            const result = await runCalculator(
                NOX_STATE.apiKey,
                NOX_STATE.selectedMatch
            );
injectResults(result);

analyzeBtn.innerText = 'ANALISAR';
analyzeBtn.disabled = false;
NOX_PAY_LOCK = false;
            
        } catch (err) {
            console.error('Erro na análise:', err);
            analyzeBtn.innerText = 'ANALISAR';
           analyzeBtn.disabled = false;
           NOX_PAY_LOCK = false;
        }
    });

    /* ======================
       INJETAR RESULTADOS
       ====================== */
    function injectResults(result) {

        if (!result) return;

        const playersEl = document.querySelector('.result-card:nth-child(1) .result-data');
        const cornersEl = document.querySelector('.result-card:nth-child(2) .result-data');
        const cardsEl   = document.querySelector('.result-card:nth-child(3) .result-data');

        if (playersEl) playersEl.innerText = result.players ?? 'Sem dados';
        if (cornersEl) cornersEl.innerText = result.corners ?? 'Sem dados';
        if (cardsEl)   cardsEl.innerText   = result.cards ?? 'Sem dados';

        console.log('Resultados injetados');
    }

});
