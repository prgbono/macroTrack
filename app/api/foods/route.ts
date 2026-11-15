import { NextResponse } from 'next/server'
import { searchUSDAFoods } from '@/lib/usda'

export const runtime = 'nodejs'
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim()
  if (!query || query.length > 120)
    return NextResponse.json(
      { error: 'Escribe un alimento para buscar.' },
      { status: 400 }
    )
  try {
    const foods = await searchUSDAFoods(
      query,
      process.env.USDA_API_KEY || 'DEMO_KEY',
      8
    )
    return NextResponse.json({ foods })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const limited = message.includes('(429)')
    return NextResponse.json(
      {
        error: limited
          ? 'Límite de consultas USDA alcanzado. Espera o configura tu propia clave gratuita.'
          : 'Error de conexión con USDA FoodData Central.'
      },
      { status: limited ? 429 : 502 }
    )
  }
}
