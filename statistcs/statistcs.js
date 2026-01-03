/* ===============================
   NOX Premium • Statistics v1.0
   Consome: backendnoxv22
   =============================== */

const API_URL = "https://backendnoxv22.srrimas2017.workers.dev/";

const apiKeyInput = document.getElementById("apikey");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultsBox = document.getElementById("results");
const paymentStatus = document.getElementById("paymentStatus");

/* ==================================================
   UTIL
   ================================================== */
const showStatus = msg => {
  paymentStatus.innerHTML = msg;
};

const showResults = html => {
  resultsBox.innerHTML = html;
};

/* ==================================================
   CHAMADA PRINCIPAL (1 análise = tudo)
   ================================================== */
async function runPremiumAnalysis(fixtureId) {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showResults("⚠️ Informe sua API Key da API-Football.");
    return;
  }

  showResults("⏳ Gerando análise Premium...");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        fixtureId
      })
    });

    const data = await res.json();

    /* ===== PLANO / DADOS INDISPONÍVEIS ===== */
    if (data.error) {
      showResults(`
        ❌ <strong>Análise indisponível</strong><br><br>
        ${data.error}<br><br>
        <small>
          Este dado pode não estar disponível para o plano atual
          ou para esta partida específica.
        </small>
      `);
      return;
    }

    renderPremiumData(data);

  } catch (e) {
    showResults("❌ Erro ao conectar com o servidor Premium.");
  }
}

/* ==================================================
   RENDER
   ================================================== */
function renderPremiumData(data) {
  const { teams, players, discipline } = data;

  const line = v =>
    v && v.player
      ? `<strong>${v.player}</strong> (${v.value})`
      : `<em>Não disponível para este plano</em>`;

  showResults(`
    <strong>📊 Análise Premium Completa</strong><br><br>

    <strong>⚔️ Partida</strong><br>
    ${teams.home} x ${teams.away}<br><br>

    <strong>👤 Jogadores (Destaques)</strong><br>
    ⚽ Mais gols: ${line(players.topGoals)}<br>
    🎯 Mais assistências: ${line(players.topAssists)}<br>
    🥅 Mais chutes: ${line(players.topShots)}<br><br>

    <strong>🟨 Disciplina & Jogo</strong><br>
    🟨 Moda de cartões: 
      ${discipline.cardsMode ?? "<em>Não disponível</em>"}<br>
    🚩 Moda de escanteios: 
      ${discipline.cornersMode ?? "<em>Não disponível</em>"}<br><br>

    <small>
      ✔️ Esta análise consumiu <strong>1 crédito Premium</strong>.
    </small>
  `);
}

/* ==================================================
   INTEGRAÇÃO COM O FLOW PREMIUM
   (wallet libera o botão analisar)
   ================================================== */
analyzeBtn.addEventListener("click", () => {
  const fixtureId = window.selectedFixtureId;

  if (!fixtureId) {
    showResults("⚠️ Selecione uma partida para analisar.");
    return;
  }

  runPremiumAnalysis(fixtureId);
});
