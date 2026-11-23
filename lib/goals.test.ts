import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GOALS,
  GOALS_STORAGE_KEY,
  loadGoals,
  parseGoals,
  saveGoals
} from './goals'

const fakeStorage = (initial?: string) => {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(GOALS_STORAGE_KEY, initial)
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v)
  }
}

describe('goals', () => {
  it('usa los valores por defecto sin datos guardados', () => {
    expect(parseGoals(null)).toEqual({
      protein: 170,
      fat: 70,
      carbs: 250,
      calories: 2000
    })
  })
  it('lee metas válidas', () => {
    const goals = { protein: 120, fat: 50, carbs: 200, calories: 1800 }
    expect(parseGoals(JSON.stringify(goals))).toEqual(goals)
  })
  it('usa los valores por defecto con JSON corrupto', () => {
    expect(parseGoals('{no json')).toEqual(DEFAULT_GOALS)
  })
  it('sustituye valores negativos, cero o no numéricos por los de defecto', () => {
    const raw = JSON.stringify({
      protein: -5,
      fat: 0,
      carbs: 'x',
      calories: 1500
    })
    expect(parseGoals(raw)).toEqual({ ...DEFAULT_GOALS, calories: 1500 })
  })
  it('guarda y recupera metas', () => {
    const storage = fakeStorage()
    const goals = { protein: 100, fat: 60, carbs: 180, calories: 1700 }
    expect(saveGoals(goals, storage)).toBe(true)
    expect(loadGoals(storage)).toEqual(goals)
  })
  it('tolera almacenamiento no disponible', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      }
    }
    expect(loadGoals(broken)).toEqual(DEFAULT_GOALS)
    expect(saveGoals(DEFAULT_GOALS, broken)).toBe(false)
  })
})
