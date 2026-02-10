import { useRef, useState, useEffect, useCallback } from 'react'
import { ThreeCanvas } from '../../components/three/ThreeCanvas'
import { BackButton } from '../../components/layout/BackButton'
import { TitleScreen } from '../../components/ui/TitleScreen'
import { GameOverScreen } from '../../components/ui/GameOverScreen'
import { HUD } from '../../components/ui/HUD'
import { AchievementToast } from '../../components/ui/AchievementToast'
import { BulkClimbEngine } from '../../engines/BulkClimbEngine'
import { checkAndUnlock, type AchievementDef } from '../../lib/achievements'
import { useScoreSubmission } from '../../hooks/useLeaderboard'

export default function BulkClimb() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BulkClimbEngine | null>(null)
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'win'>('title')
  const [score, setScore] = useState(0)
  const [height, setHeight] = useState(0)
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([])
  const { submit, state: submitState, reset: resetSubmit, wallet } = useScoreSubmission()

  useEffect(() => {
    if (gameState !== 'gameover') return
    resetSubmit()
    const newlyUnlocked = checkAndUnlock([
      { id: 'climb_100', condition: height >= 100 },
      { id: 'climb_500', condition: height >= 500 },
      { id: 'climb_1000', condition: height >= 1000 },
    ])
    if (newlyUnlocked.length > 0) setAchievementQueue((q) => [...q, ...newlyUnlocked])
  }, [gameState, height])

  useEffect(() => {
    if (!containerRef.current) return
    const engine = new BulkClimbEngine(containerRef.current, {
      onScoreChange: setScore,
      onStateChange: setGameState,
      onHeightChange: setHeight,
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
    submit('climb', score, { height })
  }, [submit, score, height])

  return (
    <ThreeCanvas ref={containerRef}>
      <BackButton />
      {gameState === 'title' && (
        <TitleScreen
          title="BULK CLIMB"
          subtitle="Climb the skyscraper!"
          instructions={['Arrow keys / Swipe to dodge', 'Avoid falling debris']}
          onStart={handleStart}
        />
      )}
      {gameState === 'playing' && (
        <HUD items={[
          { label: 'Score', value: score },
          { label: 'Height', value: `${height}m` },
        ]} />
      )}
      {gameState === 'gameover' && (
        <GameOverScreen
          title="GAME OVER"
          score={score}
          stats={{ Height: `${height}m` }}
          onRestart={handleRestart}
          gameName="BULK CLIMB"
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
