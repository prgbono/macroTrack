# MacroTrack

MVP personal para fotografiar una comida, identificar alimentos, revisar cantidades estimadas, consultar nutrientes de USDA FoodData Central y guardar un diario en el navegador.

## Funciones

- Interfaz responsive en español, preparada para móvil y captura con cámara.
- Análisis de fotos del lado del servidor con Gemini. La imagen se reduce antes de enviarse; la clave nunca llega al navegador.
- Al subir una foto, identificación automática de alimentos, estimación de gramos y búsqueda nutricional en USDA FoodData Central. El resumen de proteína, grasas, carbohidratos y calorías se calcula y muestra automáticamente.
- Si USDA no encuentra un alimento o no está disponible, la app usa una estimación orientativa de Gemini y la identifica claramente. Puedes ajustar porciones, corregir coincidencias o añadir alimentos manualmente si quieres.
- Historial en IndexedDB en el dispositivo y navegador actuales; no hay cuentas, sincronización ni backend de almacenamiento.
- Estados de carga y mensajes de error para configuración, límites de API, conexión y almacenamiento.

## Requisitos en macOS

1. Instala Node.js 20.9 o posterior (se recomienda una versión LTS actual) desde [nodejs.org](https://nodejs.org/) o con Homebrew.
2. Necesitas conexión a Internet para las consultas de Gemini y USDA.
3. Crea una clave de Gemini en [Google AI Studio](https://aistudio.google.com/apikey). Gemini 3.5 Flash-Lite tiene acceso en el nivel gratuito con límites; los modelos, cuotas y disponibilidad dependen de las condiciones vigentes de Google y tu región.
4. La clave de USDA es gratuita y se solicita en [USDA FoodData Central](https://fdc.nal.usda.gov/api-key-signup.html). `DEMO_KEY` funciona para probar con límites reducidos.

## Instalación y ejecución

En Terminal, entra en la carpeta del proyecto:

```bash
cd /ruta/a/macrotrack
npm install
cp .env.example .env.local
```

Abre `.env.local` en un editor y pega la clave de Gemini:

```dotenv
GEMINI_API_KEY=tu_clave_de_gemini
GEMINI_MODEL=gemini-3.5-flash-lite
USDA_API_KEY=tu_clave_de_usda
```

No compartas `.env.local`, no la subas a Git y no pongas claves en variables que comiencen con `NEXT_PUBLIC_`. El archivo está excluido por `.gitignore`.

Arranca el servidor local:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Para detenerlo, vuelve a Terminal y pulsa `Control-C`.

## Comprobaciones de desarrollo

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

Para iniciar la versión compilada localmente:

```bash
npm run start
```

## Uso

1. Toca el área de foto para tomar o elegir una imagen.
2. MacroTrack identifica los alimentos, estima sus gramos y consulta USDA automáticamente. Los valores y el resumen de macronutrientes aparecen al terminar el análisis; no hace falta buscar cada alimento.
3. Si quieres, ajusta porciones o usa la búsqueda opcional para corregir o añadir un alimento.
4. Guarda la comida para conservarla en IndexedDB en ese navegador y dispositivo.

El cálculo escala los datos USDA por peso: nutrientes indicados por 100 g × gramos / 100. Las fotos y el historial se guardan localmente en el navegador. Al analizar una foto, esta se envía a Google Gemini para obtener la estimación. La búsqueda se envía a USDA FoodData Central. Las estimaciones visuales y los resultados pueden diferir de una medición o etiqueta exacta; revisa las porciones y la preparación.

## Servicios y costos

La app no tiene servicios propios ni despliegue contratado. Gemini y USDA se consultan directamente desde rutas API del servidor local, con sus claves guardadas en `.env.local`. Confirma en las páginas oficiales los límites y condiciones vigentes del nivel gratuito antes de usarlo con frecuencia. El uso personal local evita un hosting, pero las APIs requieren conexión a Internet.
