import type { MacroGoals } from '@/lib/types'

export const GOALS_STORAGE_KEY = 'macrotrack-goals'
export const DEFAULT_GOALS: MacroGoals = {
  protein: 170,
  fat: 70,
  carbs: 250,
  calories: 2000
}

type GoalsStorage = Pick<Storage, 'getItem' | 'setItem'>

const isValidGoal = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

export function parseGoals(raw: string | null): MacroGoals {
  if (!raw) return DEFAULT_GOALS
  try {
    const data: Partial<Record<keyof MacroGoals, unknown>> = JSON.parse(raw)
    return {
      protein: isValidGoal(data.protein) ? data.protein : DEFAULT_GOALS.protein,
      fat: isValidGoal(data.fat) ? data.fat : DEFAULT_GOALS.fat,
      carbs: isValidGoal(data.carbs) ? data.carbs : DEFAULT_GOALS.carbs,
      calories: isValidGoal(data.calories)
        ? data.calories
        : DEFAULT_GOALS.calories
    }
  } catch {
    return DEFAULT_GOALS
  }
}

export function loadGoals(
  storage: GoalsStorage | undefined = globalThis.localStorage
): MacroGoals {
  try {
    return parseGoals(storage?.getItem(GOALS_STORAGE_KEY) ?? null)
  } catch {
    return DEFAULT_GOALS
  }
}

/** Devuelve false si no se pudo guardar. */
export function saveGoals(
  goals: MacroGoals,
  storage: GoalsStorage | undefined = globalThis.localStorage
): boolean {
  try {
    if (!storage) return false
    storage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
    return true
  } catch {
    return false
  }
}
