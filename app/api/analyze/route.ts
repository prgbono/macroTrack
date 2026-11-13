import { NextResponse } from 'next/server';
import { searchUSDAFoods } from '@/lib/usda';

export const runtime = 'nodejs';
const MAX_BYTES = 8 * 1024 * 1024;
const GEMINI_MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
const foodSchema = {
  type: 'OBJECT',
  properties: {
    foods: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          usdaSearchTerm: { type: 'STRING' },
          estimatedGrams: { type: 'NUMBER' },
          fallbackMacrosPer100g: {
            type: 'OBJECT',
            properties: {
              protein: { type: 'NUMBER' },
              fat: { type: 'NUMBER' },
              carbs: { type: 'NUMBER' },
              calories: { type: 'NUMBER' },
            },
            required: ['protein', 'fat', 'carbs', 'calories'],
          },
        },
        required: ['name', 'usdaSearchTerm', 'estimatedGrams', 'fallbackMacrosPer100g'],
      },
    },
  },
  required: ['foods'],
};

type GeminiFood = {
  name?: unknown;
  usdaSearchTerm?: unknown;
  estimatedGrams?: unknown;
  fallbackMacrosPer100g?: { protein?: unknown; fat?: unknown; carbs?: unknown; calories?: unknown };
};
function boundedNumber(value: unknown, max: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(0, number)) : 0;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Falta GEMINI_API_KEY. Añádela a .env.local y reinicia la app.' }, { status: 503 });

  let body: { mimeType?: unknown; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'La solicitud no contiene un JSON válido.' }, { status: 400 });
  }

  const mimeType = body?.mimeType;
  const data = body?.data;
  if (typeof data !== 'string' || typeof mimeType !== 'string' || !allowed.has(mimeType)) {
    return NextResponse.json({ error: 'Sube una foto JPG, PNG o WebP válida.' }, { status: 400 });
  }
  const base64 = data.replace(/^data:[^;]+;base64,/, '');
  if (!base64 || base64.length > Math.ceil(MAX_BYTES * 4 / 3) || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return NextResponse.json({ error: 'La foto está vacía, no es válida o pesa más de 8 MB.' }, { status: 413 });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  let response: Response | undefined;
  for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt++) {
    try {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Analiza la comida de la foto y devuelve cada alimento visible por separado. Para cada alimento: escribe name en español para mostrarlo a la persona; escribe usdaSearchTerm como una búsqueda breve en inglés para encontrar el alimento genérico y su preparación en USDA FoodData Central; estima estimatedGrams de la porción visible; y estima fallbackMacrosPer100g para 100 g (proteína, grasa, carbohidratos en gramos y energía en kcal). Los macros solo son un respaldo si USDA no encuentra el alimento. No inventes ingredientes ocultos. Si es un plato preparado que no se puede separar visualmente, trátalo como un único plato.' }, { inlineData: { mimeType, data: base64 } }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: foodSchema,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingLevel: 'low' },
          },
        }),
        signal: AbortSignal.timeout(45_000),
      });
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError';
      console.error('[api/analyze] Gemini request failed:', isTimeout ? 'timeout' : error instanceof Error ? error.name : 'unknown error');
      return NextResponse.json({ error: isTimeout ? 'Gemini tardó demasiado en responder. Inténtalo de nuevo.' : 'No se pudo conectar con Gemini. Comprueba la conexión e inténtalo otra vez.' }, { status: isTimeout ? 504 : 502 });
    }

    if (![500, 503].includes(response.status) || attempt === GEMINI_MAX_ATTEMPTS - 1) break;
    console.warn(`[api/analyze] Gemini transient ${response.status}; retry ${attempt + 1}/${GEMINI_MAX_ATTEMPTS - 1}`);
    await sleep(700 * (2 ** attempt) + Math.floor(Math.random() * 250));
  }
  if (!response) return NextResponse.json({ error: 'Gemini no respondió. Inténtalo de nuevo.' }, { status: 502 });

  let raw: string;
  try {
    raw = await response.text();
  } catch {
    console.error('[api/analyze] Could not read Gemini response body:', response.status);
    return NextResponse.json({ error: 'No se pudo leer la respuesta de Gemini. Inténtalo de nuevo.' }, { status: 502 });
  }
  let result: { error?: { message?: string }; candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[]; promptFeedback?: { blockReason?: string } };
  try {
    result = JSON.parse(raw);
  } catch {
    console.error('[api/analyze] Gemini returned a non-JSON response:', response.status);
    return NextResponse.json({ error: 'Gemini devolvió una respuesta inesperada. Revisa el log del servidor e inténtalo de nuevo.' }, { status: 502 });
  }

  if (!response.ok) {
    const message = result.error?.message;
    console.error('[api/analyze] Gemini API error:', response.status, message || 'no provider message');
    if (response.status === 503 || /high demand|overload|temporarily unavailable/i.test(message || '')) {
      return NextResponse.json({ error: 'Gemini está temporalmente saturado. Se reintentó automáticamente; vuelve a probar en unos segundos.' }, { status: 503, headers: { 'Retry-After': '5' } });
    }
    if (response.status === 429) return NextResponse.json({ error: 'Límite temporal de Gemini alcanzado. Espera un momento e inténtalo de nuevo.' }, { status: 429 });
    if (response.status === 401 || response.status === 403) return NextResponse.json({ error: 'Gemini rechazó la clave API o no tiene acceso al modelo configurado. Revisa GEMINI_API_KEY y GEMINI_MODEL.' }, { status: 502 });
    if (response.status === 404) return NextResponse.json({ error: `Gemini no encontró el modelo «${model}». Revisa GEMINI_MODEL en .env.local.` }, { status: 502 });
    return NextResponse.json({ error: message ? `Gemini rechazó la solicitud: ${message}` : 'Gemini no pudo analizar la foto.' }, { status: 502 });
  }

  const candidate = result.candidates?.[0];
  const text = candidate?.content?.parts?.find((part) => part.text)?.text;
  if (!text) {
    console.error('[api/analyze] Gemini returned no candidate text:', candidate?.finishReason || result.promptFeedback?.blockReason || 'unknown reason');
    return NextResponse.json({ error: 'Gemini no devolvió alimentos para esta foto. Prueba con otra imagen más clara.' }, { status: 422 });
  }

  let parsed: { foods?: GeminiFood[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error('[api/analyze] Gemini returned malformed JSON');
    return NextResponse.json({ error: 'Gemini devolvió datos en un formato inesperado. Inténtalo de nuevo.' }, { status: 502 });
  }
  if (!Array.isArray(parsed.foods)) {
    return NextResponse.json({ error: 'Gemini no reconoció alimentos en la foto. Prueba con otra imagen o añádelos con el buscador.' }, { status: 422 });
  }

  const detected = parsed.foods.slice(0, 12).map((food) => ({
    name: typeof food.name === 'string' ? food.name.trim().slice(0, 100) : '',
    usdaSearchTerm: typeof food.usdaSearchTerm === 'string' ? food.usdaSearchTerm.trim().slice(0, 120) : '',
    estimatedGrams: Math.min(3000, Math.max(1, Math.round(Number(food.estimatedGrams) || 150))),
    fallbackMacrosPer100g: {
      protein: boundedNumber(food.fallbackMacrosPer100g?.protein, 100),
      fat: boundedNumber(food.fallbackMacrosPer100g?.fat, 100),
      carbs: boundedNumber(food.fallbackMacrosPer100g?.carbs, 100),
      calories: boundedNumber(food.fallbackMacrosPer100g?.calories, 1000),
    },
  })).filter((food) => food.name);

  const apiKeyForUSDA = process.env.USDA_API_KEY || 'DEMO_KEY';
  const enriched = new Array(detected.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < detected.length) {
      const index = nextIndex++;
      const food = detected[index];
      const searchTerm = food.usdaSearchTerm || food.name;
      try {
        const match = (await searchUSDAFoods(searchTerm, apiKeyForUSDA, 5))[0];
        enriched[index] = match ? {
          id: crypto.randomUUID(), name: food.name, nutritionName: match.name, grams: food.estimatedGrams,
          fdcId: match.fdcId, dataSource: 'USDA', macrosPer100g: match.macrosPer100g,
        } : {
          id: crypto.randomUUID(), name: food.name, nutritionName: 'Estimación orientativa por 100 g', grams: food.estimatedGrams,
          dataSource: 'Estimación IA', macrosPer100g: food.fallbackMacrosPer100g,
        };
      } catch (error) {
        console.error('[api/analyze] USDA lookup failed:', error instanceof Error ? error.message : 'unknown error');
        enriched[index] = {
          id: crypto.randomUUID(), name: food.name, nutritionName: 'Estimación orientativa por 100 g', grams: food.estimatedGrams,
          dataSource: 'Estimación IA', macrosPer100g: food.fallbackMacrosPer100g,
        };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, detected.length) }, () => worker()));

  const fallbackCount = enriched.filter((food) => food.dataSource === 'Estimación IA').length;
  return NextResponse.json({ foods: enriched, fallbackCount });
}
