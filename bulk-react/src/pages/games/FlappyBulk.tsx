import { useRef, useState, useEffect, useCallback } from 'react'
import { ThreeCanvas } from '../../components/three/ThreeCanvas'
import { BackButton } from '../../components/layout/BackButton'
import { TitleScreen } from '../../components/ui/TitleScreen'
import { GameOverScreen } from '../../components/ui/GameOverScreen'
import { HUD } from '../../components/ui/HUD'
import { AchievementToast } from '../../components/ui/AchievementToast'
import { FlappyBulkEngine } from '../../engines/FlappyBulkEngine'
import { checkAndUnlock, type AchievementDef } from '../../lib/achievements'
import { useScoreSubmission } from '../../hooks/useLeaderboard'

export default function FlappyBulk() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<FlappyBulkEngine | null>(null)
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'win'>('title')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [rage, setRage] = useState(0)
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([])
  const { submit, state: submitState, reset: resetSubmit, wallet } = useScoreSubmission()

  useEffect(() => {
    if (gameState !== 'gameover') return
    resetSubmit()
    const newlyUnlocked = checkAndUnlock([
      { id: 'flappy_first', condition: score >= 1 },
      { id: 'flappy_10', condition: score >= 10 },
      { id: 'flappy_25', condition: score >= 25 },
      { id: 'flappy_50', condition: score >= 50 },
    ])
    if (newlyUnlocked.length > 0) setAchievementQueue((q) => [...q, ...newlyUnlocked])
  }, [gameState, score])

  useEffect(() => {
    if (!containerRef.current) return
    const engine = new FlappyBulkEngine(containerRef.current, {
      onScoreChange: setScore,
      onStateChange: setGameState,
      onHighScoreChange: setHighScore,
      onRageChange: setRage,
    })
    engineRef.current = engine
    engine.init()
    return () => engine.dispose()
  }, [])

  const handleStart = useCallback(() => {
    engineRef.current?.start()
  }, [])

  const handleRestart = useCallback(() => {
    engineRef.current?.restart()
  }, [])

  const handleSubmitScore = useCallback(() => {
    submit('flappy', score)
  }, [submit, score])

  return (
    <ThreeCanvas ref={containerRef}>
      <BackButton />
      {gameState === 'title' && (
        <TitleScreen
          title="FLAPPY BULK"
          subtitle="Fly through the city!"
          instructions={['Space / Click / Tap to flap', 'Collect orbs for RAGE MODE']}
          onStart={handleStart}
        />
      )}
      {gameState === 'playing' && (
        <>
          <HUD items={[{ label: 'Score', value: score }]} />
          <div className="absolute top-4 right-4 z-20 w-32">
            <div className="text-xs text-purple-DEFAULT font-bold mb-1">RAGE</div>
            <div className="w-full h-3 bg-purple-darker rounded-full overflow-hidden border border-purple-DEFAULT/50">
              <div
                className="h-full bg-gradient-to-r from-purple-DEFAULT to-[#ff00ff] rounded-full transition-all"
                style={{ width: `${rage}%` }}
              />
            </div>
          </div>
        </>
      )}
      {gameState === 'gameover' && (
        <GameOverScreen
          title="GAME OVER"
          score={score}
          highScore={highScore}
          onRestart={handleRestart}
          gameName="FLAPPY BULK"
          onSubmitScore={wallet ? handleSubmitScore : undefined}
          submitState={submitState}
        />
      )}
      {achievementQueue.length > 0 && (
        <AchievementToast
          achievement={achievementQueue[0]}
          onDone={() => setAchievementQueue((q) => q.slice(1))}
        />
      )}
    </ThreeCanvas>
  )
}
