import { useRef, useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useBulkBalance } from '../../hooks/useBulkBalance'
import { BackButton } from '../../components/layout/BackButton'
import {
  BulkagachiEngine,
  type BulkagachiCallbacks,
  type CollectionStats,
  type ToyInstance,
  type AchievementDef,
  type PoopData,
} from '../../engines/BulkagachiEngine'
import { syncBulkagachi } from '../../lib/achievements'

const GROWTH_STAGE_EMOJI: Record<string, string> = {
  BABY: '\u{1F37C}',
  CHILD: '\u{1F476}',
  TEEN: '\u{1F9D2}',
  ADULT: '\u{1F4AA}',
}

const MOOD_CONFIG: Record<string, { emoji: string; text: string }> = {
  happy: { emoji: '\u{1F60A}', text: 'HAPPY' },
  ok: { emoji: '\u{1F610}', text: 'OKAY' },
  sad: { emoji: '\u{1F622}', text: 'SAD' },
  miserable: { emoji: '\u{1F62D}', text: 'MISERABLE' },
}

export default function Bulkagachi() {
  const { publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const { isHolder, loading: balanceLoading } = useBulkBalance()

  const sceneRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<BulkagachiEngine | null>(null)

  const [hunger, setHunger] = useState(100)
  const [happiness, setHappiness] = useState(100)
  const [cleanliness, setCleanliness] = useState(100)
  const [mood, setMood] = useState<'happy' | 'ok' | 'sad' | 'miserable'>('happy')
  const [isSleeping, setIsSleeping] = useState(false)
  const [isDead, setIsDead] = useState(false)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [xpNeeded, setXpNeeded] = useState(75)
  const [ageString, setAgeString] = useState('0m')
  const [growthStage, setGrowthStage] = useState('BABY')
  const [poopCount, setPoopCount] = useState(0)
  const [combo, setCombo] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [toy, setToy] = useState<ToyInstance | null>(null)
  const [musicEnabled, setMusicEnabled] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [rebirthCount, setRebirthCount] = useState(0)
  const [wakeUpTaps, setWakeUpTaps] = useState(0)
  const [wakeUpNeeded, setWakeUpNeeded] = useState(10)

  const [showAchievementsModal, setShowAchievementsModal] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)

  const [achievements, setAchievements] = useState<Record<string, boolean>>({})
  const [achievementsList, setAchievementsList] = useState<AchievementDef[]>([])
  const [collection, setCollection] = useState<CollectionStats>({
    foodsEaten: 0,
    totalPets: 0,
    totalPlays: 0,
    totalCleans: 0,
    goldenPoopsFound: 0,
    maxCombo: 0,
    achievementCount: 0,
  })
  const [poops, setPoops] = useState<PoopData[]>([])
  const [achievementToast, setAchievementToast] = useState<string | null>(null)

  useEffect(() => {
    if (!sceneRef.current) return

    const callbacks: BulkagachiCallbacks = {
      onStatsChange: (h, ha, c) => {
        setHunger(h)
        setHappiness(ha)
        setCleanliness(c)
      },
      onMoodChange: setMood,
      onSleepChange: setIsSleeping,
      onDeadChange: setIsDead,
      onLevelChange: (l, x, xn) => {
        setLevel(l)
        setXp(x)
        setXpNeeded(xn)
      },
      onAgeChange: setAgeString,
      onGrowthStageChange: setGrowthStage,
      onPoopCountChange: (c) => {
        setPoopCount(c)
        if (engineRef.current) {
          setPoops(engineRef.current.getPoops())
        }
      },
      onComboChange: setCombo,
      onMessageChange: setMessage,
      onAchievementUnlocked: (id, title) => {
        if (engineRef.current) {
          setAchievements(engineRef.current.getAchievements())
        }
        syncBulkagachi({ [id]: true })
        setAchievementToast(title)
        setTimeout(() => setAchievementToast(null), 3000)
      },
      onCollectionChange: setCollection,
      onToySpawned: setToy,
      onMusicEnabledChange: setMusicEnabled,
      onNotificationsEnabledChange: setNotificationsEnabled,
      onWakeUpTapsChange: (taps, needed) => {
        setWakeUpTaps(taps)
        setWakeUpNeeded(needed)
      },
      onRebirthCountChange: setRebirthCount,
    }

    const engine = new BulkagachiEngine(sceneRef.current, callbacks)
    engineRef.current = engine
    engine.init()
    setAchievementsList(engine.getAchievementsList())
    setAchievements(engine.getAchievements())
    syncBulkagachi(engine.getAchievements())
    setPoops(engine.getPoops())

    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  const handleFeed = useCallback(() => engineRef.current?.feedBulk(), [])
  const handlePlay = useCallback(() => engineRef.current?.playWithBulk(), [])
  const handleClean = useCallback(() => engineRef.current?.cleanBulk(), [])
  const handleWakeUp = useCallback(() => engineRef.current?.tapToWakeUp(), [])
  const handleRevive = useCallback(() => engineRef.current?.reviveBulk(), [])
  const handleToggleMusic = useCallback(() => engineRef.current?.toggleMusic(), [])
  const handleRequestNotifications = useCallback(() => engineRef.current?.requestNotifications(), [])
  const handlePlayWithToy = useCallback(() => engineRef.current?.playWithToy(), [])

  const handleCleanPoop = useCallback((index: number) => {
    engineRef.current?.cleanPoop(index)
    if (engineRef.current) {
      setPoops(engineRef.current.getPoops())
    }
  }, [])

  const handleFortune = useCallback(() => {
    if (engineRef.current) {
      const fortune = engineRef.current.getFortuneCookie()
      setMessage(fortune)
      setTimeout(() => setMessage(null), 3000)
    }
  }, [])

  const handleShowCollection = useCallback(() => {
    setShowMenuModal(false)
    if (engineRef.current) {
      setCollection(engineRef.current.getCollection())
    }
    setShowCollectionModal(true)
  }, [])

  const handleShowAchievements = useCallback(() => {
    if (engineRef.current) {
      setAchievements(engineRef.current.getAchievements())
    }
    setShowAchievementsModal(true)
  }, [])

  const handleRebirth = useCallback(() => {
    if (!engineRef.current) return
    if (!engineRef.current.isRebirthAvailable()) {
      const info = engineRef.current.getRebirthInfo()
      setMessage(`NEED LV20 & 7 DAYS! (${info.level}/20, ${info.ageInDays}/7d)`)
      setTimeout(() => setMessage(null), 2000)
      return
    }
    if (window.confirm('REBIRTH BULK?\n\nThis will reset Bulk to Level 1 but give you:\n- +1 Rebirth Count\n- Keep all achievements\n- Keep collection stats\n\nContinue?')) {
      engineRef.current.performRebirth()
      setShowMenuModal(false)
    }
  }, [])

  const dayNightPhase = engineRef.current?.getDayNightPhase() ?? 'day'

  if (!isHolder) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)' }}>
        <BackButton />
        <div className="flex flex-col items-center gap-6 text-center px-8">
          <div className="text-6xl">
            {'\u{1F512}'}
          </div>
          <h1
            className="text-gold-DEFAULT text-xl font-bold"
            style={{ fontFamily: "'Press Start 2P', monospace", textShadow: '0 0 20px rgba(255,215,0,0.5)' }}
          >
            TOKEN GATED
          </h1>
          <p
            className="text-white/70 text-sm max-w-[300px]"
            style={{ fontFamily: "'Press Start 2P', monospace", lineHeight: '2' }}
          >
            {publicKey
              ? balanceLoading
                ? 'CHECKING BALANCE...'
                : 'HOLD 10,000 $BULK TO UNLOCK BULKAGACHI'
              : 'CONNECT YOUR WALLET & HOLD 10,000 $BULK TO PLAY'}
          </p>
          {!publicKey && (
            <button
              onClick={() => setVisible(true)}
              className="flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-br from-purple-DEFAULT to-purple-dark border-3 border-gold-DEFAULT rounded-xl text-white font-bold text-base font-[family-name:var(--font-display)] shadow-[0_0_30px_rgba(155,77,202,0.6),0_0_60px_rgba(255,215,0,0.3)] transition-all cursor-pointer hover:scale-110"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M2 10h20" />
              </svg>
              CONNECT WALLET
            </button>
          )}
          <p className="text-white/30 text-[0.55rem]" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            Read-only — no transactions
          </p>
        </div>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)' }}>
      <BackButton />

      <div
        className="flex flex-col relative overflow-hidden"
        style={{
          width: 'min(90vw, 500px)',
          height: '100dvh',
          maxHeight: '100dvh',
          background: '#0d0d0d',
          border: '4px solid #9b30ff',
          borderRadius: '20px',
          boxShadow: '0 0 40px rgba(155, 48, 255, 0.8), inset 0 0 30px rgba(155, 48, 255, 0.2)',
        }}
      >
        {/* Title Bar */}
        <div
          className="text-center text-white font-bold"
          style={{
            background: 'linear-gradient(135deg, #9b30ff, #ff00ff)',
            padding: '10px',
            fontSize: 'clamp(0.8rem, 4vw, 1.2rem)',
            textShadow: '2px 2px 0 #000',
            borderBottom: '3px solid #ff00ff',
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          BULKAGACHI
        </div>

        {/* Scene Container */}
        <div className="flex-1 relative overflow-hidden" style={{ background: '#1a1a1a' }}>
          {/* Three.js Canvas */}
          <div ref={sceneRef} className="w-full h-full" />

          {/* Day/Night Overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-[3] transition-[background] duration-2000"
            style={{
              background:
                dayNightPhase === 'morning'
                  ? 'linear-gradient(180deg, rgba(255, 200, 100, 0.1) 0%, transparent 50%)'
                  : dayNightPhase === 'evening'
                    ? 'linear-gradient(180deg, rgba(255, 100, 50, 0.15) 0%, rgba(100, 50, 150, 0.1) 100%)'
                    : dayNightPhase === 'night'
                      ? 'linear-gradient(180deg, rgba(0, 0, 50, 0.3) 0%, rgba(0, 0, 30, 0.2) 100%)'
                      : 'transparent',
            }}
          />

          {/* Mood Indicator */}
          <div
            className="absolute top-2.5 right-2.5 flex items-center gap-2 z-10"
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              border: '3px solid #9b30ff',
              borderRadius: '15px',
              padding: '10px 15px',
              color: '#fff',
              fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)',
              textShadow: '0 0 5px #9b30ff',
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            <span style={{ fontSize: 'clamp(1.125rem, 3.75vw, 1.5rem)' }}>
              {MOOD_CONFIG[mood].emoji}
            </span>
            <span>{MOOD_CONFIG[mood].text}</span>
          </div>

          {/* Growth Stage */}
          <div
            className="absolute z-10"
            style={{
              top: '60px',
              left: '10px',
              background: 'rgba(155, 48, 255, 0.95)',
              border: '3px solid #ff00ff',
              borderRadius: '15px',
              padding: '8px 12px',
              color: '#fff',
              fontSize: 'clamp(0.4rem, 1.8vw, 0.5rem)',
              textShadow: '0 0 5px #9b30ff',
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            {growthStage} {GROWTH_STAGE_EMOJI[growthStage] ?? ''}
          </div>

          {/* Level Display */}
          <div
            className="absolute z-10"
            style={{
              top: '110px',
              left: '10px',
              background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
              border: '3px solid #fff',
              borderRadius: '12px',
              padding: '8px 12px',
              color: '#000',
              fontSize: 'clamp(0.4rem, 1.8vw, 0.5rem)',
              fontWeight: 'bold',
              textShadow: '0 0 3px rgba(255,255,255,0.8)',
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            <div>LV {level}</div>
            <div
              style={{
                width: '60px',
                height: '8px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '4px',
                marginTop: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(xp / xpNeeded) * 100}%`,
                  background: 'linear-gradient(90deg, #00ff00, #7fff00)',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>

          {/* Achievements Button */}
          <button
            onClick={handleShowAchievements}
            className="absolute z-10 cursor-pointer"
            style={{
              top: '50px',
              right: '10px',
              background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
              border: '3px solid #fff',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              fontSize: '1.5rem',
              boxShadow: '0 0 15px rgba(255, 215, 0, 0.6)',
            }}
          >
            {'\u{1F3C6}'}
          </button>

          {/* Menu Button */}
          <button
            onClick={() => setShowMenuModal(true)}
            className="absolute z-10 cursor-pointer"
            style={{
              top: '110px',
              right: '10px',
              background: 'linear-gradient(135deg, #9b30ff, #6600cc)',
              border: '3px solid #fff',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              fontSize: '1.5rem',
              color: '#fff',
              boxShadow: '0 0 15px rgba(155, 48, 255, 0.6)',
            }}
          >
            {'\u{2630}'}
          </button>

          {/* Age Counter */}
          <div
            className="absolute z-10 flex flex-col items-center gap-0.5"
            style={{
              bottom: '10px',
              left: '10px',
              background: 'rgba(0, 0, 0, 0.8)',
              border: '3px solid #ffd700',
              borderRadius: '10px',
              padding: '8px 12px',
              color: '#ffd700',
              fontSize: 'clamp(0.4rem, 2vw, 0.6rem)',
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            <span>AGE</span>
            <span>{ageString}</span>
          </div>

          {/* Fortune Cookie Button */}
          <button
            onClick={handleFortune}
            className="absolute z-10 flex flex-col items-center gap-0.5 cursor-pointer"
            style={{
              bottom: '10px',
              right: '10px',
              background: 'rgba(0, 0, 0, 0.8)',
              border: '3px solid #ff9800',
              borderRadius: '12px',
              padding: '8px 12px',
              color: '#ffd700',
              fontSize: 'clamp(0.4rem, 1.8vw, 0.5rem)',
              textShadow: '0 0 5px #ffd700',
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            <span>{'\u{1F960}'}</span>
          </button>

          {/* Combo Indicator */}
          {combo > 3 && (
            <div
              className="absolute z-10"
              style={{
                top: '60px',
                right: '10px',
                background: 'rgba(255, 215, 0, 0.95)',
                border: '3px solid #ff00ff',
                borderRadius: '15px',
                padding: '8px 15px',
                color: '#000',
                fontSize: 'clamp(0.5rem, 2vw, 0.6rem)',
                textShadow: '0 0 5px rgba(255,255,255,0.8)',
                fontWeight: 'bold',
                fontFamily: "'Press Start 2P', monospace",
                animation: 'comboPulse 0.5s ease-in-out infinite',
              }}
            >
              {'\u{1F525}'} COMBO x{combo}
            </div>
          )}

          {/* Poop Container */}
          {poops.length > 0 && (
            <div
              className="absolute z-[5] flex flex-wrap gap-2"
              style={{
                bottom: '18%',
                left: '20%',
                maxWidth: '60%',
              }}
            >
              {poops.map((poop, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCleanPoop(idx)}
                  className="cursor-pointer transition-transform hover:scale-[1.3]"
                  style={{
                    fontSize: poop.type === 'golden' ? '1.8rem' : poop.type === 'tiny' ? '1rem' : '1.5rem',
                    background: 'none',
                    border: 'none',
                    filter: poop.type === 'golden' ? 'drop-shadow(0 0 10px gold) drop-shadow(0 0 20px gold)' : undefined,
                    animation: poop.type === 'golden'
                      ? 'poopAppear 0.5s ease-out, goldenPoopGlow 1s ease-in-out infinite'
                      : 'poopAppear 0.5s ease-out, poopWiggle 2s ease-in-out infinite',
                  }}
                >
                  {'\u{1F4A9}'}
                </button>
              ))}
              {/* Flies */}
              {poopCount >= 2 && Array.from({ length: Math.min(poopCount, 4) }).map((_, idx) => (
                <span
                  key={`fly-${idx}`}
                  className="absolute pointer-events-none"
                  style={{
                    fontSize: '0.8rem',
                    left: `${20 + Math.random() * 40}%`,
                    bottom: `${20 + Math.random() * 15}%`,
                    animation: `flyBuzz ${0.8 + Math.random() * 0.4}s ease-in-out infinite`,
                    animationDelay: `${Math.random()}s`,
                  }}
                >
                  {'\u{1FAB0}'}
                </span>
              ))}
            </div>
          )}

          {/* Toy */}
          {toy && (
            <button
              onClick={handlePlayWithToy}
              className="absolute z-[30] cursor-pointer"
              style={{
                left: `${toy.x}%`,
                top: `${toy.y}%`,
                fontSize: '3rem',
                background: 'none',
                border: 'none',
                animation: 'toyBounce 1s ease-in-out infinite',
              }}
            >
              {toy.emoji}
            </button>
          )}

          {/* Sleep Overlay */}
          {isSleeping && (
            <div
              className="absolute inset-0 z-[5] flex flex-col items-center justify-center cursor-pointer"
              style={{ background: 'rgba(0, 0, 20, 0.7)' }}
              onClick={handleWakeUp}
            >
              <span style={{ fontSize: '4rem' }}>{'\u{1F4A4}'}</span>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: '20px',
                  fontFamily: "'Press Start 2P', monospace",
                }}
              >
                TAP TO WAKE UP
              </div>
              {wakeUpTaps > 0 && (
                <div
                  style={{
                    fontSize: '1rem',
                    color: '#ffd93d',
                    marginTop: '10px',
                    fontFamily: "'Press Start 2P', monospace",
                  }}
                >
                  {wakeUpTaps}/{wakeUpNeeded} TAPS
                </div>
              )}
            </div>
          )}

          {/* Revival Screen */}
          {isDead && (
            <div
              className="absolute inset-0 z-[200] flex flex-col items-center justify-center gap-5"
              style={{ background: 'rgba(0, 0, 0, 0.95)' }}
            >
              <div style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)', textAlign: 'center' }}>
                {'\u{1F62D}'}
              </div>
              <div
                style={{
                  fontSize: 'clamp(0.6rem, 2.5vw, 1rem)',
                  color: '#ff00ff',
                  textAlign: 'center',
                  maxWidth: '80%',
                  fontFamily: "'Press Start 2P', monospace",
                }}
              >
                BULK FAINTED!
              </div>
              <button
                onClick={handleRevive}
                className="cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #ff00ff, #9b30ff)',
                  border: '3px solid #ffd700',
                  borderRadius: '15px',
                  padding: '15px 30px',
                  color: '#fff',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 'clamp(0.6rem, 2.5vw, 0.8rem)',
                  textShadow: '2px 2px 0 #000',
                  boxShadow: '0 4px 0 #6a0dad, 0 0 20px rgba(255, 0, 255, 0.5)',
                }}
              >
                REVIVE {'\u{2728}'}
              </button>
            </div>
          )}

          {/* Message Toast */}
          <div
            className="absolute z-10 text-center pointer-events-none transition-opacity duration-300"
            style={{
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(155, 48, 255, 0.95)',
              border: '3px solid #ff00ff',
              borderRadius: '15px',
              padding: '10px 20px',
              color: '#fff',
              fontSize: 'clamp(0.5rem, 2vw, 0.7rem)',
              maxWidth: '80%',
              textShadow: '2px 2px 0 #000',
              fontFamily: "'Press Start 2P', monospace",
              opacity: message ? 1 : 0,
            }}
          >
            {message ?? ''}
          </div>

          {/* Achievement Toast */}
          {achievementToast && (
            <div
              className="absolute z-[100] text-center pointer-events-none"
              style={{
                top: '10px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 215, 0, 0.95)',
                border: '3px solid #ff00ff',
                borderRadius: '15px',
                padding: '10px 20px',
                color: '#000',
                fontSize: 'clamp(0.5rem, 2vw, 0.7rem)',
                fontWeight: 'bold',
                textShadow: '0 0 3px rgba(255,255,255,0.8)',
                fontFamily: "'Press Start 2P', monospace",
                animation: 'fadeInUp 0.3s ease-out',
              }}
            >
              {'\u{1F3C6}'} {achievementToast}!
            </div>
          )}
        </div>

        {/* Stats Bars */}
        <div
          className="flex flex-col gap-1.5"
          style={{
            background: '#0a0a0a',
            padding: '8px 15px',
            borderTop: '3px solid #9b30ff',
          }}
        >
          <StatBar label="HUNGER" value={hunger} type="hunger" />
          <StatBar label="HAPPY" value={happiness} type="happiness" />
          <StatBar label="CLEAN" value={cleanliness} type="cleanliness" />
        </div>

        {/* Action Buttons */}
        <div
          className="grid grid-cols-3 gap-2"
          style={{
            background: '#0a0a0a',
            padding: '8px 15px 12px',
            borderTop: '2px solid #9b30ff',
          }}
        >
          <ActionButton emoji={'\u{1F964}'} label="SCHMEG" onClick={handleFeed} />
          <ActionButton emoji={'\u{1F3AE}'} label="PLAY" onClick={handlePlay} />
          <ActionButton emoji={'\u{1F9FC}'} label="CLEAN" onClick={handleClean} />
        </div>
      </div>

      {/* Achievements Modal */}
      {showAchievementsModal && (
        <ModalOverlay onClose={() => setShowAchievementsModal(false)}>
          <div
            style={{
              fontSize: 'clamp(1rem, 4vw, 1.5rem)',
              color: '#ffd700',
              marginBottom: '15px',
              fontFamily: "'Press Start 2P', monospace",
              textAlign: 'center',
            }}
          >
            {'\u{1F3C6}'} ACHIEVEMENTS {'\u{1F3C6}'}
          </div>
          <div className="w-full flex flex-col items-center overflow-y-auto flex-1">
            {achievementsList.map((a) => (
              <AchievementItem key={a.id} achievement={a} unlocked={!!achievements[a.id]} />
            ))}
          </div>
          <ModalCloseButton onClick={() => setShowAchievementsModal(false)} />
        </ModalOverlay>
      )}

      {/* Menu Modal */}
      {showMenuModal && (
        <ModalOverlay onClose={() => setShowMenuModal(false)}>
          <div
            style={{
              fontSize: 'clamp(1rem, 4vw, 1.5rem)',
              color: '#9b30ff',
              marginBottom: '20px',
              fontFamily: "'Press Start 2P', monospace",
              textAlign: 'center',
            }}
          >
            {'\u{2630}'} MENU {'\u{2630}'}
          </div>
          <div className="flex flex-col gap-4 w-full items-center">
            <MenuButton onClick={handleShowCollection}>
              {'\u{1F4D6}'} COLLECTION BOOK
            </MenuButton>
            <MenuButton onClick={handleToggleMusic}>
              {'\u{1F3B5}'} MUSIC: {musicEnabled ? 'ON' : 'OFF'}
            </MenuButton>
            <MenuButton onClick={handleRequestNotifications}>
              {'\u{1F514}'} NOTIFICATIONS{notificationsEnabled ? ': ON' : ''}
            </MenuButton>
            <MenuButton onClick={handleRebirth}>
              {'\u{1F31F}'} REBIRTH
            </MenuButton>
          </div>
          <ModalCloseButton onClick={() => setShowMenuModal(false)} />
        </ModalOverlay>
      )}

      {/* Collection Modal */}
      {showCollectionModal && (
        <ModalOverlay onClose={() => setShowCollectionModal(false)}>
          <div
            style={{
              fontSize: 'clamp(1rem, 4vw, 1.5rem)',
              color: '#00ff88',
              marginBottom: '20px',
              fontFamily: "'Press Start 2P', monospace",
              textAlign: 'center',
            }}
          >
            {'\u{1F4D6}'} COLLECTION BOOK {'\u{1F4D6}'}
          </div>
          <div
            className="w-full max-w-[300px]"
            style={{
              textAlign: 'left',
              fontSize: 'clamp(0.4rem, 2vw, 0.6rem)',
              lineHeight: '2',
              color: '#fff',
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            <div>{'\u{1F964}'} FOODS EATEN: {collection.foodsEaten}</div>
            <div>{'\u{1F49C}'} TOTAL PETS: {collection.totalPets}</div>
            <div>{'\u{1F3AE}'} TOTAL PLAYS: {collection.totalPlays}</div>
            <div>{'\u{1F9FC}'} TOTAL CLEANS: {collection.totalCleans}</div>
            <div>{'\u{2728}'} GOLDEN POOPS: {collection.goldenPoopsFound}</div>
            <div>{'\u{1F525}'} MAX COMBO: {collection.maxCombo}x</div>
            <div>{'\u{1F3C6}'} ACHIEVEMENTS: {collection.achievementCount}/11</div>
            <div>{'\u{1F4C5}'} AGE: {ageString}</div>
            <div>{'\u{1F504}'} REBIRTHS: {rebirthCount}</div>
            <div>{'\u{2B50}'} LEVEL: {level}</div>
            <div>{'\u{1F4AF}'} XP: {xp}</div>
          </div>
          <ModalCloseButton onClick={() => setShowCollectionModal(false)} />
        </ModalOverlay>
      )}

      {/* CSS Animations injected via style tag */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        @keyframes comboPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes poopAppear {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes poopWiggle {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes goldenPoopGlow {
          0%, 100% { filter: drop-shadow(0 0 10px gold) drop-shadow(0 0 20px gold); transform: scale(1); }
          50% { filter: drop-shadow(0 0 20px gold) drop-shadow(0 0 40px gold); transform: scale(1.1); }
        }
        @keyframes flyBuzz {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(10px, -8px) rotate(15deg); }
          50% { transform: translate(-5px, -12px) rotate(-10deg); }
          75% { transform: translate(-10px, -5px) rotate(10deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes toyBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        @keyframes statPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}

function StatBar({ label, value, type }: { label: string; value: number; type: 'hunger' | 'happiness' | 'cleanliness' }) {
  const gradients: Record<string, string> = {
    hunger: 'linear-gradient(90deg, #ff00ff, #9b30ff)',
    happiness: 'linear-gradient(90deg, #ffd700, #ffff00)',
    cleanliness: 'linear-gradient(90deg, #00ffff, #0088ff)',
  }

  const glows: Record<string, string> = {
    hunger: '0 0 10px #ff00ff',
    happiness: '0 0 10px #ffd700',
    cleanliness: '0 0 10px #00ffff',
  }

  return (
    <div className="flex items-center gap-2.5">
      <div
        style={{
          color: '#9b30ff',
          fontSize: 'clamp(0.4rem, 2vw, 0.6rem)',
          width: '80px',
          textShadow: '0 0 5px #9b30ff',
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        {label}
      </div>
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          height: '20px',
          background: '#1a1a1a',
          border: '2px solid #9b30ff',
          borderRadius: '10px',
        }}
      >
        <div
          className="h-full flex items-center justify-center"
          style={{
            width: `${value}%`,
            background: gradients[type],
            boxShadow: glows[type],
            borderRadius: '8px',
            transition: 'width 0.5s ease',
            fontSize: 'clamp(0.4rem, 1.5vw, 0.5rem)',
            fontWeight: 'bold',
            color: '#000',
            textShadow: '0 0 3px rgba(255,255,255,0.8)',
            fontFamily: "'Press Start 2P', monospace",
            animation: value < 30 ? 'statPulse 1s ease-in-out infinite' : undefined,
          }}
        >
          {Math.round(value)}%
        </div>
      </div>
    </div>
  )
}

function ActionButton({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 cursor-pointer active:translate-y-1"
      style={{
        background: 'linear-gradient(135deg, #9b30ff, #6a0dad)',
        border: '3px solid #ff00ff',
        borderRadius: '15px',
        padding: '10px 8px',
        color: '#fff',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 'clamp(0.5rem, 2vw, 0.7rem)',
        textShadow: '2px 2px 0 #000',
        boxShadow: '0 4px 0 #4a0dad, 0 0 20px rgba(155, 48, 255, 0.5)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.5))' }}>
        {emoji}
      </span>
      <span>{label}</span>
    </button>
  )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[150] flex flex-col items-center justify-center p-5 overflow-y-auto"
      style={{ background: 'rgba(0, 0, 0, 0.95)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {children}
    </div>
  )
}

function ModalCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer active:scale-95 mt-4"
      style={{
        background: 'linear-gradient(135deg, #ff00ff, #9b30ff)',
        border: '3px solid #ffd700',
        borderRadius: '12px',
        padding: '12px 24px',
        color: '#fff',
        fontSize: 'clamp(0.5rem, 2vw, 0.7rem)',
        textShadow: '2px 2px 0 #000',
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      CLOSE
    </button>
  )
}

function MenuButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer active:scale-95 w-full max-w-[300px]"
      style={{
        background: 'linear-gradient(135deg, #9b30ff, #6600cc)',
        border: '3px solid #fff',
        borderRadius: '12px',
        padding: '15px 20px',
        color: '#fff',
        fontSize: 'clamp(0.5rem, 2vw, 0.7rem)',
        textShadow: '2px 2px 0 #000',
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      {children}
    </button>
  )
}

function AchievementItem({ achievement, unlocked }: { achievement: AchievementDef; unlocked: boolean }) {
  return (
    <div
      className="flex items-center gap-3 w-[90%] max-w-[400px] my-2"
      style={{
        background: unlocked ? 'rgba(255, 215, 0, 0.3)' : 'rgba(155, 48, 255, 0.3)',
        border: `3px solid ${unlocked ? '#ffd700' : '#9b30ff'}`,
        borderRadius: '12px',
        padding: '12px',
        boxShadow: unlocked ? '0 0 20px rgba(255, 215, 0, 0.5)' : undefined,
      }}
    >
      <div style={{ fontSize: '2rem' }}>{unlocked ? achievement.icon : '\u{1F512}'}</div>
      <div className="flex-1">
        <div
          style={{
            color: '#ffd700',
            fontSize: 'clamp(0.5rem, 2vw, 0.6rem)',
            marginBottom: '4px',
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          {achievement.title}
        </div>
        <div
          style={{
            color: '#9b30ff',
            fontSize: 'clamp(0.4rem, 1.5vw, 0.5rem)',
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          {achievement.desc}
        </div>
      </div>
    </div>
  )
}
