import { useState, useEffect } from 'react'
import { BackButton } from '../components/layout/BackButton'
import { ALL_ACHIEVEMENTS, getUnlocked, syncBulkagachi } from '../lib/achievements'

export default function Achievements() {
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Sync Bulkagachi achievements from engine's localStorage
    try {
      const raw = localStorage.getItem('bulkagachi')
      if (raw) {
        const state = JSON.parse(raw)
        if (state.achievements) {
          syncBulkagachi(state.achievements)
        }
      }
    } catch { /* ignore */ }

    setUnlocked(getUnlocked())
  }, [])

  const unlockedCount = ALL_ACHIEVEMENTS.filter((a) => unlocked[a.id]).length
  const totalCount = ALL_ACHIEVEMENTS.length

  // Group by game
  const games = ['Flappy Bulk', 'Bulk Climb', 'Bulk Runner', 'Bulk Rampage', 'Bulkagachi']
  const grouped = games.map((game) => ({
    game,
    achievements: ALL_ACHIEVEMENTS.filter((a) => a.game === game),
  }))

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-purple-darker via-bulk-bg to-purple-darker p-3 sm:p-4">
      <BackButton />

      <div className="w-full max-w-lg bg-[#0e0e1a]/95 backdrop-blur-xl rounded-2xl border border-purple-DEFAULT/20 shadow-[0_0_50px_rgba(0,0,0,0.5),0_0_20px_rgba(155,77,202,0.1)] overflow-hidden">
        <div className="px-6 sm:px-8 pt-8 pb-6 max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <h1 className="text-3xl sm:text-4xl font-bold text-gold-DEFAULT text-shadow-gold text-center mb-6 font-[family-name:var(--font-display)] tracking-tighter">
          ACHIEVEMENTS
        </h1>

        {/* Progress bar */}
        <div className="mb-10 bg-purple-darker/40 p-4 rounded-xl border border-purple-DEFAULT/10">
          <div className="flex justify-between items-end mb-2">
            <div className="text-[10px] text-white/40 font-bold tracking-[0.2em]">
              PROGRESS
            </div>
            <div className="text-sm text-gold-DEFAULT font-bold tracking-tight">
              {unlockedCount} <span className="text-white/30 mx-0.5">/</span> {totalCount}
            </div>
          </div>
          <div className="w-full h-3 bg-black/40 border border-purple-DEFAULT/20 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-gold-DEFAULT via-gold-light to-gold-dark rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,215,0,0.4)]"
              style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Achievement groups */}
        {grouped.map(({ game, achievements }) => (
          <div key={game} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xs font-bold text-purple-DEFAULT tracking-[0.3em] font-[family-name:var(--font-display)]">
                {game.toUpperCase()}
              </h2>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-purple-DEFAULT/30 to-transparent" />
            </div>
            <div className="flex flex-col gap-3">
              {achievements.map((a) => {
                const isUnlocked = !!unlocked[a.id]
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                      isUnlocked 
                        ? 'bg-gradient-to-br from-gold-DEFAULT/15 to-gold-DEFAULT/5 border-gold-DEFAULT/40 shadow-[0_0_20px_rgba(255,215,0,0.1)]' 
                        : 'bg-white/[0.03] border-white/5 opacity-60'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner ${
                      isUnlocked ? 'bg-gold-DEFAULT/20' : 'bg-black/20'
                    }`}>
                      {isUnlocked ? a.icon : '\u{1F512}'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold font-[family-name:var(--font-display)] tracking-tight mb-0.5 ${
                        isUnlocked ? 'text-gold-DEFAULT' : 'text-white/60'
                      }`}>
                        {a.title}
                      </div>
                      <div className="text-[11px] text-white/40 leading-snug italic line-clamp-2">
                        {a.desc}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  )
}
