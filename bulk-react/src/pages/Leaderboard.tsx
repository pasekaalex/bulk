import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { BackButton } from '../components/layout/BackButton'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { fetchProfiles } from '../lib/supabase'

const GAMES = [
  { key: 'flappy', label: 'FLAPPY BULK' },
  { key: 'climb', label: 'BULK CLIMB' },
  { key: 'runner', label: 'BULK RUNNER' },
  { key: 'rampage', label: 'BULK RAMPAGE' },
] as const

function truncateWallet(address: string): string {
  if (address.length <= 8) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Leaderboard() {
  const [activeGame, setActiveGame] = useState<string>('flappy')
  const { entries, loading, refresh } = useLeaderboard(activeGame)
  const { publicKey } = useWallet()
  const walletAddress = publicKey?.toBase58() ?? null
  const [usernames, setUsernames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    refresh()
  }, [activeGame, refresh])

  useEffect(() => {
    if (entries.length === 0) return
    const wallets = entries.map((e) => e.wallet_address)
    fetchProfiles(wallets).then(setUsernames)
  }, [entries])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-darker via-bulk-bg to-purple-darker">
      <BackButton />

      <div className="w-full max-w-lg mx-4 my-8 bg-[#0e0e1a] rounded-2xl border border-purple-DEFAULT/30 shadow-[0_0_40px_rgba(155,77,202,0.2)] overflow-hidden">
        <div className="px-5 pt-6 pb-5">
        <h1 className="text-3xl sm:text-4xl font-bold text-gold-DEFAULT text-shadow-gold text-center mb-5 font-[family-name:var(--font-display)]">
          LEADERBOARD
        </h1>

        {/* Game tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-5">
          {GAMES.map((game) => (
            <button
              key={game.key}
              onClick={() => setActiveGame(game.key)}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeGame === game.key
                  ? 'bg-gradient-to-r from-gold-DEFAULT to-gold-dark text-black shadow-[0_0_15px_rgba(255,215,0,0.5)]'
                  : 'bg-purple-darker/80 border border-purple-DEFAULT/50 text-white/70 hover:border-purple-DEFAULT hover:text-white'
              }`}
            >
              {game.label}
            </button>
          ))}
        </div>

        {/* Leaderboard table */}
        <div className="bg-purple-darker/60 border border-purple-DEFAULT/30 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[3rem_1fr_5rem_4rem] sm:grid-cols-[3rem_1fr_5rem_6rem_5rem] gap-2 px-4 py-3 border-b border-purple-DEFAULT/30 text-xs text-white/50 font-bold tracking-wider">
            <div>#</div>
            <div>PLAYER</div>
            <div className="text-right">SCORE</div>
            <div className="text-right hidden sm:block">STATS</div>
            <div className="text-right">DATE</div>
          </div>

          {loading && (
            <div className="px-4 py-12 text-center text-white/40 text-sm animate-pulse">
              Loading scores...
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="px-4 py-12 text-center text-white/40 text-sm">
              No scores yet. Be the first!
            </div>
          )}

          {!loading &&
            entries.map((entry, i) => {
              const rank = i + 1
              const isCurrentUser = walletAddress === entry.wallet_address
              const isFirst = rank === 1

              const statsStr = entry.stats
                ? Object.entries(entry.stats)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ')
                : ''

              return (
                <div
                  key={entry.wallet_address}
                  className={`grid grid-cols-[3rem_1fr_5rem_4rem] sm:grid-cols-[3rem_1fr_5rem_6rem_5rem] gap-2 px-4 py-3 border-b border-purple-DEFAULT/10 text-sm transition-colors ${
                    isCurrentUser
                      ? 'bg-purple-DEFAULT/20 border-l-2 border-l-purple-DEFAULT'
                      : isFirst
                        ? 'bg-gold-DEFAULT/10'
                        : 'hover:bg-purple-DEFAULT/10'
                  }`}
                >
                  <div
                    className={`font-bold ${
                      isFirst ? 'text-gold-DEFAULT' : rank <= 3 ? 'text-white' : 'text-white/50'
                    }`}
                  >
                    {rank}
                  </div>
                  <div
                    className={`truncate ${
                      isCurrentUser ? 'text-purple-DEFAULT font-bold' : isFirst ? 'text-gold-DEFAULT' : 'text-white/80'
                    }`}
                    title={entry.wallet_address}
                  >
                    {usernames.get(entry.wallet_address) ? (
                      <span className="font-bold font-[family-name:var(--font-display)]">
                        {usernames.get(entry.wallet_address)}
                      </span>
                    ) : (
                      <span className="font-mono">{truncateWallet(entry.wallet_address)}</span>
                    )}
                    {isCurrentUser && (
                      <span className="ml-1 text-[10px] text-purple-DEFAULT/80">(you)</span>
                    )}
                  </div>
                  <div
                    className={`text-right font-bold ${
                      isFirst ? 'text-gold-DEFAULT' : 'text-white'
                    }`}
                  >
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="text-right text-white/40 text-xs truncate hidden sm:block">
                    {statsStr}
                  </div>
                  <div className="text-right text-white/40 text-xs">
                    {formatDate(entry.submitted_at)}
                  </div>
                </div>
              )
            })}
        </div>

        {!walletAddress && (
          <p className="text-center text-white/30 text-xs mt-4">
            Connect wallet to see your rank highlighted
          </p>
        )}
        </div>
      </div>
    </div>
  )
}
