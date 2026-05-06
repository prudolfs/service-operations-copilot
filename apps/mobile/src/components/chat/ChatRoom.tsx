import { api } from '@service-ops/convex/api'
import type { Doc, Id } from '@service-ops/convex/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { Stack } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { GlassSurface } from '@/components/parallax'
import { StatusBadge } from '@/components/StatusBadge'
import { formatServiceType } from '@/lib/format'

export type ChatRoomProps = {
  chatRoomId: Id<'chatRooms'>
  eyebrow: string
}

type Message = Doc<'chatMessages'> & { sender: Doc<'users'> | null }

type Pending = {
  key: string
  text: string
  createdAt: number
}

const formatStamp = (ts: number): string => {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}

export function ChatRoom({ chatRoomId, eyebrow }: ChatRoomProps) {
  const room = useQuery(api.chat.listForUser)?.find((r) => r._id === chatRoomId)
  const messages = useQuery(api.chat.getMessages, { chatRoomId })
  const me = useQuery(api.users.currentAppUser)
  const send = useMutation(api.chat.sendMessage)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pending, setPending] = useState<Pending[]>([])
  const listRef = useRef<FlatList<Message | { _pending: Pending }>>(null)

  // Drop pending entries once their text appears in the server-side list. We
  // identify by exact text + same sender so duplicate sends aren't merged.
  useEffect(() => {
    if (!messages || pending.length === 0) return
    const ownTexts = new Set(
      messages
        .filter((m) => m.senderId === me?._id)
        .map((m) => `${m.text}|${m.createdAt}`),
    )
    setPending((prev) =>
      prev.filter(
        (p) =>
          !messages.some((m) => m.senderId === me?._id && m.text === p.text) ||
          ownTexts.size === 0,
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

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    if (combined.length === 0) return
    const id = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true })
    }, 50)
    return () => clearTimeout(id)
  }, [combined.length])

  return (
    <View className="flex-1 bg-surface-0 pt-safe">
      <Stack.Screen options={{ title: 'Chat' }} />

      <View className="px-6 pt-6 pb-4">
        <Text className="text-brand-300 text-sm uppercase tracking-[0.32em]">
          {eyebrow}
        </Text>
        {room ? (
          <>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="font-black text-2xl text-surface-text">
                {formatServiceType(room.request.serviceType)}
              </Text>
              <StatusBadge status={room.request.status} />
            </View>
            <Text className="mt-1 text-sm text-surface-text-muted">
              {room.client?.name ?? room.client?.email ?? 'Client'} ·{' '}
              {room.assignedWorker?.name ??
                room.assignedWorker?.email ??
                'Unassigned'}
            </Text>
          </>
        ) : (
          <Text className="mt-2 text-base text-surface-text-muted">
            Loading conversation…
          </Text>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        className="flex-1"
      >
        <FlatList
          ref={listRef}
          data={combined}
          keyExtractor={(item) =>
            '_pending' in item ? `pending:${item._pending.key}` : item._id
          }
          contentContainerClassName="px-4 pb-4 gap-2"
          ListEmptyComponent={
            messages === undefined ? null : (
              <View className="px-4 pt-8">
                <GlassSurface style={{ padding: 24 }}>
                  <Text className="text-base text-surface-text-muted">
                    Say hi to get the conversation started.
                  </Text>
                </GlassSurface>
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
                  <View className="max-w-[80%] rounded-2xl rounded-br-sm bg-brand-500/70 px-4 py-2">
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
            const senderName =
              item.sender?.name ?? item.sender?.email ?? 'Unknown'
            return (
              <View className={own ? 'items-end' : 'items-start'}>
                <View
                  className={`max-w-[80%] px-4 py-2 ${
                    own
                      ? 'rounded-2xl rounded-br-sm bg-brand-500'
                      : 'rounded-2xl rounded-bl-sm border border-surface-3 bg-surface-1'
                  }`}
                >
                  {!own && (
                    <Text className="font-semibold text-brand-300 text-xs">
                      {senderName}
                    </Text>
                  )}
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

        <View className="border-surface-3 border-t bg-surface-0 px-4 pt-3 pb-safe">
          <GlassSurface variant="input" focused={focused}>
            <View className="flex-row items-end gap-2 px-3 py-2">
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Type a message"
                placeholderTextColor="#5b6477"
                multiline
                onSubmitEditing={onSend}
                blurOnSubmit={false}
                className="flex-1 text-base text-surface-text"
                style={{ maxHeight: 120, minHeight: 36 }}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!draft.trim() || sending}
                onPress={onSend}
                className={`rounded-xl px-4 py-2 ${
                  draft.trim() && !sending
                    ? 'bg-brand-500 active:bg-brand-600'
                    : 'bg-surface-2'
                }`}
              >
                <Text className="font-semibold text-sm text-white">Send</Text>
              </Pressable>
            </View>
          </GlassSurface>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}
