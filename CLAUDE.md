# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Reglas de desarrollo del proyecto (calidad, tests obligatorios, formato): @AGENTS.md

## Comandos

```bash
npm run dev          # http://localhost:3000
npm test             # vitest run (toda la suite)
npx vitest run app/sw.test.ts          # un archivo
npx vitest run -t 'sin red'            # tests por nombre
npm run lint
npm run typecheck
npm run build
```

Configuración: `cp .env.example .env.local` y rellenar `GEMINI_API_KEY` (obligatoria), `GEMINI_MODEL`, `USDA_API_KEY` (por defecto `DEMO_KEY`). Nunca usar prefijo `NEXT_PUBLIC_` para claves.

WSL: `node_modules` instalado desde Windows hace fallar vitest con `Cannot find module @rollup/rollup-linux-x64-gnu`. Ejecutar los tests desde Windows o reinstalar dependencias en el entorno usado. Ojo, esto aplica a un sistema Windows (Kepler) no a un mac (personal)

## Arquitectura

App de una sola página Next.js 15 (App Router) + React 19, TypeScript estricto. Sin cuentas ni backend de persistencia. Detalle completo en `docsAI/ARCHITECTURE.md`; PWA en `docsAI/pwa.md`.

- `app/page.tsx` (`'use client'`): toda la UI. Reduce la foto en canvas (≤1600 px, JPEG 0,82) y la envía como Base64.
- `POST /api/analyze` (`app/api/analyze/route.ts`): valida MIME/tamaño (8 MB), pide a Gemini JSON estructurado (nombre, término USDA, gramos, macros de respaldo por 100 g), reintenta Gemini hasta 3 veces y enriquece cada alimento en USDA con concurrencia máx. 4. Si USDA falla, el alimento queda como estimación de IA.
- `GET /api/foods?q=` (`app/api/foods/route.ts`): búsqueda manual en USDA.
- `lib/usda.ts`: cliente USDA compartido por ambas rutas. Las claves solo se leen en servidor; ambas rutas usan `runtime = 'nodejs'`.
- `lib/types.ts`: modelo de dominio y cálculo de macros (`nutriente × gramos / 100`, sumados por comida).
- `lib/db.ts`: IndexedDB vía `idb` (BD `macrotrack` v1, almacén `meals`). Cambiar el esquema requiere subir versión y migración en `upgrade`.
- `lib/network.ts`: mensajes offline (`TypeError` de fetch = sin red) y `watchOnlineStatus`.

### PWA / offline

- `public/sw.js`: JS plano (no pasa por el build). Navegación network-first con fallback a `/` en caché y luego `/offline.html`; `/_next/static/` cache-first. Nunca cachear `/api/`. Al cambiar el SW o la app shell, subir `CACHE_NAME` (`macrotrack-vN`) y actualizar la constante en `app/sw.test.ts`.
- `app/service-worker-register.tsx`: registra `/sw.js` solo en producción; montado en `app/layout.tsx`.
- `app/sw.test.ts` ejecuta `public/sw.js` con `node:vm` y fakes de `caches`/`fetch`. Vitest usa entorno `node` (sin jsdom).

## Convenciones

- UI, mensajes de error, tests (`it('...')`) y docs en español.
- Tests junto al código (`*.test.ts`). Alias `@/` = raíz del repo.
