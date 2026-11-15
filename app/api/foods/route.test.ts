import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { searchUSDAFoods } from '../../../lib/usda'
import type { USDAFood } from '../../../lib/usda'
import { GET } from './route'

vi.mock('../../../lib/usda', () => ({
  searchUSDAFoods: vi.fn()
}))

const mockedSearchUSDAFoods = vi.mocked(searchUSDAFoods)

describe('GET /api/foods', () => {
  beforeEach(() => {
    vi.stubEnv('USDA_API_KEY', 'test-key')
    mockedSearchUSDAFoods.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rechaza una consulta vacía sin llamar a USDA', async () => {
    const response = await GET(new Request('http://localhost/api/foods?q='))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'Escribe un alimento para buscar.'
    })
    expect(mockedSearchUSDAFoods).not.toHaveBeenCalled()
  })

  it('busca el alimento y devuelve los resultados de USDA', async () => {
    const foods: USDAFood[] = [
      {
        fdcId: 1,
        name: 'Arroz blanco',
        dataSource: 'USDA',
        macrosPer100g: { protein: 2.7, fat: 0.3, carbs: 28, calories: 130 }
      }
    ]
    mockedSearchUSDAFoods.mockResolvedValue(foods)

    const response = await GET(
      new Request('http://localhost/api/foods?q=%20arroz%20')
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ foods })
    expect(mockedSearchUSDAFoods).toHaveBeenCalledWith('arroz', 'test-key', 8)
  })

  it('devuelve 429 cuando USDA informa que se alcanzó el límite', async () => {
    mockedSearchUSDAFoods.mockRejectedValue(
      new Error('USDA request failed (429)')
    )

    const response = await GET(
      new Request('http://localhost/api/foods?q=arroz')
    )

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({
      error:
        'Límite de consultas USDA alcanzado. Espera o configura tu propia clave gratuita.'
    })
  })
})
