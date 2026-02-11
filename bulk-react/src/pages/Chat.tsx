import { useState, useEffect, useRef } from 'react'
import { BackButton } from '../components/layout/BackButton'
import { useChat } from '../hooks/useChat'
import { fetchProfiles } from '../lib/supabase'

function truncateWallet(address: string): string {
  if (address.length <= 8) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Chat() {
  const { messages, loading, sendMessage, sendState, wallet, isHolder } = useChat()
  const [input, setInput] = useState('')
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length === 0) return
    const wallets = [...new Set(messages.map((m) => m.wallet_address))]
    fetchProfiles(wallets).then(setUsernames)
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || sendState === 'sending') return
    setInput('')
    await sendMessage(trimmed)
  }

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-b from-purple-darker via-bulk-bg to-purple-darker">
      <BackButton />

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 pt-16 pb-4">
        <h1 className="text-4xl sm:text-5xl font-bold text-gold-DEFAULT text-shadow-gold text-center mb-4 font-[family-name:var(--font-display)]">
          BULK CHAT
        </h1>
        <p className="text-center text-white/40 text-xs mb-4">
          Holders-only chat wall. Hold 10K $BULK to post.
        </p>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-purple-darker/40 border border-purple-DEFAULT/30 rounded-xl p-3 mb-3 flex flex-col gap-2">
          {loading && (
            <div className="text-center text-white/40 text-sm animate-pulse py-8">
              Loading messages...
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="text-center text-white/40 text-sm py-8">
              No messages yet. Be the first to say something!
            </div>
          )}

          {messages.map((msg) => {
            const isOwn = wallet === msg.wallet_address
            const name = usernames.get(msg.wallet_address)

            return (
              <div
                key={msg.id}
                className={`flex flex-col px-3 py-2 rounded-xl max-w-[85%] ${
                  isOwn
                    ? 'self-end bg-purple-DEFAULT/30 border border-purple-DEFAULT/50'
                    : 'self-start bg-purple-darker/60 border border-purple-DEFAULT/20'
                }`}
              >
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span
                    className={`text-xs font-bold ${
                      isOwn ? 'text-purple-DEFAULT' : 'text-gold-DEFAULT'
                    } font-[family-name:var(--font-display)]`}
                  >
                    {name || truncateWallet(msg.wallet_address)}
                  </span>
                  <span className="text-[10px] text-white/30">{formatTime(msg.created_at)}</span>
                </div>
                <p className="text-sm text-white/90 break-words">{msg.message}</p>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        {!wallet ? (
          <div className="text-center py-3 text-white/40 text-sm border border-purple-DEFAULT/30 rounded-xl bg-purple-darker/40">
            Connect wallet to chat
          </div>
        ) : !isHolder ? (
          <div className="text-center py-3 text-gold-DEFAULT/60 text-sm border border-gold-DEFAULT/30 rounded-xl bg-purple-darker/40">
            Hold 10K $BULK to chat
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              maxLength={280}
              className="flex-1 px-4 py-3 bg-purple-darker/60 border border-purple-DEFAULT/40 rounded-xl text-white text-sm outline-none focus:border-gold-DEFAULT placeholder:text-white/30 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={sendState === 'sending' || !input.trim()}
              className="px-5 py-3 bg-gradient-to-r from-gold-DEFAULT to-gold-dark text-black font-bold text-sm rounded-xl cursor-pointer hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-[family-name:var(--font-display)]"
            >
              {sendState === 'sending' ? '...' : 'SEND'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
