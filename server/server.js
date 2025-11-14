// server/server.js
// Chatbot NFL:
//  - Conoce algunas reglas básicas (rule-based).
//  - Para cualquier otra cosa, usa SerpAPI para buscar.
//  - NO menciona que está buscando en internet.
//  - No usa PDF ni archivos locales ni OpenAI.
//
// Flujo:
//   1) Vacío / insultos / saludos.
//   2) Si la pregunta coincide con reglas básicas NFL -> responder con texto propio.
//   3) Si no, buscar con SerpAPI y responder con snippet + fuente (sin decir "según internet").
//   4) Si SerpAPI no ayuda, fallback NFL o genérico.

require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Servir frontend (public/)
app.use(express.static(path.join(__dirname, '..', 'public')));

// -------------------- Utilidades y patrones --------------------

function randomItem(arr) {
  if (!arr || arr.length === 0) return '';
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

// Saludos naturales
const greetingKeywords = [
  'hola',
  'holi',
  'holis',
  'hey',
  'buen dia',
  'buenos dias',
  'buenas tardes',
  'buenas noches',
  'que onda',
  'qué onda',
  'como estas',
  'cómo estás',
  'que tal',
  'qué tal',
  'hi',
  'hello'
];

const insultPatterns = [/idiota/i, /tonto/i, /est[uú]pido/i, /pendej/i];

const englishHint =
  /\b(what|how|why|when|who|where|rule|rules|game|player|points|score|touchdown|field goal)\b/i;

const greetingReplies = [
  '¡Hola! 😊 ¿Qué te gustaría saber de la NFL o del fútbol americano en general?',
  '¡Qué tal! Puedo ayudarte con dudas de la NFL, reglas, equipos, campeonatos o curiosidades.',
  '¡Hola! Estoy listo para hablar de fútbol americano. Pregúntame lo que quieras.',
  '¡Hola! Si quieres, podemos empezar por reglas básicas, equipos o historia de la NFL.'
];

const offTopicReplies = [
  'No tengo una respuesta exacta para eso, pero si te interesa la NFL puedo ayudarte con reglas, equipos y datos curiosos.',
  'Parece un tema interesante, aunque mi especialidad es la NFL. Si quieres, pregúntame algo de fútbol americano.',
  'No estoy seguro de ese tema, pero si cambias la pregunta hacia la NFL (reglas, equipos, campeonatos) con gusto te ayudo.',
  'No tengo mucha información de eso, pero sí puedo explicarte conceptos de la NFL como touchdowns, castigos o cómo funciona la temporada.'
];

const nflFallbackReplies = [
  'No tengo ese dato específico, pero recuerda que la NFL se organiza en dos conferencias (AFC y NFC), con 32 equipos que compiten por llegar al Super Bowl.',
  'No tengo una respuesta exacta para eso, pero en la NFL los equipos buscan ganar la temporada regular, clasificar a playoffs y llegar al Super Bowl.',
  'No tengo información precisa de ese punto, pero si me preguntas por reglas, castigos o equipos de la NFL, puedo explicarte con más detalle.'
];

// Saludo sí/no
function isGreeting(message) {
  const text = message.toLowerCase();
  return greetingKeywords.some((kw) => text.includes(kw));
}

// Clasificar si el tema parece NFL o no (para tono del fallback)
function classifyTopic(message) {
  const lower = message.toLowerCase();

  const nflKeywords = [
    'nfl',
    'super bowl',
    'futbol americano',
    'fútbol americano',
    'regla',
    'reglas',
    'castigo',
    'castigos',
    'equipo',
    'equipos',
    'touchdown',
    'gol de campo',
    'field goal',
    'yardas',
    'mariscal',
    'quarterback',
    'qb',
    'jugador',
    'jugadores',
    'temporada',
    'playoffs',
    'afc',
    'nfc',
    'linea de golpeo',
    'primero y diez',
    'primera y diez',
    '1ero y 10',
    'holding',
    'offside',
    'salida en falso',
    'interferencia de pase',
    'coach',
    'entrenador',
    'halftime',
    'medio tiempo'
  ];

  const isNFL = nflKeywords.some((kw) => lower.includes(kw));
  return isNFL ? 'nfl' : 'general';
}

// -------------------- Reglas básicas NFL (conocimiento propio del bot) --------------------

const quickRules = [
  {
    id: 'reglas_generales',
    patterns: [/reglas/i, /normas/i, /reglas basicas/i, /reglas básicas/i],
    answer:
      'Te resumo algunas reglas básicas de la NFL:\n\n' +
      '• El partido se divide en 4 cuartos de 15 minutos.\n' +
      '• La ofensiva tiene 4 intentos (downs) para avanzar al menos 10 yardas.\n' +
      '• Si avanzan esas 10 yardas, consiguen un “primero y diez” y tienen otros 4 intentos.\n' +
      '• El balón cambia de posesión cuando no consiguen el primero y diez, anota el rival o hay una patada de despeje.\n' +
      '• Hay distintos castigos (holding, offside, interferencia de pase, etc.) que mueven el balón a favor o en contra.'
  },
  {
    id: 'puntos',
    patterns: [/puntos/i, /anotar/i, /marcan puntos/i],
    answer:
      'En la NFL se puede anotar de varias formas:\n\n' +
      '• Touchdown: 6 puntos. Cuando un jugador entra a la zona de anotación con el balón o lo recibe dentro.\n' +
      '• Punto extra: 1 punto, pateando el balón entre los postes justo después de un touchdown.\n' +
      '• Conversión de 2 puntos: en lugar de patear, el equipo intenta una jugada desde cerca de la zona de anotación. Si entra, suma 2 puntos.\n' +
      '• Gol de campo (field goal): 3 puntos, pateando el balón entre los postes en una jugada normal.\n' +
      '• Safety: 2 puntos para la defensa, cuando la ofensiva es detenida con el balón dentro de su propia zona de anotación.'
  },
  {
    id: 'conversion',
    patterns: [/conversion/i, /conversi[oó]n de dos/i, /punto extra/i],
    answer:
      'Después de un touchdown, el equipo tiene una jugada especial de conversión:\n\n' +
      '• Si patea entre los postes (intento de punto extra), suma 1 punto.\n' +
      '• Si en lugar de patear hace una jugada ofensiva y logra entrar de nuevo a la zona de anotación, suma 2 puntos (conversión de 2 puntos).\n\n' +
      'El equipo elige si arriesgarse a ir por 2 puntos o asegurar casi siempre el punto extra de 1 punto.'
  },
  {
    id: 'primero_y_diez',
    patterns: [/primero y diez/i, /primera y diez/i, /1ero y 10/i],
    answer:
      '“Primero y diez” significa que la ofensiva tiene una nueva serie de 4 intentos para avanzar al menos 10 yardas.\n\n' +
      '• Si en esos 4 downs avanzan 10 yardas o más, consiguen otro “primero y diez”.\n' +
      '• Si no lo logran, normalmente el balón pasa al equipo rival.\n\n' +
      'Esta mecánica de downs y yardas es la base del avance en el fútbol americano.'
  },
  {
    id: 'holding',
    patterns: [/holding/i, /sujetar/i, /sujetand[oa]/i],
    answer:
      'El holding es un castigo por sujetar ilegalmente a un rival:\n\n' +
      '• Holding ofensivo: un jugador ofensivo agarra o jala a un defensor de forma ilegal para impedirle llegar a la jugada. Suele castigarse con 10 yardas.\n' +
      '• Holding defensivo: un defensor sujeta a un receptor u ofensivo para limitar su movimiento. Suele castigarse con 5 yardas y primer down automático para la ofensiva.'
  },
  {
    id: 'offside_false_start',
    patterns: [/offside/i, /fuera de lugar/i, /salida en falso/i, /false start/i],
    answer:
      'Son castigos relacionados con el inicio de la jugada:\n\n' +
      '• Offside: un defensor cruza la línea de golpeo antes del snap (cuando el balón se pone en movimiento). Normalmente son 5 yardas de castigo contra la defensa.\n' +
      '• Salida en falso (false start): un ofensivo se mueve de forma ilegal antes del snap. Son 5 yardas de castigo contra la ofensiva.'
  },
  {
    id: 'interferencia_pase',
    patterns: [/interferencia de pase/i, /pass interference/i],
    answer:
      'La interferencia de pase ocurre cuando un jugador contacta de forma ilegal a un receptor antes de que el balón llegue, impidiéndole hacer la recepción.\n\n' +
      '• Si es interferencia defensiva, normalmente se castiga con el balón para la ofensiva en el punto de la falta y un nuevo primero y diez.\n' +
      '• Si es interferencia ofensiva, se suele castigar con yardas en contra del equipo que estaba atacando.'
  }
];

function matchQuickNFLRule(message) {
  const text = message.toLowerCase();
  for (const rule of quickRules) {
    const match = rule.patterns.some((p) => p.test(text));
    if (match) return rule.answer;
  }
  return null;
}

// -------------------- SerpAPI: búsqueda web (primer resultado) --------------------

async function searchWeb(query) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    console.warn('SERPAPI_KEY no configurada, no se hará búsqueda web.');
    return null;
  }

  const url =
    'https://serpapi.com/search.json?engine=google&hl=es&gl=us' +
    '&q=' +
    encodeURIComponent(query) +
    '&api_key=' +
    apiKey;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    console.error('Error SerpAPI:', response.status, text);
    return null;
  }

  const data = await response.json();
  const results = data.organic_results || [];
  if (results.length === 0) return null;

  const r = results[0];

  return {
    title: r.title || 'Sin título',
    snippet: r.snippet || '',
    source: r.displayed_url || r.link || ''
  };
}

// -------------------- Endpoint principal /api/chat --------------------

app.post('/api/chat', async (req, res) => {
  const body = req.body || {};
  const rawMessage = (body.message || '').toString();
  const userMessage = rawMessage.trim();

  // 1) Vacío
  if (!userMessage) {
    return res.json({
      reply:
        'No recibí ningún texto. Escríbeme una duda sobre la NFL, el Super Bowl, jugadores o cualquier tema deportivo y te respondo.'
    });
  }

  const isLong = userMessage.length > 400;
  const seemsEnglish = englishHint.test(userMessage);
  const containsInsult = insultPatterns.some((pat) => pat.test(userMessage));

  let prefix = '';
  if (isLong) {
    prefix +=
      'Tu mensaje es bastante largo; me centraré en la parte más importante de tu pregunta. ';
  }
  if (seemsEnglish) {
    prefix += 'Parece que escribiste en inglés; responderé en español. ';
  }

  // 2) Insultos
  if (containsInsult) {
    return res.json({
      reply:
        'Entiendo que puedes estar molesto, pero mantengamos el respeto. ' +
        'Si quieres, pregúntame sobre la NFL o fútbol americano y con gusto te explico.'
    });
  }

  // 3) Saludos
  if (isGreeting(userMessage)) {
    return res.json({
      reply: randomItem(greetingReplies)
    });
  }

  // 4) Clasificar tema y ver si es NFL para los fallbacks
  const topic = classifyTopic(userMessage);

  // 5) Intentar primero reglas básicas internas
  const ruleAnswer = matchQuickNFLRule(userMessage);
  if (ruleAnswer) {
    return res.json({
      reply: prefix + ruleAnswer
    });
  }

  // 6) Si no hay regla interna, usar SerpAPI
  let webResult = null;
  try {
    webResult = await searchWeb(userMessage);
  } catch (err) {
    console.error('Error al buscar en la web (SerpAPI):', err.message);
  }

  if (webResult) {
    const { title, snippet, source } = webResult;

    let reply = prefix;

    if (snippet) {
      // Mostramos el snippet tal cual, sin decir "según internet"
      reply += snippet;
    } else {
      // Si no hay snippet, usamos el título.
      reply += `La referencia más clara que encontré es: "${title}".`;
    }

    if (source) {
      reply += `\n\nMás detalles en: ${source}`;
    }

    return res.json({ reply });
  }

  // 7) Fallback si SerpAPI tampoco ayuda
  if (topic === 'nfl') {
    return res.json({
      reply:
        prefix +
        randomItem(nflFallbackReplies) +
        '\n\nPuedes reformular la pregunta o enfocarla en reglas, equipos o campeonatos.'
    });
  }

  return res.json({
    reply:
      prefix +
      randomItem(offTopicReplies) +
      '\n\nSi quieres, también puedes preguntarme algo de la NFL.'
  });
});

// -------------------- Iniciar servidor --------------------

app.listen(PORT, () => {
  console.log('Servidor NFL Chatbot (reglas básicas + SerpAPI) en puerto', PORT);
});
