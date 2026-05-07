import { useCallback, useEffect, useRef, useState } from 'react'

type RecorderState = {
  isRecording: boolean
  durationMs: number
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    durationMs: 0,
  })
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef<number>(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    const stream = recorderRef.current?.stream
    stream?.getTracks().forEach((t) => {
      t.stop()
    })
    recorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      alert('Microphone is not available in this environment.')
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      )
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorderRef.current = recorder
      startedAtRef.current = Date.now()
      recorder.start()
      setState({ isRecording: true, durationMs: 0 })
      tickRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          durationMs: Date.now() - startedAtRef.current,
        }))
      }, 100)
      return true
    } catch (err) {
      console.warn('Failed to start recording', err)
      alert('Microphone permission was denied.')
      return false
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<{
    blob: Blob
    mimeType: string
  } | null> => {
    const recorder = recorderRef.current
    if (!recorder) return null
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        cleanup()
        setState({ isRecording: false, durationMs: 0 })
        resolve({ blob, mimeType })
      }
      try {
        recorder.stop()
      } catch {
        cleanup()
        setState({ isRecording: false, durationMs: 0 })
        resolve(null)
      }
    })
  }, [cleanup])

  return {
    isRecording: state.isRecording,
    durationMs: state.durationMs,
    startRecording,
    stopRecording,
  }
}
