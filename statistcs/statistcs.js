/* =============================
   BACKENDS
============================= */
const BACKEND_LIST = "https://backendnoxv2.srrimas2017.workers.dev";      // antigo
const BACKEND_ANALYZE = "https://backendnoxv22.srrimas2017.workers.dev"; // novo

let selectedFixture = null;

/* =============================
   CARREGAR COMPETIÇÕES
   (BACKEND ANTIGO)
============================= */
async function loadCompetitions() {
  const apiKey = document.getElementById("apikey")?.value
              || document.getElementById("apiKey")?.value;
  const date = document.getElementById("date")?.value;

  if (!apiKey || !date) {
    alert("⚠️ Informe API Key e data");
    return;
  }

  const box = document.getElementById("competitions");
  box.innerHTML = "⏳ Carregando competições...";

  const res = await fetch(BACKEND_LIST, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, date })
  });

  const data = await res.json();

  if (!Array.isArray(data.competitions) || !data.competitions.length) {
    box.innerHTML = "❌ Nenhuma competição encontrada";
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

  box.innerHTML = html;
}

/* =============================
   TOGGLE COMPETIÇÃO
============================= */
function toggleComp(idx, event) {
  event.stopPropagation();
  const el = document.getElementById(`comp-${idx}`);
  el.style.display = el.style.display === "none" ? "block" : "none";
}

/* =============================
   SELECIONAR PARTIDA
============================= */
function selectMatch(event, el) {
  event.stopPropagation();

  document.querySelectorAll(".match").forEach(m =>
    m.classList.remove("selected")
  );

  el.classList.add("selected");
  selectedFixture = el.dataset.fixture;

  const result = document.getElementById("results") 
              || document.getElementById("result");

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
   ANALISAR PARTIDA
   (BACKEND NOVO / PREMIUM)
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

  const result = document.getElementById("results")
              || document.getElementById("result");

  result.innerHTML = "📊 Analisando dados Premium...";

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
        <strong>${data.players?.topGoals?.player || "—"}
        (${data.players?.topGoals?.value || "—"})</strong>
      </li>
      <li>🎯 Assistências:
        <strong>${data.players?.topAssists?.player || "—"}
        (${data.players?.topAssists?.value || "—"})</strong>
      </li>
      <li>🥅 Chutes:
        <strong>${data.players?.topShots?.player || "—"}
        (${data.players?.topShots?.value || "—"})</strong>
      </li>
      <li>🟨 Moda de cartões:
        <strong>${data.discipline?.cardsMode || "—"}</strong>
      </li>
      <li>🚩 Moda de escanteios:
        <strong>${data.discipline?.cornersMode || "—"}</strong>
      </li>
    </ul>
  `;
}

/* =============================
   BINDS
============================= */
document.getElementById("loadMatchesBtn")
  ?.addEventListener("click", loadCompetitions);

document.getElementById("analyzeBtn")
  ?.addEventListener("click", analyzeMatch);
