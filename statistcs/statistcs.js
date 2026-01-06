/* statistics/statistics.js */
(function () {
  'use strict';

  /* =======================
     ESTADO INTERNO (MEMÓRIA)
     ======================= */
  let selectedFixtureId = null;
  let analysisUnlocked = false;

  /* =======================
     ELEMENTOS DO DOM
     ======================= */
  document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const matchDateInput = document.getElementById('matchDate');
    const loadCompetitionsBtn = document.getElementById('loadCompetitionsBtn');
    const competitionsContainer = document.getElementById('competitionsContainer');
    const selectedMatchEl = document.getElementById('selectedMatch');
    const analyzeBtn = document.getElementById('analyzeBtn');

    const resultPlayers = document.getElementById('resultPlayers');
    const resultCards = document.getElementById('resultCards');
    const resultCorners = document.getElementById('resultCorners');

    /* =======================
       VALIDAÇÕES BÁSICAS
       ======================= */
    function validateApiKey() {
      const key = apiKeyInput.value.trim();
      if (!key) {
        throw new Error('API Key inválida ou não informada.');
      }
      return key;
    }

    function validateDate() {
      const date = matchDateInput.value;
      if (!date) {
        throw new Error('Data inválida ou não selecionada.');
      }
      return date;
    }

    /* =======================
       LIMPEZAS
       ======================= */
    function clearCompetitions() {
      competitionsContainer.innerHTML = '';
      competitionsContainer.style.display = 'none';
    }

    function clearResults() {
      resultPlayers.innerHTML = '';
      resultCards.innerHTML = '';
      resultCorners.innerHTML = '';
    }

    /* =======================
       LISTAGEM GRATUITA
       ======================= */
    loadCompetitionsBtn.addEventListener('click', async () => {
      try {
        clearCompetitions();
        selectedMatchEl.textContent = '';
        analyzeBtn.disabled = true;
        selectedFixtureId = null;
        analysisUnlocked = false;

        const apiKey = validateApiKey();
        const date = validateDate();

        const response = await fetch(
          'https://backendnoxv22.srrimas2017.workers.dev/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey
            },
            body: JSON.stringify({ date })
          }
        );

        if (!response.ok) {
          throw new Error('Erro ao buscar competições.');
        }

        const data = await response.json();

        if (!data || !Array.isArray(data.fixtures) || data.fixtures.length === 0) {
          competitionsContainer.innerHTML =
            '<div class="status">Nenhuma partida encontrada para esta data.</div>';
          competitionsContainer.style.display = 'block';
          return;
        }

        competitionsContainer.style.display = 'block';

        data.fixtures.forEach(fixture => {
          const card = document.createElement('div');
          card.className = 'competition-card';
          card.dataset.fixtureId = fixture.fixtureId;

          const title = document.createElement('div');
          title.className = 'competition-title';
          title.textContent = `${fixture.home} x ${fixture.away}`;

          const country = document.createElement('div');
          country.className = 'competition-country';
          country.textContent = `${fixture.league} • ${fixture.country}`;

          card.appendChild(title);
          card.appendChild(country);

          card.addEventListener('click', () => {
            selectedFixtureId = fixture.fixtureId;
            selectedMatchEl.textContent = `${fixture.home} x ${fixture.away}`;
            analyzeBtn.disabled = false;
          });

          competitionsContainer.appendChild(card);
        });

      } catch (err) {
        clearCompetitions();
        throw err;
      }
    });

    /* =======================
       FUNÇÃO GLOBAL – ANÁLISE
       ======================= */
    window.runAnalysis = async function () {
      if (!analysisUnlocked) {
        throw new Error('Análise bloqueada. Pagamento não confirmado.');
      }

      if (!selectedFixtureId) {
        throw new Error('Nenhuma partida selecionada.');
      }

      clearResults();

      const apiKey = validateApiKey();

      const response = await fetch(
        'https://backendnoxv22.srrimas2017.workers.dev/worker2',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify({ fixtureId: selectedFixtureId })
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao executar análise paga.');
      }

      const data = await response.json();

      if (!data || !data.players || !data.cards || !data.corners) {
        throw new Error('Resposta de análise inválida.');
      }

      /* =======================
         CÁLCULOS
         ======================= */
      function calculateMode(arr) {
        const count = {};
        arr.forEach(v => count[v] = (count[v] || 0) + 1);
        return Object.keys(count).reduce((a, b) =>
          count[a] > count[b] ? a : b
        );
      }

      const topPlayers = data.players.slice(0, 5);
      const cardMode = calculateMode(data.cards);
      const cornerMode = calculateMode(data.corners);

      /* =======================
         RENDERIZAÇÃO
         ======================= */
      topPlayers.forEach(p => {
        const div = document.createElement('div');
        div.textContent = `${p.name} (${p.team})`;
        resultPlayers.appendChild(div);
      });

      const cardsDiv = document.createElement('div');
      cardsDiv.textContent = `Moda: ${cardMode}`;
      resultCards.appendChild(cardsDiv);

      const cornersDiv = document.createElement('div');
      cornersDiv.textContent = `Moda: ${cornerMode}`;
      resultCorners.appendChild(cornersDiv);
    };

    /* =======================
       LIBERAÇÃO PÓS-PAGAMENTO
       ======================= */
    window.unlockAnalysis = function () {
      analysisUnlocked = true;
    };

  });
})();
