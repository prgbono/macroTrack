export type NutrientsPer100g = {
  protein: number
  fat: number
  carbs: number
  calories: number
}

export type USDAFood = {
  fdcId: number
  name: string
  dataSource: string
  macrosPer100g: NutrientsPer100g
}

type RawFood = {
  fdcId: number
  description: string
  dataType?: string
  foodNutrients?: {
    nutrientId?: number
    nutrientNumber?: string
    value?: number
  }[]
}

export async function searchUSDAFoods(
  query: string,
  apiKey: string,
  pageSize = 5
): Promise<USDAFood[]> {
  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        pageSize,
        dataType: ['Foundation', 'SR Legacy', 'FNDDS']
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000)
    }
  )

  const raw = await response.text()
  let data: { foods?: RawFood[] }
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error(`USDA returned an invalid response (${response.status})`)
  }
  if (!response.ok) throw new Error(`USDA request failed (${response.status})`)

  return (data.foods || []).map((food) => {
    const get = (ids: number[], numbers: string[]) =>
      food.foodNutrients?.find(
        (n) =>
          ids.includes(n.nutrientId || -1) ||
          numbers.includes(n.nutrientNumber || '')
      )?.value || 0
    return {
      fdcId: food.fdcId,
      name: food.description,
      dataSource: food.dataType || 'USDA',
      macrosPer100g: {
        protein: get([1003], ['203']),
        fat: get([1004], ['204']),
        carbs: get([1005], ['205']),
        calories: get([1008, 1062], ['208', '957'])
      }
    }
  })
}
