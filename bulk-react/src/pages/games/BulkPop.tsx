import { useRef, useState, useEffect, useCallback } from 'react'
import { ThreeCanvas } from '../../components/three/ThreeCanvas'
import { BackButton } from '../../components/layout/BackButton'
import { TitleScreen } from '../../components/ui/TitleScreen'
import { HUD } from '../../components/ui/HUD'
import { BulkPopEngine } from '../../engines/BulkPopEngine'

export default function BulkPop() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BulkPopEngine | null>(null)
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'win'>('title')
  const [score, setScore] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const engine = new BulkPopEngine(containerRef.current, {
      onScoreChange: setScore,
      onStateChange: setGameState,
    })
    engineRef.current = engine
    engine.init()
    return () => engine.dispose()
  }, [])

  const handleStart = useCallback(() => {
    engineRef.current?.start()
  }, [])

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
        <HUD items={[{ label: 'Pops', value: score }]} />
      )}
    </ThreeCanvas>
  )
}
