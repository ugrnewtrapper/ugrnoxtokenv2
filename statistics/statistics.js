/* =========================================================
 * statistics/statistics.js
 * Camada de estatísticas (FINAL)
 * =========================================================
 *
 * Responsabilidades:
 * - Consumir análise paga do backend
 * - Normalizar estrutura estatística
 * - Garantir leitura segura (cache / concorrência)
 * - NÃO lidar com pagamento ou blockchain
 *
 * Compatível com:
 * - backend/worker.js
 * - money/walletv12.js
 * =========================================================
 */

const Statistics = (() => {
  /* =============================
   CONFIG
  ============================= */
  const CFG = {
    backend: "https://backendv12.srrimas2017.workers.dev",
    timeout: 9000
  };

  /* =============================
   FETCH COM TIMEOUT
  ============================= */
  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), CFG.timeout);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  /* =============================
   CORE — GET ANALYSIS
  ============================= */
  async function getAnalysis({ apiKey, fixtureId, wallet, txHash }) {
    if (!apiKey || !fixtureId || !wallet || !txHash) {
      throw new Error("Parâmetros obrigatórios ausentes");
    }

    const res = await fetchWithTimeout(`${CFG.backend}/analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        fixtureId,
        wallet,
        txHash
      })
    });

    let payload;
    try {
      payload = await res.json();
    } catch {
      throw new Error("Resposta inválida do backend");
    }

    if (!res.ok) {
      throw new Error(payload?.error || "Erro ao obter análise");
    }

    return normalizeAnalysis(payload);
  }

  /* =============================
   NORMALIZAÇÃO
  ============================= */
  function normalizeAnalysis(payload) {
    const { cached, analysis } = payload;

    if (!analysis || typeof analysis !== "object") {
      throw new Error("Estrutura de análise inválida");
    }

    const teams = Object.entries(analysis).map(
      ([teamName, stats]) => ({
        team: teamName,
        topGoals: stats.topGoals || { value: 0, name: null },
        topAssists: stats.topAssists || { value: 0, name: null },
        topShots: stats.topShots || { value: 0, name: null },
        cornerMode: stats.cornerMode || { mode: 0, samples: 0 },
        cardMode: stats.cardMode || { mode: 0, samples: 0 }
      })
    );

    return {
      cached: Boolean(cached),
      teams,
      raw: analysis
    };
  }

  /* =============================
   UTILITÁRIOS DE LEITURA
  ============================= */
  function getTeam(analysisResult, teamName) {
    return analysisResult.teams.find(t => t.team === teamName) || null;
  }

  function listTeams(analysisResult) {
    return analysisResult.teams.map(t => t.team);
  }

  /* =============================
   API PÚBLICA
  ============================= */
  return {
    getAnalysis,
    getTeam,
    listTeams
  };
})();

export default Statistics;
