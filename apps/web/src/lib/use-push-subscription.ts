import { api } from '@service-ops/convex/api'
import { useMutation } from 'convex/react'
import { useCallback, useEffect, useState } from 'react'

export type PushStatus =
  | 'unsupported'
  | 'default'
  | 'granted'
  | 'denied'
  | 'dismissed'

export type UsePushSubscription = {
  status: PushStatus
  isIOSPwaUnsupported: boolean
  request: () => Promise<PushStatus>
  unsubscribe: () => Promise<void>
}

const DISMISSED_KEY = 'pwa-push-dismissed-v1'

const detectIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iPadOS = ua.includes('Macintosh') && navigator.maxTouchPoints > 1
  return iPadOS || /iPhone|iPad|iPod/i.test(ua)
}

const detectStandalone = (): boolean => {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if ((navigator as Navigator & { standalone?: boolean }).standalone) {
    return true
  }
  return false
}

/**
 * iOS Safari requires iOS 16.4+ AND the PWA installed to home screen before
 * Notification/PushManager are exposed at all. On vanilla iOS Safari the APIs
 * are missing entirely, which the support check below already handles —
 * `isIOSPwaUnsupported` lets the UI show the targeted explainer instead of the
 * generic "your browser doesn't support push" message.
 */
const computeIosUnsupported = (): boolean => {
  if (!detectIOS()) return false
  if (detectStandalone()) return false
  if (typeof window === 'undefined') return false
  return !('Notification' in window) || !('PushManager' in window)
}

const urlBase64ToArrayBuffer = (base64String: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buffer
}

const isWebPushSupported = (): boolean => {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

const writeDismissed = (value: boolean) => {
  try {
    if (value) localStorage.setItem(DISMISSED_KEY, '1')
    else localStorage.removeItem(DISMISSED_KEY)
  } catch {}
}

export const usePushSubscription = (): UsePushSubscription => {
  const [status, setStatus] = useState<PushStatus>('default')
  const [isIOSPwaUnsupported, setIosUnsupported] = useState(false)

  const subscribeMutation = useMutation(api.pushSubscriptions.subscribe)
  const unsubscribeMutation = useMutation(api.pushSubscriptions.unsubscribe)

  useEffect(() => {
    if (!isWebPushSupported()) {
      setIosUnsupported(computeIosUnsupported())
      setStatus('unsupported')
      return
    }
    const perm = Notification.permission
    if (perm === 'granted') setStatus('granted')
    else if (perm === 'denied') setStatus('denied')
    else if (readDismissed()) setStatus('dismissed')
    else setStatus('default')
  }, [])

  const request = useCallback(async (): Promise<PushStatus> => {
    if (!isWebPushSupported()) return 'unsupported'

    const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as
      | string
      | undefined
    if (!publicKey) {
      console.warn('[push] VITE_VAPID_PUBLIC_KEY is not set')
      return 'unsupported'
    }

    let permission: NotificationPermission
    try {
      permission = await Notification.requestPermission()
    } catch {
      permission = Notification.permission
    }
    if (permission !== 'granted') {
      const next: PushStatus = permission === 'denied' ? 'denied' : 'dismissed'
      if (next === 'dismissed') writeDismissed(true)
      setStatus(next)
      return next
    }

    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(publicKey),
        }))
      const json = sub.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('Subscription missing endpoint or keys')
      }
      await subscribeMutation({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent:
          typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      })
      writeDismissed(false)
      setStatus('granted')
      return 'granted'
    } catch (err) {
      console.warn('[push] subscribe failed', err)
      return 'default'
    }
  }, [subscribeMutation])

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!isWebPushSupported()) return
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await unsubscribeMutation({ endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      // Permission stays "granted" at the OS level — flip our app state to
      // "default" so the banner reappears and the user can re-opt-in.
      setStatus('default')
      writeDismissed(false)
    } catch (err) {
      console.warn('[push] unsubscribe failed', err)
    }
  }, [unsubscribeMutation])

  return { status, isIOSPwaUnsupported, request, unsubscribe }
}
