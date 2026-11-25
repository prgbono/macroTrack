export type Macros = {
  protein: number
  fat: number
  carbs: number
  calories: number
}
export type FoodItem = {
  id: string
  name: string
  grams: number
  macrosPer100g: Macros
  fdcId?: number
  dataSource?: string
  nutritionName?: string
}
export type Meal = {
  id: string
  createdAt: string
  photo?: string
  foods: FoodItem[]
}
export const foodMacros = (food: FoodItem): Macros => ({
  protein: (food.macrosPer100g.protein * food.grams) / 100,
  fat: (food.macrosPer100g.fat * food.grams) / 100,
  carbs: (food.macrosPer100g.carbs * food.grams) / 100,
  calories: (food.macrosPer100g.calories * food.grams) / 100
})
export const mealMacros = (foods: FoodItem[]): Macros =>
  foods.reduce(
    (sum, food) => {
      const m = foodMacros(food)
      return {
        protein: sum.protein + m.protein,
        fat: sum.fat + m.fat,
        carbs: sum.carbs + m.carbs,
        calories: sum.calories + m.calories
      }
    },
    { protein: 0, fat: 0, carbs: 0, calories: 0 }
  )
export type MacroGoals = Macros

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/** Suma los macros de las comidas guardadas en el día local de `day`. */
export const dailyMacros = (meals: Meal[], day: Date = new Date()): Macros =>
  mealMacros(
    meals
      .filter((meal) => sameLocalDay(new Date(meal.createdAt), day))
      .flatMap((meal) => meal.foods)
  )
