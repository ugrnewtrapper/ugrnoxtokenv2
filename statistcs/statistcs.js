/* =============================
   BACKENDS (OK)
============================= */
const BACKEND_LIST = "https://backendnoxv2.srrimas2017.workers.dev";
const BACKEND_ANALYZE = "https://backendnoxv22.srrimas2017.workers.dev";

let selectedFixture = null;
let competitionsCache = [];

/* =============================
   HELPERS
============================= */
const safe = (v, msg = "❌ Não disponível neste plano") =>
  v === null || v === undefined ? msg : v;

/* =============================
   1) CARREGAR COMPETIÇÕES
   (BACKEND ANTIGO)
============================= */
async function loadCompetitions() {
  const apiKey = document.getElementById("apikey")?.value;
  const date = document.getElementById("date")?.value;

  if (!apiKey || !date) {
    alert("⚠️ Informe sua API Key e a data");
    return;
  }

  const leagueSelect = document.getElementById("leagueSelect");
  const fixtureSelect = document.getElementById("fixtureSelect");

  leagueSelect.innerHTML = `<option value="">⏳ Carregando competições...</option>`;
  fixtureSelect.innerHTML = `<option value="">Selecione a partida</option>`;

  const res = await fetch(BACKEND_LIST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, date })
  });

  const data = await res.json();

  if (!Array.isArray(data.competitions) || !data.competitions.length) {
    leagueSelect.innerHTML = `<option value="">❌ Nenhuma competição encontrada</option>`;
    return;
  }

  competitionsCache = data.competitions;

  let html = `<option value="">Selecione a competição</option>`;

  data.competitions.forEach((comp, idx) => {
    html += `<option value="${idx}">🏆 ${comp.league} • ${comp.country}</option>`;
  });

  leagueSelect.innerHTML = html;
}

/* =============================
   2) AO SELECIONAR COMPETIÇÃO
============================= */
document.getElementById("leagueSelect")?.addEventListener("change", e => {
  const idx = e.target.value;
  const fixtureSelect = document.getElementById("fixtureSelect");

  fixtureSelect.innerHTML = `<option value="">Selecione a partida</option>`;
  selectedFixture = null;

  if (!idx || !competitionsCache[idx]) return;

  competitionsCache[idx].matches.forEach(m => {
    fixtureSelect.innerHTML += `
      <option value="${m.fixtureId}">
        ⏰ ${m.time} • ${m.home} x ${m.away}
      </option>
    `;
  });
});

/* =============================
   3) AO SELECIONAR PARTIDA
============================= */
document.getElementById("fixtureSelect")?.addEventListener("change", e => {
  selectedFixture = e.target.value || null;

  const result = document.getElementById("results");
  if (selectedFixture && result) {
    result.innerHTML = `
      <h3>📌 Partida selecionada</h3>
      <p>${e.target.options[e.target.selectedIndex].text}</p>
    `;
  }
});

/* =============================
   4) ANALISAR PARTIDA
   (BACKEND NOVO / PREMIUM)
============================= */
async function analyzeMatch() {
  if (!selectedFixture) {
    alert("⚠️ Selecione uma partida");
    return;
  }

  const apiKey = document.getElementById("apikey")?.value;
  if (!apiKey) {
    alert("⚠️ Informe sua API Key");
    return;
  }

  const result = document.getElementById("results");
  if (result) result.innerHTML = "📊 Analisando dados Premium...";

  const res = await fetch(BACKEND_ANALYZE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      fixtureId: Number(selectedFixture)
    })
  });

  const data = await res.json();

  if (data.error) {
    result.innerHTML = "❌ " + data.error;
    return;
  }

  result.innerHTML = `
    <h3>${data.teams.home} x ${data.teams.away}</h3>
    <ul>
      <li>⚽ Artilheiro:
        <strong>${safe(data.players.topGoals?.player)}
        (${safe(data.players.topGoals?.value)})</strong>
      </li>
      <li>🎯 Assistências:
        <strong>${safe(data.players.topAssists?.player)}
        (${safe(data.players.topAssists?.value)})</strong>
      </li>
      <li>🥅 Chutes:
        <strong>${safe(data.players.topShots?.player)}
        (${safe(data.players.topShots?.value)})</strong>
      </li>
      <li>🟨 Moda de cartões:
        <strong>${safe(data.discipline.cardsMode)}</strong>
      </li>
      <li>🚩 Moda de escanteios:
        <strong>${safe(data.discipline.cornersMode)}</strong>
      </li>
    </ul>
    <p style="opacity:.8;font-size:14px;">
      ℹ️ Alguns dados podem não estar disponíveis conforme o plano.
    </p>
  `;
}

/* =============================
   BIND DOS BOTÕES
============================= */
document.getElementById("loadMatchesBtn")
  ?.addEventListener("click", loadCompetitions);

document.getElementById("analyzeBtn")
  ?.addEventListener("click", analyzeMatch);
