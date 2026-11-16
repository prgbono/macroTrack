import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGIN = 'https://macrotrack.test'
const CACHE_NAME = 'macrotrack-v1'
const source = readFileSync(
  fileURLToPath(new URL('../public/sw.js', import.meta.url)),
  'utf8'
)

type FakeRequest = { url: string; method: string; mode: string }
type CacheKey = FakeRequest | string
type Listener = (event: unknown) => void

const keyOf = (request: CacheKey) =>
  new URL(typeof request === 'string' ? request : request.url, ORIGIN).href

class FakeCaches {
  stores = new Map<string, Map<string, Response>>()

  async open(name: string) {
    const store = this.stores.get(name) ?? new Map<string, Response>()
    this.stores.set(name, store)
    return {
      put: async (request: CacheKey, response: Response) => {
        store.set(keyOf(request), response)
      },
      addAll: async (urls: string[]) => {
        for (const url of urls) store.set(keyOf(url), new Response(url))
      }
    }
  }

  async match(request: CacheKey) {
    for (const store of this.stores.values()) {
      const cached = store.get(keyOf(request))
      if (cached) return cached.clone()
    }
    return undefined
  }

  async keys() {
    return [...this.stores.keys()]
  }

  async delete(name: string) {
    return this.stores.delete(name)
  }
}

function request(path: string, init: Partial<FakeRequest> = {}): FakeRequest {
  return {
    url: new URL(path, ORIGIN).href,
    method: 'GET',
    mode: 'no-cors',
    ...init
  }
}

function loadServiceWorker() {
  const listeners = new Map<string, Listener>()
  const caches = new FakeCaches()
  const fetch = vi.fn<(request: CacheKey) => Promise<Response>>()
  const self = {
    location: new URL(ORIGIN),
    addEventListener: (type: string, listener: Listener) =>
      listeners.set(type, listener),
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined) }
  }
  runInNewContext(source, { self, caches, fetch, URL })

  async function lifecycle(type: 'install' | 'activate') {
    let pending: Promise<unknown> = Promise.resolve()
    listeners.get(type)?.({
      waitUntil: (promise: Promise<unknown>) => {
        pending = promise
      }
    })
    await pending
  }

  function dispatchFetch(fakeRequest: FakeRequest) {
    let response: Promise<Response | undefined> | undefined
    listeners.get('fetch')?.({
      request: fakeRequest,
      respondWith: (promise: Promise<Response | undefined>) => {
        response = promise
      }
    })
    return response
  }

  return { caches, fetch, self, lifecycle, dispatchFetch }
}

describe('service worker', () => {
  let sw: ReturnType<typeof loadServiceWorker>

  beforeEach(() => {
    sw = loadServiceWorker()
  })

  it('guarda la app shell y el fallback offline al instalarse', async () => {
    await sw.lifecycle('install')

    const store = sw.caches.stores.get(CACHE_NAME)
    expect(store?.has(`${ORIGIN}/`)).toBe(true)
    expect(store?.has(`${ORIGIN}/offline.html`)).toBe(true)
    expect(sw.self.skipWaiting).toHaveBeenCalled()
  })

  it('borra cachés antiguas de MacroTrack al activarse', async () => {
    await sw.caches.open('macrotrack-v0')
    await sw.caches.open('otra-app')
    await sw.caches.open(CACHE_NAME)

    await sw.lifecycle('activate')

    expect(await sw.caches.keys()).toEqual(['otra-app', CACHE_NAME])
    expect(sw.self.clients.claim).toHaveBeenCalled()
  })

  it.each([
    ['rutas /api/', request('/api/foods?q=arroz')],
    ['peticiones POST', request('/api/analyze', { method: 'POST' })],
    ['otros orígenes', request('https://cdn.example.com/x.js')]
  ])('no intercepta %s', (_, fakeRequest) => {
    expect(sw.dispatchFetch(fakeRequest)).toBeUndefined()
    expect(sw.fetch).not.toHaveBeenCalled()
  })

  it('con red, sirve la navegación desde la red y la guarda en caché', async () => {
    sw.fetch.mockResolvedValue(new Response('portada nueva'))

    const response = await sw.dispatchFetch(request('/', { mode: 'navigate' }))

    expect(await response?.text()).toBe('portada nueva')
    expect(await (await sw.caches.match('/'))?.text()).toBe('portada nueva')
  })

  it('sin red, sirve la portada en caché', async () => {
    const cache = await sw.caches.open(CACHE_NAME)
    await cache.put('/', new Response('portada guardada'))
    sw.fetch.mockRejectedValue(new TypeError('Load failed'))

    const response = await sw.dispatchFetch(
      request('/historial', { mode: 'navigate' })
    )

    expect(await response?.text()).toBe('portada guardada')
  })

  it('sin red ni portada en caché, sirve offline.html', async () => {
    const cache = await sw.caches.open(CACHE_NAME)
    await cache.put('/offline.html', new Response('sin conexión'))
    sw.fetch.mockRejectedValue(new TypeError('Load failed'))

    const response = await sw.dispatchFetch(request('/', { mode: 'navigate' }))

    expect(await response?.text()).toBe('sin conexión')
  })

  it('sirve recursos de /_next/static/ desde caché sin ir a la red', async () => {
    const asset = request('/_next/static/chunks/app.js')
    const cache = await sw.caches.open(CACHE_NAME)
    await cache.put(asset, new Response('js en caché'))

    const response = await sw.dispatchFetch(asset)

    expect(await response?.text()).toBe('js en caché')
    expect(sw.fetch).not.toHaveBeenCalled()
  })

  it('descarga y guarda recursos de /_next/static/ que no están en caché', async () => {
    const asset = request('/_next/static/chunks/app.js')
    sw.fetch.mockResolvedValue(new Response('js de red'))

    const response = await sw.dispatchFetch(asset)

    expect(await response?.text()).toBe('js de red')
    expect(await (await sw.caches.match(asset))?.text()).toBe('js de red')
  })

  it('no guarda respuestas de error de /_next/static/', async () => {
    const asset = request('/_next/static/chunks/missing.js')
    sw.fetch.mockResolvedValue(new Response('no existe', { status: 404 }))

    await sw.dispatchFetch(asset)

    expect(await sw.caches.match(asset)).toBeUndefined()
  })
})
