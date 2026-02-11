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
    <div className="h-dvh flex flex-col bg-[#0e0e1a]">
      <BackButton />

      {/* Header bar */}
      <div className="shrink-0 pt-14 pb-3 px-4 bg-[#1a1a2e]/90 border-b border-purple-DEFAULT/20 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-DEFAULT to-gold-DEFAULT flex items-center justify-center shadow-[0_0_15px_rgba(155,77,202,0.4)]">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white font-[family-name:var(--font-display)] tracking-wide">
              BULK CHAT
            </h1>
            <p className="text-[10px] text-white/30 tracking-wider">
              HOLD 10K $BULK TO POST
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-1">
          {loading && (
            <div className="text-center text-white/30 text-sm animate-pulse py-16">
              Loading messages...
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="text-center text-white/30 text-sm py-16">
              No messages yet. Be the first!
            </div>
          )}

          {messages.map((msg, i) => {
            const isOwn = wallet === msg.wallet_address
            const name = usernames.get(msg.wallet_address)
            const prev = messages[i - 1]
            const sameSender = prev && prev.wallet_address === msg.wallet_address
            const showName = !sameSender

            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showName ? 'mt-3' : 'mt-0.5'}`}
              >
                <div
                  className={`relative max-w-[80%] sm:max-w-[70%] px-3 py-1.5 ${
                    isOwn
                      ? 'bg-gradient-to-br from-purple-DEFAULT/40 to-purple-DEFAULT/25 rounded-2xl rounded-br-md'
                      : 'bg-[#1e1e35] rounded-2xl rounded-bl-md'
                  }`}
                >
                  {showName && (
                    <div className={`text-xs font-bold mb-0.5 ${
                      isOwn ? 'text-purple-DEFAULT' : 'text-gold-DEFAULT'
                    } font-[family-name:var(--font-display)]`}>
                      {name || truncateWallet(msg.wallet_address)}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <p className="text-[13px] text-white/90 break-words leading-snug flex-1">
                      {msg.message}
                    </p>
                    <span className="text-[9px] text-white/25 whitespace-nowrap shrink-0 translate-y-[1px]">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-purple-DEFAULT/15 bg-[#1a1a2e]/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-3 py-2.5">
          {!wallet ? (
            <div className="text-center py-2.5 text-white/30 text-sm">
              Connect wallet to chat
            </div>
          ) : !isHolder ? (
            <div className="text-center py-2.5 text-gold-DEFAULT/50 text-sm">
              Hold 10K $BULK to chat
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message..."
                maxLength={280}
                className="flex-1 px-4 py-2.5 bg-[#12121f] border border-white/10 rounded-full text-white text-sm outline-none focus:border-purple-DEFAULT/60 placeholder:text-white/25 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={sendState === 'sending' || !input.trim()}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-DEFAULT to-purple-dark flex items-center justify-center cursor-pointer hover:scale-105 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-[0_0_12px_rgba(155,77,202,0.4)]"
              >
                {sendState === 'sending' ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 translate-x-[1px]">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
