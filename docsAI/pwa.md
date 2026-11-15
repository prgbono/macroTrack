# MacroTrack como PWA en iPhone: guía gratuita

**Actualizado: 15 de noviembre de 2026**

## La opción recomendada

Para mantener la aplicación actual y usarla desde el iPhone sin depender de tu Mac, publica MacroTrack en **Vercel Hobby**, configura allí las claves de las API y añade la web a la pantalla de inicio desde Safari. Después, añade un manifiesto y un service worker para que la interfaz y los datos guardados sigan disponibles cuando no haya conexión.

La instalación como PWA no necesita App Store ni una cuenta Apple Developer de pago. El plan Vercel Hobby es gratuito para uso personal y no comercial, sujeto a sus límites. Usa el dominio gratuito `*.vercel.app`; no compres un dominio ni actives un plan de pago durante las pruebas. [Plan Vercel Hobby](https://vercel.com/docs/plans/hobby), [condiciones de Vercel](https://vercel.com/legal/terms)

## Qué funcionará sin conexión

Una PWA no puede ejecutar los servicios de Internet cuando el iPhone está desconectado. En MacroTrack:

- **Puede funcionar sin Internet**, después de haberla abierto online y de que el service worker haya guardado la interfaz: abrir la app shell y consultar el historial ya guardado en IndexedDB. Si pierdes la conexión mientras tienes una comida ya preparada en pantalla, el botón de guardar persiste esa comida localmente.
- **Para crear comidas nuevas completamente offline**, tendrás que añadir una opción de entrada manual de alimentos y macros. En la app actual, tanto el análisis como la búsqueda que se usa para añadir/corregir alimentos dependen de `/api/`; no se pueden iniciar desde cero offline.
- **Necesita Internet**: analizar una foto con Gemini, buscar/enriquecer alimentos con USDA y cargar una versión o recursos que aún no estén en caché. Las rutas `/api/analyze` y `/api/foods` se ejecutan en el servidor remoto.
- **No hay sincronización**: IndexedDB sigue siendo local al iPhone y al contexto del navegador/app web. Borrar los datos del sitio puede borrar el diario.

Las fotos que analices se envían a Gemini. La PWA no las analiza localmente. No caches las rutas `/api/` ni las claves API en el service worker.

## Paso 1: publicar el Next.js sin pagar

GitHub Pages no puede ejecutar las rutas de servidor de MacroTrack. La exportación estática de Next.js no admite rutas que dependen de la solicitud entrante como `POST /api/analyze` y la búsqueda dinámica `GET /api/foods?q=...`. Pages serviría los archivos estáticos, pero estas funciones dejarían de funcionar. [Exportación estática de Next.js](https://nextjs.org/docs/app/guides/static-exports), [limitaciones de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

Vercel es la opción sencilla para conservar la app completa:

1. Sube a GitHub los cambios de la app que quieras probar. No incluyas `.env.local` ni claves en el repositorio.
2. Entra en [Vercel](https://vercel.com/), crea un proyecto e importa `prgbono/macroTrack` desde GitHub.
3. Deja el framework como **Next.js** y usa los comandos detectados automáticamente (`npm install` y `next build`). No configures salida estática.
4. En **Project Settings → Environment Variables**, añade en el entorno **Production**:

   | Variable | Valor |
   | --- | --- |
   | `GEMINI_API_KEY` | Tu clave de Google AI Studio |
   | `GEMINI_MODEL` | Un modelo que aparezca disponible en tu cuenta y tenga nivel gratuito |
   | `USDA_API_KEY` | Tu clave de FoodData Central; puedes usar `DEMO_KEY` para probar con límites reducidos |

   No antepongas `NEXT_PUBLIC_` a estas claves. Las rutas actuales las leen desde el servidor.

VOY POR AQUÍ
5. Pulsa **Deploy**. La URL `https://<proyecto>.vercel.app` será la dirección que abrirás en el iPhone. Vercel crea despliegues desde el repositorio y proporciona HTTPS. [Despliegue desde GitHub](https://vercel.com/docs/git/vercel-for-github)
6. Si cambias una variable de entorno, crea un nuevo despliegue para que entre en vigor.

### Mantener el coste en cero

- No añadas tarjeta ni habilites facturación en Vercel o Google Cloud durante las pruebas. Mantente en Hobby y en el nivel gratuito de Gemini. Vercel puede limitar el servicio cuando se alcanza una cuota gratuita; no lo actualices a un plan de pago. El nivel gratuito de Gemini y sus cuotas dependen del modelo y pueden cambiar. [Precios de Gemini API](https://ai.google.dev/gemini-api/docs/pricing), [facturación de Gemini](https://ai.google.dev/gemini-api/docs/billing)
- FoodData Central requiere una clave `data.gov`; su API indica un límite predeterminado de 1.000 solicitudes por hora por IP. [Guía oficial de FoodData Central](https://fdc.nal.usda.gov/api-guide/)
- Vercel Hobby está limitado a proyectos personales y no comerciales. Revisa las condiciones y límites actuales antes de ampliar el uso.
- La URL pública deja accesibles las rutas API actuales: no tienen autenticación ni rate limit propio. Aunque la clave no se entrega al navegador, otras personas podrían invocar tus rutas y gastar tus cuotas gratuitas. Para pruebas personales, no publiques ni compartas la URL. Antes de compartir la app, añade autenticación y protección contra abuso.

## Paso 2: añadir el manifiesto y los iconos

Next.js App Router reconoce `app/manifest.ts` y lo publica como manifiesto web. Crea los iconos localmente con GIMP (gratuito): un diseño cuadrado de 1024 × 1024 y exportaciones PNG a 192 × 192, 512 × 512 y 180 × 180. No hace falta subir la imagen a un generador web.

Guarda los archivos así:

```text
public/icons/icon-192.png
public/icons/icon-512.png
app/apple-icon.png        # 180 × 180
```

Crea `app/manifest.ts`:

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MacroTrack',
    short_name: 'MacroTrack',
    description: 'Tu diario de comidas y macronutrientes',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f8f5ed',
    theme_color: '#ff3d00',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
}
```

El archivo `app/apple-icon.png` es el icono para dispositivos Apple. Comprueba que todos los ficheros de icono existen antes de desplegar. [Manifiesto en Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)

## Paso 3: crear el fallback offline

Crea `public/offline.html` con una página pequeña que no dependa de JavaScript ni de recursos externos. Por ejemplo:

```html
<!doctype html>
<html lang="es">
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MacroTrack sin conexión</title>
  <body>
    <main>
      <h1>MacroTrack</h1>
      <p>Estás sin conexión. Vuelve a abrir la app cuando haya cargado al menos una vez con Internet.</p>
      <p>El análisis con Gemini y las búsquedas de USDA necesitan conexión.</p>
    </main>
  </body>
</html>
```

El fallback permite mostrar un mensaje si tampoco hay una copia en caché de la página principal. Para ver el historial, el service worker debe poder servir la página principal y sus recursos de Next.js desde la caché.

## Paso 4: añadir un service worker con caché segura

Crea `public/sw.js`. Mantén una versión de caché, guarda la página principal, fallback e iconos durante la instalación, y guarda los recursos estáticos de Next que se vayan descargando. Para las navegaciones, usa red primero y caché cuando no haya red. **Excluye siempre `/api/`**: Gemini y USDA necesitan conexión, y sus respuestas no deben convertirse en datos offline obsoletos.

Base del service worker:

```js
const CACHE_NAME = 'macrotrack-v1'
const OFFLINE_URL = '/offline.html'
const APP_SHELL = [
  '/',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/apple-icon.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(APP_SHELL)
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('macrotrack-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME)
            await cache.put('/', response.clone())
          }
          return response
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match('/')) ||
            (await caches.match(OFFLINE_URL))
          )
        }
      })()
    )
    return
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached

        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(request, response.clone())
        }
        return response
      })
    )
  }
})
```

Cuando publiques una nueva versión, cambia `macrotrack-v1` por `macrotrack-v2`. Eso permite retirar la caché anterior durante la activación. El navegador solo cachea recursos estáticos descargados con éxito; abre la app online, espera a que cargue y vuelve a abrirla una vez para que el service worker controle la página y almacene sus recursos.

## Paso 5: registrar el service worker

Crea un componente cliente `app/service-worker-register.tsx`:

```tsx
'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
        console.error('No se pudo registrar el service worker:', error)
      })
    }
  }, [])

  return null
}
```

Impórtalo desde `app/layout.tsx` y renderiza `<ServiceWorkerRegister />` dentro de `<body>`. Regístralo solo en producción si prefieres evitar cachés durante desarrollo; para ello comprueba `process.env.NODE_ENV === 'production'` en el componente.

## Paso 6: comunicar claramente el modo offline

En los controladores de analizar foto y buscar alimentos, muestra un mensaje claro cuando falle la conexión. La app ya presenta errores de red de ambas rutas; añade también un estado visible “Sin conexión” basado en los eventos `online` y `offline` del navegador. No des por hecho que `navigator.onLine` garantiza que Internet funciona: el resultado de `fetch` sigue siendo la comprobación definitiva.

La escritura y lectura del historial ya usan IndexedDB localmente. Comprueba que se puede abrir la portada cacheada y leer el historial en modo avión. Para registrar comidas nuevas sin conexión, añade en la interfaz una entrada manual que no llame a `/api/`: nombre, gramos, y macros por 100 g; márcala con `dataSource: 'Manual'` y guárdala mediante `saveMeal`. Incluye tests de los cálculos, validación de valores y guardado local.

Las funciones que llaman a `/api/analyze` y `/api/foods` deben explicar que necesitan Internet, sin reintentos infinitos ni almacenar solicitudes con claves.

## Paso 7: probar y desplegar

Antes de publicar, añade tests para el registro/fallback del service worker y los estados de error offline junto con cualquier cambio de comportamiento. Ejecuta:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Prueba en dos fases:

1. **Online:** abre la URL HTTPS de Vercel en Safari; confirma que carga, que analizar una foto usa Gemini y que buscar alimentos usa USDA.
2. **Instalación:** toca **Compartir → Añadir a pantalla de inicio**, activa **Abrir como app web** si aparece y toca **Añadir**. Apple documenta ese flujo para crear el icono de inicio. [Añadir una web a la pantalla de inicio](https://support.apple.com/en-mide/guide/iphone/iph42ab2f3a7/27/ios/27)
3. **Preparar caché:** abre MacroTrack desde su icono con conexión, espera a que termine de cargar y vuelve a cargarla online una vez.
4. **Offline:** activa el modo avión y abre el icono. Comprueba que aparece la interfaz, que el historial local se lee y que una petición de búsqueda/análisis muestra un aviso de conexión.
5. **Actualización:** desactiva modo avión, despliega cambios y abre la app para que reciba el nuevo service worker y actualice su caché.

Next.js recomienda HTTPS para instalar la PWA y usa `app/manifest.ts` para el manifiesto. El service worker permite definir qué guardar y qué fallback mostrar; el hecho de instalar la PWA por sí solo no hace que la app completa funcione offline. [Guía PWA de Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps)

## Alternativa: GitHub Pages solo para una demo estática

GitHub Pages puede alojar gratis una PWA puramente estática. Para usarlo, habría que activar `output: 'export'` en Next.js y generar los archivos en `out/`. Eso **no conserva** la funcionalidad actual de las rutas que leen la solicitud (`POST /api/analyze`, `GET /api/foods?q=...`). Podrías hacer una demo offline del cascarón y el diario local, pero sin análisis con Gemini ni búsqueda USDA, salvo que se conecte un backend externo gratuito.

Para la aplicación actual completa, usa Vercel Hobby personal y añade la caché offline. Ninguna de estas opciones hace posible analizar fotos ni consultar USDA cuando el iPhone no tiene Internet.

## Fuentes oficiales

- [Next.js: Progressive Web Apps](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Next.js: manifiestos web](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)
- [Next.js: exportación estática y funciones no compatibles](https://nextjs.org/docs/app/guides/static-exports)
- [GitHub Pages: sitio estático](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Vercel Hobby: límites y uso personal/no comercial](https://vercel.com/docs/plans/hobby)
- [Vercel: términos de uso](https://vercel.com/legal/terms)
- [Google: precios de Gemini API](https://ai.google.dev/gemini-api/docs/pricing)
- [USDA: API FoodData Central](https://fdc.nal.usda.gov/api-guide/)
- [Apple: añadir sitio a la pantalla de inicio](https://support.apple.com/en-mide/guide/iphone/iph42ab2f3a7/27/ios/27)
