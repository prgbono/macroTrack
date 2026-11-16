export const OFFLINE_MESSAGE = 'Sin conexión: esta función necesita Internet.'

// fetch rechaza con TypeError solo cuando falla la red; los 4xx/5xx llegan como response.ok === false.
export function requestErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError) return OFFLINE_MESSAGE
  return error instanceof Error && error.message ? error.message : fallback
}
