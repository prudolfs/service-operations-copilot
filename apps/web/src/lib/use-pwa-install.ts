import { useCallback, useEffect, useRef, useState } from 'react'

const DISMISSED_KEY = 'pwa-install-dismissed-v1'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

export type PwaInstall = {
  canInstall: boolean
  isInstalled: boolean
  isIOS: boolean
  isDismissed: boolean
  promptInstall: () => Promise<InstallOutcome>
  dismiss: () => void
  reset: () => void
}

function detectIsIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPad on iOS 13+ reports as Mac; check touch points.
  const iPadOS = ua.includes('Macintosh') && navigator.maxTouchPoints > 1
  const iPhoneOrIPad = /iPhone|iPad|iPod/i.test(ua)
  return iPadOS || iPhoneOrIPad
}

function detectIsInstalled(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari sets navigator.standalone when launched from home screen.
  if ((navigator as Navigator & { standalone?: boolean }).standalone) {
    return true
  }
  return false
}

export function usePwaInstall(): PwaInstall {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    setIsInstalled(detectIsInstalled())
    setIsIOS(detectIsIOS())
    try {
      setIsDismissed(localStorage.getItem(DISMISSED_KEY) === '1')
    } catch {
      // Private mode / storage disabled — treat as not dismissed.
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      promptRef.current = event as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    const onInstalled = () => {
      promptRef.current = null
      setCanInstall(false)
      setIsInstalled(true)
    }

    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    const onDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    standaloneQuery.addEventListener('change', onDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      standaloneQuery.removeEventListener('change', onDisplayModeChange)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    const evt = promptRef.current
    if (!evt) return 'unavailable'
    await evt.prompt()
    const choice = await evt.userChoice
    promptRef.current = null
    setCanInstall(false)
    return choice.outcome
  }, [])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {}
    setIsDismissed(true)
  }, [])

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(DISMISSED_KEY)
    } catch {}
    setIsDismissed(false)
  }, [])

  return {
    canInstall,
    isInstalled,
    isIOS,
    isDismissed,
    promptInstall,
    dismiss,
    reset,
  }
}
