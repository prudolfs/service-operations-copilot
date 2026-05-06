import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

const useOnForeground = (onForeground: () => void) => {
  const previous = useRef<AppStateStatus>(AppState.currentState)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (previous.current !== 'active' && next === 'active') {
        onForeground()
      }
      previous.current = next
    })
    return () => sub.remove()
  }, [onForeground])
}

export const ActiveAppState = { useOnForeground }
