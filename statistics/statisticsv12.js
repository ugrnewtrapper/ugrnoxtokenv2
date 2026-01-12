import { WalletV12 } from "./money/walletv12.js";

export class statisticsv12 {
  constructor({ apiBaseUrl }) {
    if (!apiBaseUrl) {
      throw new Error("apiBaseUrl não definido"); // [C7]
    }

    this.apiBaseUrl = apiBaseUrl;
    this.wallet = new WalletV12();

    this.apiKey = null;
    this.selectedDate = null;
    this.selectedFixture = null;
    this.payment = null;
  }

  /* ============================================================
   * ETAPA 1 — API KEY
   * ============================================================
   */

  setApiKey(apiKey) {
    if (!apiKey) {
      throw new Error("API Key inválida");
    }
    this.apiKey = apiKey;
  }

  /* ============================================================
   * ETAPA 2 — DATA
   * ============================================================
   */

  setDate(date) {
    if (!date) {
      throw new Error("Data inválida");
    }
    this.selectedDate = date;
  }

  /* ============================================================
   * ETAPA 3 — COMPETIÇÕES
   * ============================================================
   */

  async loadCompetitions(country = null) {
    if (!this.apiKey) {
      throw new Error("API Key não definida");
    }

    const res = await fetch(`${this.apiBaseUrl}/api/competicoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: this.apiKey,
        country
      })
    });

    let data;
    try {
      data = await res.json(); // [C1]
    } catch {
      throw new Error("Resposta inválida do servidor");
    }

    if (data.version !== "v12") { // [C3]
      throw new Error("Versão incompatível da API");
    }

    if (!res.ok || data.error) {
      throw new Error(data.message || "Erro ao carregar competições");
    }

    if (!Array.isArray(data.data)) { // [C2]
      throw new Error("Formato inesperado de dados");
    }

    return data.data;
  }

  /* ============================================================
   * ETAPA 4 — PARTIDAS
   * ============================================================
   */

  async loadFixtures(timezone = "UTC") {
    if (!this.apiKey || !this.selectedDate) {
      throw new Error("API Key ou data não definida");
    }

    const res = await fetch(`${this.apiBaseUrl}/api/partidas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: this.apiKey,
        date: this.selectedDate,
        timezone
      })
    });

    let data;
    try {
      data = await res.json(); // [C1]
    } catch {
      throw new Error("Resposta inválida do servidor");
    }

    if (data.version !== "v12") { // [C3]
      throw new Error("Versão incompatível da API");
    }

    if (!res.ok || data.error) {
      throw new Error(data.message || "Erro ao carregar partidas");
    }

    if (!Array.isArray(data.data)) { // [C2]
      throw new Error("Formato inesperado de dados");
    }

    return data.data;
  }

  selectFixture(fixture) {
    const fixtureId = fixture?.fixture?.id;

    if (!Number.isInteger(fixtureId)) { // [C5]
      throw new Error("ID de partida inválido");
    }

    this.selectedFixture = fixture;
  }

  /* ============================================================
   * ETAPA 5 — PAGAMENTO
   * ============================================================
   */

  async payForAnalysis() {
    const user = await this.wallet.connect();
    if (!user) {
      throw new Error("Carteira não conectada");
    }

    const payment = await this.wallet.pay();

    if (!payment?.txHash) {
      throw new Error("Pagamento não confirmado");
    }

    this.payment = payment;
    return payment;
  }

  /* ============================================================
   * ETAPA 6 — ANÁLISE
   * ============================================================
   */

  async runAnalysis() {
    if (!this.payment?.txHash) {
      throw new Error("Pagamento não realizado");
    }

    if (!this.selectedFixture) {
      throw new Error("Partida não selecionada");
    }

    const res = await fetch(`${this.apiBaseUrl}/api/analisar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: this.apiKey,
        fixtureId: this.selectedFixture.fixture.id,
        txHash: this.payment.txHash
      })
    });

    let data;
    try {
      data = await res.json(); // [C1]
    } catch {
      throw new Error("Resposta inválida do servidor");
    }

    if (data.version !== "v12") { // [C3]
      throw new Error("Versão incompatível da API");
    }

    if (data.code === "REPLAY") { // [C6]
      throw new Error("Este pagamento já foi utilizado");
    }

    if (!res.ok || data.error) {
      throw new Error(data.message || "Erro ao executar análise");
    }

    this.payment = null; // [C4]

    return data;
  }
}
