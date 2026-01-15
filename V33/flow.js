/* =====================================================
   NOX PREMIUM – FLOW V33
   Função: Orquestrador principal
   ===================================================== */

import { loadCompetitions } from './competitions.js';
import { requestAnalysisRelease } from './release.js';
import { runCalculator } from './calculator.js';

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
const apiKeyInput        = document.getElementById('apiKey');
const dateInput          = document.getElementById('matchDate');
const loadBtn            = document.getElementById('loadCompetitions');
const competitionsBox    = document.getElementById('competitionsList');
const selectedMatchBox   = document.getElementById('selectedMatch');
const analyzeBtn         = document.getElementById('analyzeMatch');

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
});

/* ======================
   DATA
   ====================== */
dateInput.addEventListener('change', () => {
    NOX_STATE.selectedDate = dateInput.value;
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
        console.error(err);
    }
});

/* ======================
   RENDER COMPETIÇÕES
   ====================== */
function renderCompetitions(data) {

    competitionsBox.innerHTML = '';

    data.forEach(country => {
        const countryBlock = document.createElement('div');
        countryBlock.innerHTML = `<strong>${country.name}</strong>`;

        country.matches.forEach(match => {
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
}

/* ======================
   ANALISAR (PAGAMENTO + CÁLCULO)
   ====================== */
analyzeBtn.addEventListener('click', async () => {

    if (!NOX_STATE.selectedMatch) {
        alert('Selecione uma partida');
        return;
    }

    try {
        analyzeBtn.innerText = 'Aguardando pagamento...';

        const released = await requestAnalysisRelease();

        if (!released) {
            alert('Pagamento não confirmado');
            analyzeBtn.innerText = 'ANALISAR';
            return;
        }

        NOX_STATE.analysisUnlocked = true;

        analyzeBtn.innerText = 'Calculando...';

        const result = await runCalculator(
            NOX_STATE.apiKey,
            NOX_STATE.selectedMatch
        );

        injectResults(result);

        analyzeBtn.innerText = 'ANALISAR';

    } catch (err) {
        console.error(err);
        analyzeBtn.innerText = 'ANALISAR';
    }
});

/* ======================
   INJETAR RESULTADOS
   ====================== */
function injectResults(result) {

    document.querySelector('.result-card:nth-child(1) .result-data')
        .innerText = result.players;

    document.querySelector('.result-card:nth-child(2) .result-data')
        .innerText = result.corners;

    document.querySelector('.result-card:nth-child(3) .result-data')
        .innerText = result.cards;
}
