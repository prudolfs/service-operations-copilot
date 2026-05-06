import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Press-and-hold microphone recording. Mirrors seniory's hook so the audio
 * format stays compatible with the Convex `ai.transcribe` action (m4a → Groq).
 */
export function useAudioRecording() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [isRecording, setIsRecording] = useState(false)
  const [durationMs, setDurationMs] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startRecording = useCallback(async (): Promise<boolean> => {
    const status = await AudioModule.requestRecordingPermissionsAsync()
    if (!status.granted) return false

    await AudioModule.setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    })

    await recorder.prepareToRecordAsync()
    recorder.record()

    startTimeRef.current = Date.now()
    setDurationMs(0)
    setIsRecording(true)

    intervalRef.current = setInterval(() => {
      setDurationMs(Date.now() - startTimeRef.current)
    }, 200)
    return true
  }, [recorder])

  const stopRecording = useCallback(async (): Promise<string | null> => {
    clearTimer()
    setIsRecording(false)
    setDurationMs(0)

    await recorder.stop()
    // Small delay so the OS finalizes the file (writes the moov atom).
    await new Promise((r) => setTimeout(r, 200))
    return recorder.uri ?? null
  }, [recorder, clearTimer])

  useEffect(() => {
    return () => {
      clearTimer()
      try {
        if (recorder.isRecording) {
          recorder.stop()
        }
      } catch {
        // Native object may already be deallocated on unmount.
      }
    }
  }, [recorder, clearTimer])

  return { isRecording, durationMs, startRecording, stopRecording }
}
