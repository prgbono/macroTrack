import { describe, expect, it } from 'vitest'
import { OFFLINE_MESSAGE, requestErrorMessage } from './network'

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
