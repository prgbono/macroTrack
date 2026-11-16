import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  OFFLINE_MESSAGE,
  requestErrorMessage,
  watchOnlineStatus
} from './network'

describe('requestErrorMessage', () => {
  it('traduce un fallo de red de fetch a un aviso offline', () => {
    expect(requestErrorMessage(new TypeError('Load failed'), 'x')).toBe(
      OFFLINE_MESSAGE
    )
  })

  it('conserva el mensaje de un error de la API', () => {
    expect(requestErrorMessage(new Error('Clave no válida'), 'x')).toBe(
      'Clave no válida'
    )
  })

  it('usa el fallback si el error no tiene mensaje', () => {
    expect(requestErrorMessage(new Error(''), 'Error en la búsqueda.')).toBe(
      'Error en la búsqueda.'
    )
  })

  it('usa el fallback para valores que no son Error', () => {
    expect(requestErrorMessage('boom', 'Error al analizar la foto.')).toBe(
      'Error al analizar la foto.'
    )
  })
})

describe('watchOnlineStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function setOnLine(onLine: boolean) {
    vi.stubGlobal('navigator', { onLine })
  }

  it('informa del estado inicial al suscribirse', () => {
    setOnLine(false)
    const onChange = vi.fn()

    watchOnlineStatus(onChange, new EventTarget())

    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('notifica los cambios a offline y online', () => {
    setOnLine(true)
    const target = new EventTarget()
    const onChange = vi.fn()
    watchOnlineStatus(onChange, target)

    setOnLine(false)
    target.dispatchEvent(new Event('offline'))
    setOnLine(true)
    target.dispatchEvent(new Event('online'))

    expect(onChange.mock.calls).toEqual([[true], [false], [true]])
  })

  it('deja de escuchar al cancelar la suscripción', () => {
    setOnLine(true)
    const target = new EventTarget()
    const onChange = vi.fn()
    const unsubscribe = watchOnlineStatus(onChange, target)

    unsubscribe()
    target.dispatchEvent(new Event('offline'))

    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
