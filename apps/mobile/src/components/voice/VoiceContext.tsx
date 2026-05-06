import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

/**
 * Voice context lets every screen contribute its situational awareness — what
 * the user is currently looking at — so the floating mic button can ship the
 * right `clientContext` to the AI action without prop-drilling. Screens call
 * `setContext(...)` in a `useEffect`; the mic button reads it on press.
 *
 * The setter identity is stable (useCallback with no deps) so screens can
 * safely list it in `useEffect` dependency arrays without triggering an
 * infinite update loop.
 */
type VoiceClientCtx = {
  screen?: string
  currentChatRoomId?: string
  currentRequestId?: string
  draftFormState?: Record<string, unknown>
}

type VoiceContextValue = {
  context: VoiceClientCtx
  setContext: (next: VoiceClientCtx) => void
  clearContext: () => void
  /** Snapshot read for the mic button — bypasses React state staleness. */
  readContext: () => VoiceClientCtx
}

const VoiceContext = createContext<VoiceContextValue | null>(null)

export function VoiceContextProvider({ children }: { children: ReactNode }) {
  const [context, setLocal] = useState<VoiceClientCtx>({})
  const ref = useRef<VoiceClientCtx>(context)
  ref.current = context

  const setContext = useCallback((next: VoiceClientCtx) => {
    setLocal(next)
  }, [])
  const clearContext = useCallback(() => {
    setLocal({})
  }, [])
  const readContext = useCallback((): VoiceClientCtx => ref.current, [])

  const value = useMemo<VoiceContextValue>(
    () => ({ context, setContext, clearContext, readContext }),
    [context, setContext, clearContext, readContext],
  )

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
}

export function useVoiceContext(): VoiceContextValue {
  const ctx = useContext(VoiceContext)
  if (!ctx) {
    throw new Error('useVoiceContext must be used inside VoiceContextProvider')
  }
  return ctx
}
