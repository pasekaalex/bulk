import { useRef, useState, useEffect, useCallback } from 'react'
import { ThreeCanvas } from '../../components/three/ThreeCanvas'
import { BackButton } from '../../components/layout/BackButton'
import { TitleScreen } from '../../components/ui/TitleScreen'
import { GameOverScreen } from '../../components/ui/GameOverScreen'
import { HUD } from '../../components/ui/HUD'
import { AchievementToast } from '../../components/ui/AchievementToast'
import { BulkRunnerEngine } from '../../engines/BulkRunnerEngine'
import { checkAndUnlock, type AchievementDef } from '../../lib/achievements'
import { useScoreSubmission } from '../../hooks/useLeaderboard'

export default function BulkRunner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BulkRunnerEngine | null>(null)
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'win'>('title')
  const [score, setScore] = useState(0)
  const [money, setMoney] = useState(0)
  const [distance, setDistance] = useState(0)
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([])
  const { submit, state: submitState, reset: resetSubmit, wallet } = useScoreSubmission()

  useEffect(() => {
    if (gameState !== 'gameover') return
    resetSubmit()
    const newlyUnlocked = checkAndUnlock([
      { id: 'runner_500', condition: distance >= 500 },
      { id: 'runner_2000', condition: distance >= 2000 },
      { id: 'runner_money', condition: money >= 100 },
    ])
    if (newlyUnlocked.length > 0) setAchievementQueue((q) => [...q, ...newlyUnlocked])
  }, [gameState, distance, money])

  useEffect(() => {
    if (!containerRef.current) return
    const engine = new BulkRunnerEngine(containerRef.current, {
      onScoreChange: setScore,
      onStateChange: setGameState,
      onMoneyChange: setMoney,
      onDistanceChange: setDistance,
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
    submit('runner', score, { money, distance })
  }, [submit, score, money, distance])

  return (
    <ThreeCanvas ref={containerRef}>
      <BackButton />
      {gameState === 'title' && (
        <TitleScreen
          title="BULK RUNNER"
          subtitle="Run through the night city!"
          instructions={['Arrow keys / Swipe to change lanes', 'Space / Tap to jump']}
          onStart={handleStart}
        />
      )}
      {gameState === 'playing' && (
        <HUD items={[
          { label: 'Score', value: score },
          { label: 'Money', value: `$${money}` },
          { label: 'Distance', value: `${distance}m` },
        ]} />
      )}
      {gameState === 'gameover' && (
        <GameOverScreen
          title="GAME OVER"
          score={score}
          stats={{ Money: `$${money}`, Distance: `${distance}m` }}
          onRestart={handleRestart}
          gameName="BULK RUNNER"
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
