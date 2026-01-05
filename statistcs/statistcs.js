/* =============================
   BACKEND PREMIUM
============================= */
const BACKEND_ANALYZE = "https://backendnoxv22.srrimas2017.workers.dev";

let selectedFixture = null;

/* =============================
   SELECIONAR PARTIDA
   (CHAMADO PELO HTML)
============================= */
function selectMatch(el, event) {
  if (event) event.stopPropagation();

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
}

/* =============================
   ANALISAR PARTIDA
   (PREMIUM)
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

  if (!result) return;

  result.innerHTML = "📊 Analisando dados Premium...";

  try {
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
  } catch (err) {
    console.error(err);
    result.innerHTML = "❌ Erro ao buscar análise.";
  }
}

/* =============================
   BINDS PREMIUM
============================= */
const analyzeBtn = document.getElementById("analyzeBtn");
if (analyzeBtn) analyzeBtn.addEventListener("click", analyzeMatch);

/* =============================
   EXPOSIÇÃO GLOBAL
============================= */
window.selectMatch = selectMatch;
window.analyzeMatch = analyzeMatch;
