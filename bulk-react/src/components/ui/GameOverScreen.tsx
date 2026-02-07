interface GameOverScreenProps {
  title?: string
  score: number
  highScore?: number
  stats?: Record<string, string | number>
  onRestart: () => void
}

export function GameOverScreen({ title = 'GAME OVER', score, highScore, stats, onRestart }: GameOverScreenProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center animate-scale-in">
        <h1 className="text-4xl sm:text-5xl font-bold text-gold-DEFAULT text-shadow-gold mb-6 font-[family-name:var(--font-display)]">
          {title}
        </h1>
        <div className="bg-purple-darker/80 border border-purple-DEFAULT/50 rounded-xl p-6 mb-6 min-w-[250px]">
          <p className="text-2xl text-gold-DEFAULT font-bold mb-2">Score: {score}</p>
          {highScore !== undefined && (
            <p className="text-lg text-purple-DEFAULT">Best: {highScore}</p>
          )}
          {stats && Object.entries(stats).map(([key, value]) => (
            <p key={key} className="text-sm text-white/70 mt-1">{key}: {value}</p>
          ))}
        </div>
        <button
          onClick={onRestart}
          className="px-8 py-3 bg-gradient-to-r from-purple-DEFAULT to-purple-dark border-2 border-gold-DEFAULT rounded-xl text-white text-lg font-bold hover:scale-105 transition-transform animate-pulse-glow cursor-pointer"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  )
}
