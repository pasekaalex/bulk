import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useBulkBalance } from '../../hooks/useBulkBalance'
import { useProfile } from '../../hooks/useProfile'

export function WalletButton() {
  const { publicKey, disconnect, connecting } = useWallet()
  const { setVisible } = useWalletModal()
  const { balance, isHolder, loading } = useBulkBalance()
  const { username, loading: profileLoading, setUsername } = useProfile()
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-br from-purple-DEFAULT to-purple-dark border-2 border-gold-DEFAULT rounded-xl text-white font-bold text-sm font-[family-name:var(--font-display)] shadow-[0_0_20px_rgba(155,77,202,0.6)] transition-all min-h-[44px] cursor-pointer hover:scale-105 hover:shadow-[0_0_35px_rgba(155,77,202,0.8)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M2 10h20" />
        </svg>
        {connecting ? 'CONNECTING...' : 'CONNECT WALLET'}
      </button>
    )
  }

  const truncated = publicKey.toBase58().slice(0, 4) + '...' + publicKey.toBase58().slice(-4)

  const handleSetUsername = async () => {
    const trimmed = nameInput.trim()
    if (trimmed.length < 2 || trimmed.length > 16) {
      setError('2-16 characters')
      return
    }
    setSaving(true)
    setError(null)
    const result = await setUsername(trimmed)
    setSaving(false)
    if (!result.success) {
      setError(result.error === 'duplicate key value violates unique constraint "profiles_username_key"'
        ? 'Username taken'
        : result.error ?? 'Failed')
    } else {
      setNameInput('')
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 py-2 px-4 bg-bulk-bg/80 border-2 border-purple-DEFAULT/60 rounded-xl text-white text-xs font-mono">
          {username && (
            <span className="text-gold-DEFAULT font-bold font-[family-name:var(--font-display)] text-sm not-italic">
              {username}
            </span>
          )}
          <span className={username ? 'text-white/40' : ''}>{truncated}</span>
          {loading ? (
            <span className="text-white/50">...</span>
          ) : balance !== null ? (
            <span className="text-gold-DEFAULT font-bold">{balance.toLocaleString()} $BULK</span>
          ) : null}
          {isHolder && (
            <span className="py-0.5 px-2 bg-gradient-to-r from-gold-DEFAULT to-gold-dark text-black text-[0.6rem] font-bold rounded-md shadow-[0_0_10px_rgba(255,215,0,0.5)]">
              HOLDER
            </span>
          )}
        </div>
        <button
          onClick={() => disconnect()}
          className="py-2 px-3 bg-transparent border border-white/20 rounded-lg text-white/50 text-xs cursor-pointer hover:border-white/50 hover:text-white transition-all"
        >
          X
        </button>
      </div>
      {!profileLoading && !username && (
        <div className="flex items-center gap-1 mt-1">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetUsername()}
            placeholder="Pick a username"
            maxLength={16}
            className="w-28 px-2 py-1 bg-bulk-bg/80 border border-purple-DEFAULT/50 rounded-lg text-white text-xs outline-none focus:border-gold-DEFAULT placeholder:text-white/30"
          />
          <button
            onClick={handleSetUsername}
            disabled={saving}
            className="px-2 py-1 bg-gradient-to-r from-gold-DEFAULT to-gold-dark text-black text-xs font-bold rounded-lg cursor-pointer hover:scale-105 transition-all disabled:opacity-50"
          >
            {saving ? '...' : 'SET'}
          </button>
          {error && <span className="text-red-400 text-[10px]">{error}</span>}
        </div>
      )}
    </div>
  )
}
