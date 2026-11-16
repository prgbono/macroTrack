export const OFFLINE_MESSAGE = 'Sin conexión: esta función necesita Internet.'

// fetch rechaza con TypeError solo cuando falla la red; los 4xx/5xx llegan como response.ok === false.
export function requestErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError) return OFFLINE_MESSAGE
  return error instanceof Error && error.message ? error.message : fallback
}

// navigator.onLine es orientativo; el resultado de fetch sigue siendo la comprobación definitiva.
export function watchOnlineStatus(
  onChange: (online: boolean) => void,
  target: EventTarget = window
) {
  const update = () => onChange(navigator.onLine)
  update()
  target.addEventListener('online', update)
  target.addEventListener('offline', update)
  return () => {
    target.removeEventListener('online', update)
    target.removeEventListener('offline', update)
  }
}
