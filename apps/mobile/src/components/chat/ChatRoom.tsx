import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { api } from '@service-ops/convex/api'
import type { Doc, Id } from '@service-ops/convex/dataModel'
import type { ReplyTone } from '@service-ops/shared'
import { useAction, useMutation, useQuery } from 'convex/react'
import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { StatusBadge } from '@/components/StatusBadge'
import { useVoiceContext } from '@/components/voice'
import { useAudioRecording } from '@/components/voice/useAudioRecording'
import { formatServiceType } from '@/lib/format'
import { RecordingVisualizer } from './RecordingVisualizer'

export type ChatRoomProps = {
  chatRoomId: Id<'chatRooms'>
  /** Used by the parent layout's tabBar restoration when the screen blurs. */
  tabBarStyle?: object
}

type Message = Doc<'chatMessages'> & { sender: Doc<'users'> | null }

type Pending = {
  key: string
  text: string
  createdAt: number
}

const TONES: ReadonlyArray<{ value: ReplyTone; label: string }> = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'supportive', label: 'Supportive' },
  { value: 'funny', label: 'Funny' },
]

const MAX_RECORDING_MS = 30_000

const formatStamp = (ts: number): string => {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}

export function ChatRoom({ chatRoomId }: ChatRoomProps) {
  const params = useLocalSearchParams<{ draft?: string }>()
  const navigation = useNavigation()

  const room = useQuery(api.chat.listForUser)?.find((r) => r._id === chatRoomId)
  const messages = useQuery(api.chat.getMessages, { chatRoomId })
  const me = useQuery(api.users.currentAppUser)
  const send = useMutation(api.chat.sendMessage)
  const suggestReplies = useAction(api.ai.replySuggestions.suggestReplies)
  const generateUploadUrl = useAction(api.ai.transcribe.generateUploadUrl)
  const askAnything = useAction(api.ai.askAnything.askAnything)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<Pending[]>([])
  const [tone, setTone] = useState<ReplyTone>('friendly')
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestPanel, setShowSuggestPanel] = useState(false)
  const [voiceProcessing, setVoiceProcessing] = useState(false)

  const listRef = useRef<FlatList<Message | { _pending: Pending }>>(null)
  const consumedDraftRef = useRef(false)
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { isRecording, durationMs, startRecording, stopRecording } =
    useAudioRecording()

  // Voice context: tells the floating mic this screen is the active chat so
  // `draft_message` defaults to this room without requiring the LLM to pick.
  const { setContext } = useVoiceContext()
  useEffect(() => {
    setContext({ screen: 'chat', currentChatRoomId: chatRoomId })
    return () => setContext({})
  }, [chatRoomId, setContext])

  // Hide the bottom tabs while this screen is focused so the chat feels
  // full-screen (WhatsApp-style). Restore on blur.
  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent()
      const original =
        parent?.getState().routes.find((r) => r.name === 'messages')?.params ??
        undefined
      parent?.setOptions({ tabBarStyle: { display: 'none' } })
      return () => {
        parent?.setOptions({
          tabBarStyle: {
            backgroundColor: '#11151f',
            borderTopColor: '#232a3b',
          },
        })
        // Suppress unused warning; original is read for shape only.
        void original
      }
    }, [navigation]),
  )

  // Pre-fill the composer when navigated here with a `?draft=` param (from
  // voice → draft_message). Consume only once so subsequent edits stick.
  useEffect(() => {
    if (consumedDraftRef.current) return
    if (params.draft && params.draft.trim().length > 0) {
      setDraft(params.draft)
      consumedDraftRef.current = true
    }
  }, [params.draft])

  // Drop pending entries once their text appears in the server-side list.
  useEffect(() => {
    if (!messages || pending.length === 0) return
    setPending((prev) =>
      prev.filter(
        (p) =>
          !messages.some((m) => m.senderId === me?._id && m.text === p.text),
      ),
    )
  }, [messages, me?._id, pending.length])

  const combined = useMemo<Array<Message | { _pending: Pending }>>(() => {
    const base: Array<Message | { _pending: Pending }> = (messages ?? []).map(
      (m) => m,
    )
    for (const p of pending) base.push({ _pending: p })
    return base
  }, [messages, pending])

  const onSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || sending) return
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setPending((prev) => [...prev, { key, text, createdAt: Date.now() }])
    setDraft('')
    setSuggestions([])
    setShowSuggestPanel(false)
    setSending(true)
    try {
      await send({ chatRoomId, text })
    } catch (err) {
      setPending((prev) => prev.filter((p) => p.key !== key))
      setDraft(text)
      Alert.alert('Could not send', (err as Error).message)
    } finally {
      setSending(false)
    }
  }, [draft, sending, send, chatRoomId])

  const onSuggest = useCallback(async () => {
    if (suggesting) return
    setShowSuggestPanel(true)
    setSuggesting(true)
    try {
      const result = await suggestReplies({
        chatRoomId,
        composerText: draft.trim() || undefined,
        tone,
      })
      setSuggestions(result.suggestions)
    } catch (err) {
      Alert.alert('Could not suggest', (err as Error).message)
    } finally {
      setSuggesting(false)
    }
  }, [chatRoomId, draft, tone, suggesting, suggestReplies])

  // Voice → draft_message in this chat. Press-and-hold the inline mic.
  const onMicPressIn = useCallback(async () => {
    if (voiceProcessing) return
    const ok = await startRecording()
    if (!ok) {
      Alert.alert(
        'Microphone permission needed',
        'Allow microphone access in Settings to use voice.',
      )
      return
    }
    recordTimeoutRef.current = setTimeout(async () => {
      recordTimeoutRef.current = null
      await stopRecording()
    }, MAX_RECORDING_MS)
  }, [voiceProcessing, startRecording, stopRecording])

  const sendVoiceClip = useCallback(
    async (uri: string) => {
      setVoiceProcessing(true)
      try {
        const uploadUrl = await generateUploadUrl({})
        const audioRes = await fetch(uri)
        const blob = await audioRes.blob()
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'audio/m4a' },
          body: blob,
        })
        if (!uploadRes.ok)
          throw new Error(`Upload failed (${uploadRes.status})`)
        const { storageId } = (await uploadRes.json()) as {
          storageId: Id<'_storage'>
        }
        const response = await askAnything({
          audioStorageId: storageId,
          context: {
            screen: 'chat',
            role: me?.role,
            currentChatRoomId: chatRoomId,
          },
        })
        // In-chat we always treat the result as a message draft. Even if the
        // intent comes back as something else, we surface the transcription
        // so the user can edit and send.
        if (response.intent === 'draft_message' && 'draftText' in response) {
          setDraft(response.draftText)
        } else if (response.intent === 'unknown') {
          Alert.alert('Got it', response.message)
        } else if ('transcription' in response && response.transcription) {
          setDraft(response.transcription)
        }
      } catch (err) {
        Alert.alert('Voice failed', (err as Error).message)
      } finally {
        setVoiceProcessing(false)
      }
    },
    [generateUploadUrl, askAnything, chatRoomId, me?.role],
  )

  const onMicPressOut = useCallback(async () => {
    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current)
      recordTimeoutRef.current = null
    }
    if (!isRecording) return
    const uri = await stopRecording()
    if (uri) await sendVoiceClip(uri)
  }, [isRecording, stopRecording, sendVoiceClip])

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    if (combined.length === 0) return
    const id = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true })
    }, 50)
    return () => clearTimeout(id)
  }, [combined.length])

  const otherName =
    room?.client && me?._id !== room.client._id
      ? (room.client.name ?? room.client.email)
      : (room?.assignedWorker?.name ??
        room?.assignedWorker?.email ??
        'Unassigned')

  const hasText = draft.trim().length > 0
  const showSendBtn = hasText && !isRecording && !voiceProcessing

  return (
    <View className="flex-1 bg-surface-0">
      <Stack.Screen options={{ headerShown: false }} />

      {/* WhatsApp-style sticky header — back arrow + title + status */}
      <View className="border-surface-3 border-b bg-surface-1 pt-safe">
        <View className="flex-row items-center px-3 py-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            hitSlop={12}
            className="h-10 w-10 items-center justify-center rounded-full"
          >
            <Ionicons name="chevron-back" size={26} color="#e5e9f2" />
          </Pressable>

          <View className="ml-1 flex-1">
            <Text
              numberOfLines={1}
              className="font-semibold text-base text-surface-text"
            >
              {room ? formatServiceType(room.request.serviceType) : 'Chat'}
            </Text>
            <Text numberOfLines={1} className="text-sm text-surface-text-muted">
              {room ? otherName : 'Loading…'}
            </Text>
          </View>

          {room ? (
            <View className="ml-2">
              <StatusBadge status={room.request.status} />
            </View>
          ) : null}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        className="flex-1"
      >
        <FlatList
          ref={listRef}
          data={combined}
          keyExtractor={(item) =>
            '_pending' in item ? `pending:${item._pending.key}` : item._id
          }
          contentContainerClassName="px-3 pt-3 pb-3 gap-2"
          ListEmptyComponent={
            messages === undefined ? null : (
              <View className="items-center pt-16">
                <Ionicons
                  name="chatbubbles-outline"
                  size={32}
                  color="#5b6477"
                />
                <Text className="mt-3 text-base text-surface-text-muted">
                  No messages yet
                </Text>
                <Text className="mt-1 text-sm text-surface-text-muted">
                  Say hi to get the conversation started.
                </Text>
              </View>
            )
          }
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          renderItem={({ item }) => {
            if ('_pending' in item) {
              return (
                <View className="items-end">
                  <View className="max-w-[80%] rounded-2xl rounded-br-sm bg-brand-500/70 px-3 py-2">
                    <Text className="text-base text-white">
                      {item._pending.text}
                    </Text>
                    <Text className="mt-1 text-right text-white/70 text-xs">
                      sending…
                    </Text>
                  </View>
                </View>
              )
            }
            const own = item.senderId === me?._id
            return (
              <View className={own ? 'items-end' : 'items-start'}>
                <View
                  className={`max-w-[80%] px-3 py-2 ${
                    own
                      ? 'rounded-2xl rounded-br-sm bg-brand-500'
                      : 'rounded-2xl rounded-bl-sm bg-surface-2'
                  }`}
                >
                  <Text
                    className={`text-base ${own ? 'text-white' : 'text-surface-text'}`}
                  >
                    {item.text}
                  </Text>
                  <Text
                    className={`mt-1 text-right text-xs ${
                      own ? 'text-white/70' : 'text-surface-text-muted'
                    }`}
                  >
                    {formatStamp(item.createdAt)}
                  </Text>
                </View>
              </View>
            )
          }}
        />

        {/* Suggestions panel — slides in above the composer when toggled */}
        {showSuggestPanel ? (
          <View className="border-surface-3 border-t bg-surface-1 px-3 pt-3 pb-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-surface-text-muted text-xs uppercase tracking-widest">
                Suggest a reply
              </Text>
              <Pressable
                onPress={() => setShowSuggestPanel(false)}
                hitSlop={8}
                className="rounded-full p-1"
              >
                <Ionicons name="close" size={16} color="#9aa3b6" />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 py-2 pr-2"
            >
              {TONES.map((t) => {
                const selected = tone === t.value
                return (
                  <Pressable
                    key={t.value}
                    accessibilityRole="button"
                    onPress={() => {
                      setTone(t.value)
                      void onSuggest()
                    }}
                    className={
                      selected
                        ? 'rounded-full bg-brand-500 px-3 py-1'
                        : 'rounded-full border border-surface-3 bg-surface-2 px-3 py-1'
                    }
                  >
                    <Text
                      className={
                        selected
                          ? 'font-semibold text-white text-xs'
                          : 'text-surface-text text-xs'
                      }
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {suggesting ? (
              <View className="flex-row items-center gap-2 py-3">
                <ActivityIndicator size="small" color="#87b6ff" />
                <Text className="text-sm text-surface-text-muted">
                  Drafting suggestions…
                </Text>
              </View>
            ) : suggestions.length === 0 ? (
              <Text className="py-3 text-sm text-surface-text-muted">
                Pick a tone — I'll suggest 3 replies.
              </Text>
            ) : (
              <View className="gap-2 py-1">
                {suggestions.map((s) => (
                  <Pressable
                    key={s}
                    accessibilityRole="button"
                    onPress={() => {
                      setDraft(s)
                      setSuggestions([])
                      setShowSuggestPanel(false)
                    }}
                    className="rounded-2xl border border-surface-3 bg-surface-0 px-3 py-2"
                  >
                    <Text className="text-sm text-surface-text">{s}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Composer */}
        <View className="border-surface-3 border-t bg-surface-1 px-3 pt-2 pb-safe">
          <View className="flex-row items-end gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (showSuggestPanel) {
                  setShowSuggestPanel(false)
                } else {
                  void onSuggest()
                }
              }}
              disabled={suggesting}
              hitSlop={6}
              className="h-10 w-10 items-center justify-center rounded-full"
            >
              <Ionicons
                name={showSuggestPanel ? 'close' : 'sparkles-outline'}
                size={20}
                color={showSuggestPanel ? '#9aa3b6' : '#87b6ff'}
              />
            </Pressable>

            <View className="min-h-[40px] flex-1 justify-center rounded-2xl bg-surface-2 px-3 py-2">
              {isRecording ? (
                <RecordingVisualizer durationMs={durationMs} />
              ) : voiceProcessing ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#87b6ff" />
                  <Text className="text-sm text-surface-text-muted">
                    Transcribing…
                  </Text>
                </View>
              ) : (
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Message"
                  placeholderTextColor="#5b6477"
                  multiline
                  blurOnSubmit={false}
                  className="text-base text-surface-text"
                  style={{ maxHeight: 120, paddingTop: 0, paddingBottom: 0 }}
                />
              )}
            </View>

            {showSendBtn ? (
              <Pressable
                key="send-btn"
                accessibilityRole="button"
                disabled={sending}
                onPress={onSend}
                hitSlop={6}
                className="h-10 w-10 items-center justify-center rounded-full bg-brand-500"
              >
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </Pressable>
            ) : (
              <Pressable
                key="mic-btn"
                accessibilityRole="button"
                onPressIn={onMicPressIn}
                onPressOut={onMicPressOut}
                disabled={voiceProcessing}
                hitSlop={6}
                className={
                  isRecording
                    ? 'h-10 w-10 items-center justify-center rounded-full bg-status-progress'
                    : 'h-10 w-10 items-center justify-center rounded-full bg-surface-3'
                }
              >
                <MaterialCommunityIcons
                  name={isRecording ? 'stop' : 'waveform'}
                  size={20}
                  color={isRecording ? '#fff' : '#e5e9f2'}
                />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
