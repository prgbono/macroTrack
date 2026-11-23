import { describe, expect, it } from 'vitest'
import { dailyMacros, foodMacros, mealMacros } from './types'
import type { FoodItem, Meal } from './types'

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

describe('dailyMacros', () => {
  const meal = (id: string, createdAt: Date): Meal => ({
    id,
    createdAt: createdAt.toISOString(),
    foods: [chicken]
  })
  const day = new Date(2026, 10, 23, 12)

  it('devuelve ceros sin comidas', () => {
    expect(dailyMacros([], day)).toEqual({
      protein: 0,
      fat: 0,
      carbs: 0,
      calories: 0
    })
  })
  it('suma varias comidas del mismo día', () => {
    const meals = [
      meal('a', new Date(2026, 10, 23, 8)),
      meal('b', new Date(2026, 10, 23, 20))
    ]
    expect(dailyMacros(meals, day).protein).toBeCloseTo(93)
  })
  it('ignora comidas de otros días, incluido el borde de medianoche', () => {
    const meals = [
      meal('ayer', new Date(2026, 10, 22, 23, 59, 59)),
      meal('manana', new Date(2026, 10, 24, 0, 0, 0)),
      meal('hoy', new Date(2026, 10, 23, 0, 0, 0))
    ]
    expect(dailyMacros(meals, day).protein).toBeCloseTo(46.5)
  })
})
