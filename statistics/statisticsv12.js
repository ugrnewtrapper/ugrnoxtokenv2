import { WalletV12 } from "./money/walletv12.js";

const API_BASE = "https://backendv12.srrimas2017.workers.dev";
const wallet = new WalletV12();

let state = {
  apiKey: null,
  date: null,
  fixtureId: null,
  paidFixtureId: null,
  locked: false
};

/* ================= DOM ================= */

const apiKeyInput = document.getElementById("apiKey");
const dateInput = document.getElementById("date");
const loadBtn = document.getElementById("loadCompetitions");
const competitionsEl = document.getElementById("competitions");
const fixturesEl = document.getElementById("fixtures");
const analyzeBtn = document.getElementById("analyze");
const outputEl = document.getElementById("output");

/* ================= HTTP ================= */

async function post(endpoint, body) {
  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error("[NETWORK] Falha de conexão");
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("[INVALID_RESPONSE] Resposta inválida");
  }

  if (!res.ok || json.error) {
    throw new Error(`[${json.code || "ERROR"}] ${json.message || "Erro"}`);
  }

  return json;
}

/* ================= UI ================= */

function clear(el) {
  el.innerHTML = "";
}

function errorOut(err) {
  outputEl.textContent = err.message;
}

/* ================= INPUT ================= */

apiKeyInput.addEventListener("change", e => {
  state.apiKey = e.target.value.trim();
});

dateInput.addEventListener("change", e => {
  state.date = e.target.value;
});

/* ================= FLOW ================= */

// Competicoes
loadBtn.addEventListener("click", async () => {
  try {
    if (!state.apiKey) throw new Error("API Key ausente");

    clear(competitionsEl);
    clear(fixturesEl);
    state.fixtureId = null;

    const res = await post("/api/competicoes", {
      apiKey: state.apiKey
    });

    res.data.forEach(c => {
      const btn = document.createElement("button");
      btn.textContent = c.league.name;
      btn.onclick = () => carregarPartidas(c.league.id);
      competitionsEl.appendChild(btn);
    });
  } catch (err) {
    errorOut(err);
  }
});

// Partidas
async function carregarPartidas(leagueId) {
  try {
    if (!state.date) throw new Error("Data não selecionada");

    clear(fixturesEl);
    state.fixtureId = null;

    const res = await post("/api/partidas", {
      apiKey: state.apiKey,
      date: state.date
    });

    res.data
      .filter(f => f.league.id === leagueId)
      .forEach(f => {
        const btn = document.createElement("button");
        btn.textContent = `${f.teams.home.name} x ${f.teams.away.name}`;
        btn.onclick = () => {
          if (state.locked) return;
          state.fixtureId = f.fixture.id;
        };
        fixturesEl.appendChild(btn);
      });
  } catch (err) {
    errorOut(err);
  }
}

// Analisar
analyzeBtn.addEventListener("click", async () => {
  if (state.locked) return;

  try {
    if (!state.apiKey) throw new Error("API Key ausente");
    if (!state.date) throw new Error("Data não selecionada");
    if (!state.fixtureId) throw new Error("Nenhuma partida selecionada");

    state.locked = true;
    state.paidFixtureId = state.fixtureId;

    await wallet.connect();
    const payment = await wallet.pay();

    if (state.paidFixtureId !== state.fixtureId) {
      throw new Error("Partida alterada após pagamento");
    }

    const res = await post("/api/analisar", {
      apiKey: state.apiKey,
      fixtureId: state.fixtureId,
      txHash: payment.txHash
    });

    outputEl.textContent = JSON.stringify(res, null, 2);
  } catch (err) {
    errorOut(err);
  } finally {
    state.locked = false;
    state.paidFixtureId = null;
  }
});
