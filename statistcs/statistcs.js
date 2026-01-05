/* =============================
   BACKEND PREMIUM
============================= */
const BACKEND_ANALYZE = "https://backendnoxv22.srrimas2017.workers.dev";

/* =============================
   STATE GLOBAL CONTROLADO
============================= */
window.selectedFixture = null;
let analysisConsumed = false; // garante 1 pagamento = 1 análise

/* =============================
   SELECIONAR PARTIDA
   (CHAMADO PELO HTML)
============================= */
function selectMatch(event, el) {
  if (event) event.stopPropagation();

  document.querySelectorAll(".match").forEach(m =>
    m.classList.remove("selected")
  );

  el.classList.add("selected");
  window.selectedFixture = el.dataset.fixture;

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
async function analyzeMatch(force = false) {

  // 🔒 garante que só rode após pagamento
  if (!force && analysisConsumed) {
    alert("⚠️ Esta análise já foi consumida.");
    return;
  }

  if (!window.selectedFixture) {
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
        fixtureId: Number(window.selectedFixture)
      })
    });

    const data = await res.json();

    if (data.error) {
      result.innerHTML = "❌ " + data.error;
      return;
    }

    // ✅ consome a análise
    analysisConsumed = true;

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
   EVENTO DE PAGAMENTO (1x)
============================= */
window.addEventListener("nox-payment-ok", () => {
  analysisConsumed = false; // libera exatamente 1 análise
  analyzeMatch(true);       // força execução apenas via pagamento
});

/* =============================
   BINDS PREMIUM
============================= */
const analyzeBtn = document.getElementById("analyzeBtn");
if (analyzeBtn) {
  analyzeBtn.addEventListener("click", () => {
    alert("⚠️ Efetue o pagamento Premium para liberar a análise.");
  });
}

/* =============================
   EXPOSIÇÃO GLOBAL
============================= */
window.selectMatch = selectMatch;
window.analyzeMatch = analyzeMatch;
