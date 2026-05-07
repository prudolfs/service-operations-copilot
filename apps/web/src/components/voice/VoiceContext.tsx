import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react'

export type VoiceContextState = {
  screen?: string
  currentChatRoomId?: string
  currentRequestId?: string
  draftFormState?: Record<string, unknown>
}

type ContextValue = {
  context: VoiceContextState
  setContext: (next: VoiceContextState) => void
}

const Ctx = createContext<ContextValue | null>(null)

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<VoiceContextState>({})
  const value = useMemo(() => ({ context, setContext }), [context])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useVoiceContext(): ContextValue {
  const v = useContext(Ctx)
  if (!v) {
    throw new Error('useVoiceContext must be used inside <VoiceProvider>')
  }
  return v
}
