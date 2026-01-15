/* =====================================================
   NOX PREMIUM – COMPETITIONS V33
   Função: Buscar e organizar competições por data
   ===================================================== */

const BACKEND_URL = 'https://backendv12.srrimas2017.workers.dev/competitions.js';

/* ======================
   LOAD COMPETITIONS
   ====================== */
export async function loadCompetitions(apiKey, date) {

    if (!apiKey || !date) {
        throw new Error('API Key ou data ausente');
    }

    const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
        body: JSON.stringify({
            date: date
        })
    });

    if (!response.ok) {
        throw new Error('Erro ao consultar backend');
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.response)) {
        throw new Error('Resposta inválida do backend');
    }

    return normalizeCompetitions(data.response);
}

/* ======================
   NORMALIZAÇÃO DE DADOS
   ====================== */
function normalizeCompetitions(fixtures) {

    const countriesMap = {};

    fixtures.forEach(fixture => {

        const countryName = fixture.league?.country || 'Outros';

        if (!countriesMap[countryName]) {
            countriesMap[countryName] = {
                name: countryName,
                matches: []
            };
        }

        const match = {
            fixtureId: fixture.fixture.id,
            time: formatTime(fixture.fixture.date),
            home: fixture.teams.home.name,
            away: fixture.teams.away.name,
            league: fixture.league.name,
            country: countryName
        };

        countriesMap[countryName].matches.push(match);
    });

    return Object.values(countriesMap)
        .sort((a, b) => a.name.localeCompare(b.name));
}

/* ======================
   FORMATAR HORÁRIO
   ====================== */
function formatTime(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}
