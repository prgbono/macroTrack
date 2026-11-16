'use client'

import { useEffect } from 'react'

export function registerServiceWorker() {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((error) => {
        console.error('No se pudo registrar el service worker:', error)
      })
  }
}

export function ServiceWorkerRegister() {
  useEffect(registerServiceWorker, [])

  return null
}
