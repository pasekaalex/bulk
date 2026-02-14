import { useRef, useState, useEffect, useCallback } from 'react'
import { ThreeCanvas } from '../../components/three/ThreeCanvas'
import { BackButton } from '../../components/layout/BackButton'
import { TitleScreen } from '../../components/ui/TitleScreen'
import { GameOverScreen } from '../../components/ui/GameOverScreen'
import { HUD } from '../../components/ui/HUD'
import { AchievementToast } from '../../components/ui/AchievementToast'
import { BulkPopEngine } from '../../engines/BulkPopEngine'
import { checkAndUnlock, type AchievementDef } from '../../lib/achievements'
import { useScoreSubmission } from '../../hooks/useLeaderboard'

export default function BulkPop() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BulkPopEngine | null>(null)
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'win'>('title')
  const [score, setScore] = useState(0)
  const [foodsEaten, setFoodsEaten] = useState(0)
  const [achievementQueue, setAchievementQueue] = useState<AchievementDef[]>([])
  const { submit, state: submitState, reset: resetSubmit, wallet } = useScoreSubmission()

  useEffect(() => {
    if (gameState !== 'gameover') return
    resetSubmit()
    const newlyUnlocked = checkAndUnlock([
      { id: 'pop_first', condition: score >= 1 },
      { id: 'pop_5', condition: score >= 5 },
      { id: 'pop_10', condition: score >= 10 },
      { id: 'pop_25', condition: score >= 25 },
    ])
    if (newlyUnlocked.length > 0) setAchievementQueue((q) => [...q, ...newlyUnlocked])
  }, [gameState, score])

  useEffect(() => {
    if (!containerRef.current) return
    const engine = new BulkPopEngine(containerRef.current, {
      onScoreChange: setScore,
      onStateChange: setGameState,
      onComboChange: setFoodsEaten,
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

  const handleEnd = useCallback(() => {
    engineRef.current?.stop()
  }, [])

  const handleSubmitScore = useCallback(() => {
    submit('pop', score, { 'Foods Eaten': foodsEaten })
  }, [submit, score, foodsEaten])

  return (
    <ThreeCanvas ref={containerRef}>
      {gameState !== 'playing' && <BackButton />}
      {gameState === 'title' && (
        <TitleScreen
          title="BULK POP"
          subtitle="Feed him till he pops!"
          instructions={['Tap food to feed Bulk', "He'll pop when he's had enough!"]}
          onStart={handleStart}
        />
      )}
      {gameState === 'playing' && (
        <>
          <HUD items={[
            { label: 'Pops', value: score },
            { label: 'Fed', value: foodsEaten },
          ]} />
          <button
            onClick={handleEnd}
            className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-black/50 border border-white/20 rounded-lg text-white/60 text-xs font-bold hover:bg-black/70 hover:text-white/90 transition-all cursor-pointer"
          >
            END
          </button>
        </>
      )}
      {gameState === 'gameover' && (
        <GameOverScreen
          title="SESSION OVER"
          score={score}
          stats={{ 'Foods Eaten': foodsEaten }}
          onRestart={handleRestart}
          gameName="BULK POP"
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
