import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useBulkBalance } from '../../hooks/useBulkBalance'

export function WalletButton() {
  const { publicKey, disconnect, connecting } = useWallet()
  const { setVisible } = useWalletModal()
  const { balance, isHolder, loading } = useBulkBalance()

  console.log('[WalletButton] publicKey:', publicKey?.toBase58(), 'balance:', balance, 'isHolder:', isHolder, 'loading:', loading)

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

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 py-2 px-4 bg-bulk-bg/80 border-2 border-purple-DEFAULT/60 rounded-xl text-white text-xs font-mono">
        <span>{truncated}</span>
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
      <p className="text-white/30 text-[0.55rem] absolute -bottom-4 left-0 right-0 text-center pointer-events-none">
        Read-only — no transactions
      </p>
    </div>
  )
}
