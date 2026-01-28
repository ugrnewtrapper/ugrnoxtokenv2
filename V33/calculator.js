/* =====================================================
   NOX PREMIUM – CALCULATOR V33
   VIP TRADER INTELLIGENCE LAYER
   ===================================================== */

const BACKEND_URL =
  'https://backendv12.srrimas2017.workers.dev/calculator';

const REQUEST_TIMEOUT = 15000;

/* =====================================================
   FUNÇÃO PRINCIPAL — CONTRATO IMUTÁVEL
   ===================================================== */

export async function runCalculator(apiKey, match) {

    try {

        validateInputs(apiKey, match);

        const payload = buildSecurePayload(match);

        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT
        );

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify(payload)
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error('Falha no backend');
        }

        const data = await response.json();

        const result = buildVIPAnalysis(data);

        injectResults(result);

        return result;

    } catch (err) {

        console.error('[NOX VIP]', err.message || err);

        injectResults({
            players: '⚠️ Erro ao processar jogadores',
            corners: '⚠️ Erro ao processar escanteios',
            cards:   '⚠️ Erro ao processar cartões'
        });

        return null;
    }
}

/* =====================================================
   SEGURANÇA
   ===================================================== */

function validateInputs(apiKey, match) {

    if (!apiKey || apiKey.length < 10)
        throw new Error('API Key inválida');

    if (!match || !Number.isInteger(match.fixtureId))
        throw new Error('Fixture inválida');
}

function buildSecurePayload(match) {

    return {
        fixtureId: match.fixtureId,
        home: sanitize(match.home),
        away: sanitize(match.away),
        league: sanitize(match.league),
        country: sanitize(match.country),
        txHash: sanitize(sessionStorage.getItem('nox_paid_tx')),
        timestamp: Date.now(),
        fingerprint: navigator.userAgent.slice(0, 120)
    };
}

function sanitize(v) {
    return String(v || '').replace(/[<>"]/g, '');
}

/* =====================================================
   VIP ANALYSIS ENGINE
   ===================================================== */

function buildVIPAnalysis(data) {

    const playersBlock = analyzePlayers(data.players);
    const cornersBlock = analyzeModa(data.corners, 'ESCANTEIOS');
    const cardsBlock   = analyzeModa(data.cards, 'CARTÕES');

    return {
        players: playersBlock,
        corners: cornersBlock,
        cards: cardsBlock
    };
}

/* ================= PLAYERS ================= */

function analyzePlayers(players) {

    if (!players) return 'Sem dados disponíveis';

    const goals   = top3(players.goals);
    const assists = top3(players.assists);
    const shots   = top3(players.shots);

    let text =
`🏆 ANÁLISE DE JOGADORES — PERFIL TRADER

⚽ GOLS
${formatRank(goals)}

🎯 ASSISTÊNCIAS
${formatRank(assists)}

🥅 CHUTES
${formatRank(shots)}

📊 INTERPRETAÇÃO
${interpretPlayers(goals, shots)}

🎯 SUGESTÃO TRADER
${suggestPlayers(goals)}
`;

    return text.trim();
}

function top3(list) {
    if (!Array.isArray(list)) return [];
    return [...list]
        .filter(p => p?.name && typeof p.value === 'number')
        .sort((a,b)=>b.value-a.value)
        .slice(0,3);
}

function formatRank(list) {
    if (!list.length) return 'Sem dados relevantes';
    return list.map((p,i)=>`${i+1}º ${p.name} — ${p.value}`).join('\n');
}

function interpretPlayers(goals, shots) {

    if (!goals.length || !shots.length)
        return 'Base estatística limitada para leitura ofensiva.';

    const g = goals[0].value;
    const s = shots[0].value;

    if (s >= g * 3)
        return 'Volume ofensivo alto. Tendência de criação constante.';
    if (g >= 2)
        return 'Conversão eficiente. Atacante em fase positiva.';
    return 'Ataque ativo porém dependente de contexto de jogo.';
}

function suggestPlayers(goals) {

    if (!goals.length)
        return 'Evitar mercados de artilharia individual.';

    if (goals[0].value >= 3)
        return 'Favorável a mercado de gol do jogador ou over individual.';
    
    return 'Acompanhar ao vivo para confirmação de tendência.';
}

/* ================= MODA ================= */

function analyzeModa(values, label) {

    if (!Array.isArray(values) || !values.length)
        return `${label}\nSem base estatística`;

    const freq = {};
    values.forEach(v => freq[v]=(freq[v]||0)+1);

    let max = 0;
    let moda = [];

    for (const k in freq) {
        if (freq[k] > max) {
            max = freq[k];
            moda = [k];
        } else if (freq[k] === max) {
            moda.push(k);
        }
    }

    const confidence = getConfidence(values.length, max);
    const probability = probabilityText(confidence);

    return `
📊 ${label} — ANÁLISE ESTATÍSTICA

Moda: ${moda.join(', ')}

Nível de confiança: ${confidence}%
Probabilidade: ${probability}

🧠 Interpretação:
${interpretModa(label, moda, probability)}

🎯 Sugestão trader:
${suggestModa(label, probability)}
`.trim();
}

/* ================= INTEL ================= */

function getConfidence(sample, freq) {
    const ratio = freq / sample;
    return Math.round(ratio * 100);
}

function probabilityText(conf) {
    if (conf >= 65) return 'ALTA';
    if (conf >= 45) return 'MÉDIA';
    return 'BAIXA';
}

function interpretModa(label, moda, prob) {

    if (prob === 'ALTA')
        return `${label} apresenta padrão recorrente. Tendência confiável.`;

    if (prob === 'MÉDIA')
        return `${label} com comportamento moderadamente repetitivo.`;

    return `${label} instável. Alta variação histórica.`;
}

function suggestModa(label, prob) {

    if (prob === 'ALTA')
        return `Mercado favorável para leitura pré-jogo.`;

    if (prob === 'MÉDIA')
        return `Ideal para entrada ao vivo com confirmação.`;

    return `Evitar exposição pré-jogo.`;
}

/* =====================================================
   INJEÇÃO
   ===================================================== */

function injectResults(result) {

    document.querySelector(
        '.result-card:nth-child(1) .result-data'
    ).innerText = result.players;

    document.querySelector(
        '.result-card:nth-child(2) .result-data'
    ).innerText = result.corners;

    document.querySelector(
        '.result-card:nth-child(3) .result-data'
    ).innerText = result.cards;

    console.log('NOX VIP TRADER — ANÁLISE ENTREGUE');
    }
