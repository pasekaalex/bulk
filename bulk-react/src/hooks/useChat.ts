import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useBulkBalance } from './useBulkBalance'
import {
  fetchMessages,
  sendMessage as sendMessageApi,
  type ChatMessage,
} from '../lib/supabase'

export type SendState = 'idle' | 'sending' | 'sent' | 'error'

export function useChat() {
  const { publicKey } = useWallet()
  const { isHolder } = useBulkBalance()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sendState, setSendState] = useState<SendState>('idle')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    const data = await fetchMessages()
    setMessages(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    intervalRef.current = setInterval(refresh, 10_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!publicKey || !isHolder) return
      setSendState('sending')
      const result = await sendMessageApi(publicKey.toBase58(), text)
      if (result.success) {
        setSendState('sent')
        await refresh()
        setTimeout(() => setSendState('idle'), 1000)
      } else {
        setSendState('error')
        setTimeout(() => setSendState('idle'), 2000)
      }
    },
    [publicKey, isHolder, refresh],
  )

  return {
    messages,
    loading,
    refresh,
    sendMessage,
    sendState,
    wallet: publicKey?.toBase58() ?? null,
    isHolder,
  }
}
