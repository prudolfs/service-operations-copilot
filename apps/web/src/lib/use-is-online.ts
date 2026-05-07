import type { ConnectionState } from 'convex/browser'
import { useEffect, useState } from 'react'
import { getConvexClient } from '@/lib/convex'

// "Connecting" (websocket dropped but client is still trying to reconnect)
// stays as online until retries pile up — otherwise the banner flaps every
// time Convex briefly cycles a socket. Once `connectionRetries` crosses the
// threshold and the socket is still down, we surface offline.
const CONVEX_OFFLINE_RETRY_THRESHOLD = 2

const computeOnline = (cs: ConnectionState | null): boolean => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false
  }
  if (
    cs &&
    cs.hasEverConnected &&
    !cs.isWebSocketConnected &&
    cs.connectionRetries >= CONVEX_OFFLINE_RETRY_THRESHOLD
  ) {
    return false
  }
  return true
}

export const useIsOnline = (): boolean => {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const client = getConvexClient()
    let lastCs: ConnectionState | null = null
    try {
      lastCs = client.connectionState()
    } catch {
      lastCs = null
    }

    const refresh = () => setIsOnline(computeOnline(lastCs))

    const onOnline = () => refresh()
    const onOffline = () => refresh()
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    const unsubscribe = client.subscribeToConnectionState((cs) => {
      lastCs = cs
      refresh()
    })

    refresh()

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      unsubscribe()
    }
  }, [])

  return isOnline
}
