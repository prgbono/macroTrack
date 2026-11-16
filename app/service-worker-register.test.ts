import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './service-worker-register'

function stubNavigator(register = vi.fn().mockResolvedValue(undefined)) {
  vi.stubGlobal('navigator', { serviceWorker: { register } })
  return register
}

describe('registerServiceWorker', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('registra /sw.js en producción', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const register = stubNavigator()

    registerServiceWorker()

    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })

  it('no registra en desarrollo', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const register = stubNavigator()

    registerServiceWorker()

    expect(register).not.toHaveBeenCalled()
  })

  it('no falla si el navegador no soporta service workers', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubGlobal('navigator', {})

    expect(() => registerServiceWorker()).not.toThrow()
  })

  it('registra el error en consola si el registro falla', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const error = new Error('fallo')
    stubNavigator(vi.fn().mockRejectedValue(error))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    registerServiceWorker()
    await vi.waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        'No se pudo registrar el service worker:',
        error
      )
    )
  })
})
