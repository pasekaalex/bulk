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
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-purple-darker via-bulk-bg to-purple-darker p-3 sm:p-4">
      <BackButton />

      <div className="w-full max-w-lg bg-[#0e0e1a]/95 backdrop-blur-xl rounded-2xl border border-purple-DEFAULT/20 shadow-[0_0_50px_rgba(0,0,0,0.5),0_0_20px_rgba(155,77,202,0.1)] overflow-hidden">
        <div className="px-5 sm:px-8 pt-8 pb-6 max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <h1 className="text-3xl sm:text-4xl font-bold text-gold-DEFAULT text-shadow-gold text-center mb-6 font-[family-name:var(--font-display)] tracking-tighter">
          LEADERBOARD
        </h1>

        {/* Game tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-8 bg-black/20 p-1.5 rounded-xl border border-white/5">
          {GAMES.map((game) => (
            <button
              key={game.key}
              onClick={() => setActiveGame(game.key)}
              className={`px-4 py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer tracking-wider ${
                activeGame === game.key
                  ? 'bg-gradient-to-r from-gold-DEFAULT to-gold-dark text-black shadow-[0_0_15px_rgba(255,215,0,0.4)]'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {game.label}
            </button>
          ))}
        </div>

        {/* Leaderboard table */}
        <div className="bg-purple-darker/40 border border-purple-DEFAULT/20 rounded-xl sm:rounded-2xl overflow-hidden shadow-inner">
          {/* Header */}
          <div className="grid grid-cols-[3rem_1fr_5rem_4rem] sm:grid-cols-[3.5rem_1fr_6rem_6rem_5.5rem] gap-2 px-6 py-4 border-b border-purple-DEFAULT/20 text-[10px] text-white/30 font-bold tracking-[0.2em]">
            <div>RANK</div>
            <div>PLAYER</div>
            <div className="text-right">SCORE</div>
            <div className="text-right hidden sm:block">STATS</div>
            <div className="text-right">DATE</div>
          </div>

          {loading && (
            <div className="px-6 py-16 text-center text-white/20 text-sm animate-pulse font-bold tracking-widest">
              FETCHING SCORES...
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="px-6 py-16 text-center text-white/20 text-sm italic">
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
                    .map(([k, v]) => `${v}`)
                    .join(', ')
                : ''

              return (
                <div
                  key={entry.wallet_address}
                  className={`grid grid-cols-[3rem_1fr_5rem_4rem] sm:grid-cols-[3.5rem_1fr_6rem_6rem_5.5rem] gap-2 px-6 py-4 border-b border-white/[0.03] text-sm transition-all duration-300 ${
                    isCurrentUser
                      ? 'bg-purple-DEFAULT/15 border-l-4 border-l-purple-DEFAULT shadow-inner'
                      : isFirst
                        ? 'bg-gold-DEFAULT/5'
                        : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div
                    className={`font-bold flex items-center ${
                      isFirst ? 'text-gold-DEFAULT scale-110' : rank <= 3 ? 'text-white' : 'text-white/30 font-mono'
                    }`}
                  >
                    {isFirst ? '👑' : rank}
                  </div>
                  <div
                    className={`truncate flex items-center ${
                      isCurrentUser ? 'text-purple-DEFAULT font-bold' : isFirst ? 'text-gold-DEFAULT' : 'text-white/70'
                    }`}
                    title={entry.wallet_address}
                  >
                    {usernames.get(entry.wallet_address) ? (
                      <span className="font-bold font-[family-name:var(--font-display)] tracking-tight">
                        {usernames.get(entry.wallet_address)}
                      </span>
                    ) : (
                      <span className="font-mono text-xs opacity-80">{truncateWallet(entry.wallet_address)}</span>
                    )}
                    {isCurrentUser && (
                      <span className="ml-1.5 text-[8px] px-1.5 py-0.5 rounded-md bg-purple-DEFAULT/20 text-purple-DEFAULT font-bold uppercase">YOU</span>
                    )}
                  </div>
                  <div
                    className={`text-right font-bold flex items-center justify-end ${
                      isFirst ? 'text-gold-DEFAULT' : 'text-white/90'
                    }`}
                  >
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="text-right text-white/30 text-[11px] truncate hidden sm:flex items-center justify-end font-mono">
                    {statsStr}
                  </div>
                  <div className="text-right text-white/20 text-[10px] flex items-center justify-end font-mono">
                    {formatDate(entry.submitted_at)}
                  </div>
                </div>
              )
            })}
        </div>

        {!walletAddress && (
          <p className="text-center text-white/20 text-[10px] mt-8 font-bold tracking-[0.1em] uppercase">
            Connect wallet to rank up ⚡️
          </p>
        )}
        </div>
      </div>
    </div>
  )
}
