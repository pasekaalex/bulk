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
    <div className="min-h-screen bg-gradient-to-b from-purple-darker via-bulk-bg to-purple-darker">
      <BackButton />

      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-gold-DEFAULT text-shadow-gold text-center mb-4 font-[family-name:var(--font-display)]">
          ACHIEVEMENTS
        </h1>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="text-center text-sm text-white/70 mb-2 font-bold tracking-wider">
            {unlockedCount} / {totalCount} UNLOCKED
          </div>
          <div className="w-full h-4 bg-purple-darker border border-purple-DEFAULT/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-DEFAULT to-gold-dark rounded-full transition-all"
              style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Achievement groups */}
        {grouped.map(({ game, achievements }) => (
          <div key={game} className="mb-8">
            <h2 className="text-lg font-bold text-purple-DEFAULT mb-3 tracking-wider font-[family-name:var(--font-display)]">
              {game.toUpperCase()}
            </h2>
            <div className="flex flex-col gap-2">
              {achievements.map((a) => {
                const isUnlocked = !!unlocked[a.id]
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-xl border-2"
                    style={{
                      background: isUnlocked ? 'rgba(255, 215, 0, 0.15)' : 'rgba(155, 77, 202, 0.15)',
                      borderColor: isUnlocked ? '#FFD700' : 'rgba(155, 77, 202, 0.3)',
                      boxShadow: isUnlocked ? '0 0 15px rgba(255, 215, 0, 0.3)' : undefined,
                    }}
                  >
                    <span className="text-2xl">{isUnlocked ? a.icon : '\u{1F512}'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gold-DEFAULT font-[family-name:var(--font-display)]">
                        {a.title}
                      </div>
                      <div className="text-xs text-white/50">{a.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
