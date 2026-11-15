import { describe, expect, it } from 'vitest'
import { foodMacros, mealMacros } from './types'
import type { FoodItem } from './types'

const chicken: FoodItem = {
  id: 'chicken',
  name: 'Pollo',
  grams: 150,
  macrosPer100g: {
    protein: 31,
    fat: 3.6,
    carbs: 0,
    calories: 165
  }
}

describe('foodMacros', () => {
  it('escala los nutrientes según el peso en gramos', () => {
    expect(foodMacros(chicken)).toEqual({
      protein: 46.5,
      fat: 5.4,
      carbs: 0,
      calories: 247.5
    })
  })

  it('devuelve cero para una porción de cero gramos', () => {
    expect(foodMacros({ ...chicken, grams: 0 })).toEqual({
      protein: 0,
      fat: 0,
      carbs: 0,
      calories: 0
    })
  })
})

describe('mealMacros', () => {
  it('suma los macros de todos los alimentos', () => {
    const rice: FoodItem = {
      id: 'rice',
      name: 'Arroz',
      grams: 100,
      macrosPer100g: {
        protein: 2.7,
        fat: 0.3,
        carbs: 28,
        calories: 130
      }
    }

    expect(mealMacros([chicken, rice])).toEqual({
      protein: 49.2,
      fat: 5.7,
      carbs: 28,
      calories: 377.5
    })
  })

  it('devuelve macros en cero para una comida vacía', () => {
    expect(mealMacros([])).toEqual({
      protein: 0,
      fat: 0,
      carbs: 0,
      calories: 0
    })
  })
})
