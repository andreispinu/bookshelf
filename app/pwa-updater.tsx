'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export default function PwaUpdater() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // When a new SW takes over, reload to get fresh content
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloading) {
        reloading = true
        window.location.reload()
      }
    })

    navigator.serviceWorker.ready.then(registration => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            toast('A new version of BookShelf is available', {
              duration: Infinity,
              action: {
                label: 'Update now',
                onClick: () => {
                  registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
                },
              },
            })
          }
        })
      })
    })
  }, [])

  return null
}
