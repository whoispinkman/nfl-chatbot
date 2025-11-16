// server/server.js
// Backend del chatbot NFL: Express + reglas internas + SerpAPI (solo NFL)

require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// Middleware y archivos estáticos
// ==============================
app.use(express.json());

// Servir la carpeta "public" (index.html, css, js, etc.)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ==============================
// Utilidades de texto
// ==============================
function normalizeText(text) {
  return (text || '').toString().trim();
}

// ==============================
// Clasificación de tema (NFL / no NFL)
// ==============================
const nflKeywords = [
  'nfl',
  'fútbol americano',
  'futbol americano',
  'super bowl',
  'superbowl',
  'touchdown',
  'field goal',
  'gol de campo',
  'safety',
  'primero y diez',
  '1ro y 10',
  'quarterback',
  'mariscal de campo',
  'linebacker',
  'receiver',
  'wide receiver',
  'running back',
  'patriots',
  'patriotas',
  'cowboys',
  'steelers',
  'packers',
  'chiefs',
  'eagles',
  '49ers',
  'jets',
  'giants',
  'raiders',
  'broncos',
  'bills',
  'ravens',
  'bengals',
  'browns',
  'vikings',
  'seahawks',
  'buccaneers',
  'bucs',
  // puedes agregar más equipos o palabras relacionadas
];

function classifyTopic(messageLower) {
  const text = messageLower.toLowerCase();
  const hasNFL = nflKeywords.some((kw) => text.includes(kw));
  return hasNFL ? 'nfl' : 'non-nfl';
}

// ==============================
// Detección de saludos e insultos
// ==============================
const greetingKeywords = [
  'hola',
  'holis',
  'holaa',
  'buenas',
  'buenos días',
  'buenas tardes',
  'buenas noches',
  'que onda',
  'qué onda',
  'hey',
  'hi',
  'hello'
];

function isGreeting(messageLower) {
  return greetingKeywords.some((g) => messageLower.includes(g));
}

const insultPatterns = [
  /idiota/i,
  /tonto/i,
  /estúpido/i,
  /pendejo/i,
  /imbécil/i,
  /menso/i,
  /no sirves/i
];

function containsInsult(messageLower) {
  return insultPatterns.some((re) => re.test(messageLower));
}

// ==============================
// Reglas internas rápidas sobre NFL
// ==============================

const quickRules = [
  {
    id: 'reglas_basicas',
    patterns: [
      /reglas básicas/i,
      /reglas de la nfl/i,
      /cómo se juega la nfl/i,
      /explica la nfl/i
    ],
    answer:
      'Un partido de la NFL se juega entre dos equipos de 11 jugadores en el campo. ' +
      'El objetivo es avanzar el balón por el campo hasta la zona de anotación del rival. ' +
      'Cada equipo dispone de cuatro intentos (downs) para avanzar al menos 10 yardas; si lo logra, obtiene un nuevo primero y diez. ' +
      'El partido se divide en cuatro cuartos de 15 minutos, con una pausa más larga en el medio tiempo.'
  },
  {
    id: 'puntos',
    patterns: [
      /anotar puntos/i,
      /puntos en la nfl/i,
      /formas de anotar/i,
      /cómo se anotan puntos/i,
      /touchdown/i,
      /field goal/i,
      /gol de campo/i,
      /safety/i
    ],
    answer:
      'En la NFL se pueden anotar puntos de varias formas: un touchdown vale 6 puntos y se consigue llevando el balón a la zona de anotación rival o atrapándolo dentro de ella. ' +
      'Después de un touchdown, el equipo puede patear un punto extra (1 punto) o intentar una conversión de dos puntos desde la yarda 2. ' +
      'Un gol de campo (field goal) vale 3 puntos y se logra pateando el balón entre los postes. ' +
      'Un safety vale 2 puntos y ocurre cuando la defensa derriba al rival con el balón dentro de su propia zona de anotación.'
  },
  {
    id: 'conversion',
    patterns: [
      /conversión de dos puntos/i,
      /conversión de 2 puntos/i,
      /intento de dos puntos/i,
      /punto extra/i
    ],
    answer:
      'Después de un touchdown, el equipo anotador puede elegir entre patear un punto extra (1 punto) o intentar una conversión de dos puntos. ' +
      'En la conversión de dos puntos, la ofensiva tiene una sola jugada desde la línea cercana a la zona de anotación (generalmente la yarda 2) para volver a entrar con el balón a la end zone. ' +
      'Si lo logra, obtiene 2 puntos adicionales; si falla, no suma puntos extra.'
  },
  {
    id: 'primero_y_diez',
    patterns: [
      /primero y diez/i,
      /1ro y 10/i,
      /primer down/i,
      /primer y diez/i
    ],
    answer:
      'El concepto de primero y diez en la NFL indica que la ofensiva tiene cuatro intentos (downs) para avanzar al menos 10 yardas desde el punto de inicio de la serie. ' +
      'Si en esos cuatro intentos avanza las 10 yardas o más, se le concede un nuevo primero y diez y la cuenta de downs se reinicia. ' +
      'Si no logra avanzar lo suficiente, normalmente entrega el balón al otro equipo, ya sea por despeje (punt) o porque se quedó corto en cuarto down.'
  },
  {
    id: 'holding',
    patterns: [
      /holding/i,
      /sujeci[oó]n/i,
      /agarrar la camiseta/i
    ],
    answer:
      'El holding es un castigo que ocurre cuando un jugador sujeta ilegalmente a un oponente para impedirle avanzar. ' +
      'En la ofensiva, suele marcarse cuando un liniero ofensivo agarra o jala a un defensor fuera de las zonas permitidas, lo que normalmente implica una penalización de 10 yardas desde el punto de la falta. ' +
      'En la defensa, también puede sancionarse si se impide de forma ilegal el movimiento de un jugador elegible para recibir pase.'
  },
  {
    id: 'offside_false_start',
    patterns: [
      /offside/i,
      /fuera de lugar/i,
      /salida en falso/i,
      /false start/i
    ],
    answer:
      'El offside (fuera de lugar) se marca cuando un jugador defensivo cruza la línea de golpeo antes de que inicie la jugada y obtiene ventaja indebida. ' +
      'La salida en falso (false start) se marca cuando un jugador ofensivo se mueve de forma ilegal antes del inicio de la jugada, simulando el snap. ' +
      'Ambos castigos suelen penalizarse con 5 yardas en contra del equipo infractor.'
  },
  {
    id: 'interferencia_pase',
    patterns: [
      /interferencia de pase/i,
      /pass interference/i
    ],
    answer:
      'La interferencia de pase ocurre cuando un jugador impide de manera ilegal que un receptor tenga la oportunidad de atrapar un pase. ' +
      'En la interferencia defensiva, se sanciona a la defensa por sujetar, empujar o cubrir al receptor antes de que el balón llegue, y generalmente la penalización lleva el balón al lugar de la falta y concede primero y diez automático. ' +
      'La interferencia ofensiva se marca cuando el receptor u otro jugador ofensivo empuja o bloquea ilegalmente al defensivo para crear una ventaja, y suele penalizarse con 10 yardas contra la ofensiva.'
  },
  {
    id: 'tiempos_fuera',
    patterns: [
      /tiempos? fuera/i,
      /timeout/i
    ],
    answer:
      'Cada equipo en la NFL dispone de tres tiempos fuera por mitad para detener el reloj y reagruparse. ' +
      'Los tiempos fuera se usan para administrar el reloj de juego, cambiar la estrategia o evitar penalizaciones por retraso de juego. ' +
      'Una vez usados los tres tiempos fuera en esa mitad, el equipo ya no puede detener el reloj de esta forma hasta la siguiente mitad.'
  },
  {
    id: 'duracion_partido',
    patterns: [
      /cuánto dura un partido/i,
      /duración del partido/i,
      /cuartos de la nfl/i
    ],
    answer:
      'Un partido de la NFL se divide en cuatro cuartos de 15 minutos cada uno, con un descanso m\'as largo en el medio tiempo (entre el segundo y el tercer cuarto). ' +
      'El reloj se detiene en diversas situaciones, como pases incompletos, jugadas que terminan fuera del campo, castigos y tiempos fuera. ' +
      'Por eso, la duraci\'on real de un partido suele rondar entre dos y tres horas.'
  },
  {
    id: 'playoffs_superbowl',
    patterns: [
      /playoffs/i,
      /postemporada/i,
      /super bowl/i,
      /superbowl/i
    ],
    answer:
      'Los playoffs de la NFL son la fase de postemporada donde los mejores equipos de cada conferencia compiten en formato de eliminación directa. ' +
      'Los ganadores de la Conferencia Americana (AFC) y la Conferencia Nacional (NFC) se enfrentan en el Super Bowl, que es el partido final por el campeonato. ' +
      'El Super Bowl es uno de los eventos deportivos y medi\'aticos m\'as importantes del mundo.'
  }
];

function matchQuickNFLRule(messageLower) {
  for (const rule of quickRules) {
    if (rule.patterns.some((re) => re.test(messageLower))) {
      return rule.answer;
    }
  }
  return null;
}

// ==============================
// Helper: construir respuesta de SerpAPI (200–400 caracteres)
// ==============================
function construirRespuestaSerp(organicResults = []) {
  if (!Array.isArray(organicResults) || organicResults.length === 0) {
    return null;
  }

  // Tomamos hasta los 3 primeros resultados para tener más texto
  const top = organicResults.slice(0, 3);

  const snippets = top
    .map((r) => r.snippet)
    .filter((s) => typeof s === 'string' && s.trim().length > 0);

  const titles = top
    .map((r) => r.title)
    .filter((t) => typeof t === 'string' && t.trim().length > 0);

  const mainLink =
    (top[0] && (top[0].link || top[0].source || '')) || '';

  // 1) Combinamos snippets (o títulos si no hay snippets)
  let combined = '';
  if (snippets.length) {
    combined = snippets.join(' ');
  } else if (titles.length) {
    combined = titles.join('. ');
  } else {
    return null;
  }

  // 2) Limpiar espacios y "..."
  combined = combined
    .replace(/\.{3,}/g, '')   // quitar "..."
    .replace(/\s+/g, ' ')     // colapsar espacios
    .trim();

  if (!combined) return null;

  const original = combined;
  let text = combined;

  const MAX_LEN = 400;
  const MIN_LEN = 200;

  // 3) Si es demasiado largo, recortamos a 400 intentando cerrar en punto
  if (text.length > MAX_LEN) {
    text = text.slice(0, MAX_LEN);

    const lastPunct = Math.max(
      text.lastIndexOf('.'),
      text.lastIndexOf('!'),
      text.lastIndexOf('?')
    );

    if (lastPunct >= MIN_LEN) {
      text = text.slice(0, lastPunct + 1);
    }
  }

  // 4) Si quedó muy corto, pero el original era largo, extendemos un poco
  if (text.length < MIN_LEN && original.length >= MIN_LEN) {
    text = original.slice(0, Math.min(MAX_LEN, original.length));
  }

  // 5) Agregar link solo si cabe razonablemente
  if (mainLink && text.length < 360) {
    const withLink = `${text} Más detalles en: ${mainLink}`;
    text = withLink.length <= MAX_LEN ? withLink : text;
  }

  return text;
}

// ==============================
// Búsqueda web con SerpAPI RESTRINGIDA A NFL
// ==============================
async function searchWebNFL(query) {
  if (!process.env.SERPAPI_KEY) {
    console.warn('SERPAPI_KEY no configurada en .env');
    return null;
  }

  // Forzamos contexto NFL en la consulta
  const nflQuery = `NFL ${query}`;

  const url =
    `https://serpapi.com/search.json` +
    `?q=${encodeURIComponent(nflQuery)}` +
    `&hl=es&api_key=${process.env.SERPAPI_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Error HTTP en SerpAPI:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const organic = data.organic_results || [];
    if (!organic.length) return null;

    const answer = construirRespuestaSerp(organic);
    if (!answer) return null;

    return { answer };
  } catch (err) {
    console.error('Error al llamar a SerpAPI:', err);
    return null;
  }
}

// ==============================
// Endpoint principal del chatbot
// ==============================
app.post('/api/chat', async (req, res) => {
  const rawMessage = req.body.message;
  const userMessage = normalizeText(rawMessage);

  if (!userMessage) {
    return res.json({
      reply:
        'Por favor escribe algo sobre la NFL y con gusto te respondo. ' +
        'Por ejemplo: “¿Cómo se anotan puntos?” o “¿Qué es un primero y diez?”.'
    });
  }

  const lower = userMessage.toLowerCase();

  // 1) Insultos
  if (containsInsult(lower)) {
    return res.json({
      reply:
        'Entiendo que puedas estar molesto, pero mantengamos el respeto. ' +
        'Puedo ayudarte con reglas, equipos, campeonatos y datos curiosos de la NFL si quieres.'
    });
  }

  // 2) Saludos
  if (isGreeting(lower)) {
    return res.json({
      reply:
        'Hola, ¿sobre qué aspecto de la NFL te gustaría saber? ' +
        'Puedo explicarte reglas de juego, equipos, Super Bowl o campeonatos.'
    });
  }

  // 3) Clasificar tema: NFL o no NFL
  const topic = classifyTopic(lower);

  if (topic !== 'nfl') {
    // NO se usa SerpAPI para temas fuera de NFL
    return res.json({
      reply:
        'Por ahora solo puedo responder preguntas relacionadas con la NFL y el fútbol americano profesional. ' +
        'Intenta preguntarme sobre reglas de juego, equipos, Super Bowl o campeonatos.'
    });
  }

  // 4) Intentar responder con reglas internas rápidas
  const ruleAnswer = matchQuickNFLRule(lower);
  if (ruleAnswer) {
    return res.json({ reply: ruleAnswer });
  }

  // 5) Si no hay regla interna, usamos SerpAPI CON CONTEXTO NFL
  try {
    const serpResult = await searchWebNFL(userMessage);
    if (serpResult && serpResult.answer) {
      // Ya viene con longitud aproximada 200–400 caracteres
      return res.json({ reply: serpResult.answer });
    }
  } catch (err) {
    console.error('Error en búsqueda NFL + SerpAPI:', err);
  }

  // 6) Fallback si nada funcionó
  return res.json({
    reply:
      'No encontré una respuesta exacta para esa pregunta, pero si quieres puedo explicarte reglas básicas como ' +
      'cómo se anotan puntos, qué es un primero y diez o cuáles son los castigos más comunes en la NFL.'
  });
});

// ==============================
// Arranque del servidor
// ==============================
app.listen(PORT, () => {
  console.log(`Servidor NFL chatbot escuchando en http://localhost:${PORT}`);
});
