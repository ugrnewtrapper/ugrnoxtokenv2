const BACKEND = "https://backendnoxv22.srrimas2017.workers.dev";

let selectedFixture = null;

/* =============================
   HELPERS
============================= */
const safe = (v, msg = "❌ Não disponível neste plano") =>
  v === null || v === undefined ? msg : v;

/* =============================
   1) CARREGAR COMPETIÇÕES
============================= */
async function loadCompetitions() {
  const apiKey = document.getElementById("apikey")?.value
              || document.getElementById("apiKey")?.value;
  const date = document.getElementById("date")?.value;

  if (!apiKey || !date) {
    alert("⚠️ Informe sua API Key e a data");
    return;
  }

  const box = document.getElementById("competitions");
  if (box) box.innerHTML = "⏳ Carregando competições...";

  const res = await fetch(BACKEND, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, date })
  });

  const data = await res.json();

  if (!Array.isArray(data.competitions) || !data.competitions.length) {
    if (box) box.innerHTML = "❌ Nenhuma competição encontrada";
    return;
  }

  let html = "";

  data.competitions.forEach((comp, idx) => {
    html += `
      <div class="competition">
        <h3 onclick="toggleComp(${idx}, event)">
          🏆 ${comp.league} (${comp.country})
        </h3>
        <div class="matches" id="comp-${idx}">
    `;

    comp.matches.forEach(m => {
      html += `
        <div class="match"
             data-fixture="${m.fixtureId}"
             onclick="selectMatch(event, this)">
          ⏰ ${m.time} - ${m.home} x ${m.away}
        </div>
      `;
    });

    html += `</div></div>`;
  });

  if (box) box.innerHTML = html;
}

/* =============================
   2) TOGGLE COMPETIÇÃO
============================= */
function toggleComp(idx, event) {
  event.stopPropagation();
  const el = document.getElementById(`comp-${idx}`);
  if (!el) return;
  el.style.display = el.style.display === "none" ? "block" : "none";
}

/* =============================
   3) SELECIONAR PARTIDA
============================= */
function selectMatch(event, el) {
  event.stopPropagation();

  document.querySelectorAll(".match").forEach(m =>
    m.classList.remove("selected")
  );

  el.classList.add("selected");
  selectedFixture = el.dataset.fixture;

  const result = document.getElementById("results") || document.getElementById("result");
  if (result) {
    result.innerHTML = `
      <h3>📌 Partida selecionada</h3>
      <p>${el.innerText}</p>
    `;
  }

  document.querySelectorAll(".matches").forEach(m => {
    m.style.display = "none";
  });

  el.parentElement.style.display = "block";
}

/* =============================
   4) ANALISAR PARTIDA
============================= */
async function analyzeMatch() {
  if (!selectedFixture) {
    alert("⚠️ Selecione uma partida");
    return;
  }

  const apiKey = document.getElementById("apikey")?.value
              || document.getElementById("apiKey")?.value;

  if (!apiKey) {
    alert("⚠️ Informe sua API Key");
    return;
  }

  const result = document.getElementById("results") || document.getElementById("result");
  if (result) result.innerHTML = "📊 Analisando dados Premium...";

  const res = await fetch(BACKEND, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      fixtureId: Number(selectedFixture)
    })
  });

  const data = await res.json();

  if (data.error) {
    if (result) result.innerHTML = "❌ " + data.error;
    return;
  }

  let html = `
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

    <p style="opacity:.8; font-size:14px;">
      ℹ️ Alguns dados podem não estar disponíveis conforme o plano ou estatísticas da partida.
    </p>
  `;

  if (result) result.innerHTML = html;
}

/* =============================
   ✅ CORREÇÃO APLICADA
   BIND DOS BOTÕES
============================= */
document.getElementById("loadMatchesBtn")
  ?.addEventListener("click", loadCompetitions);

document.getElementById("analyzeBtn")
  ?.addEventListener("click", analyzeMatch);
