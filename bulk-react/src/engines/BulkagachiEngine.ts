import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { ASSET_PATHS } from '../constants'

export interface BulkagachiCallbacks {
  onStatsChange?: (hunger: number, happiness: number, cleanliness: number) => void
  onMoodChange?: (mood: 'happy' | 'ok' | 'sad' | 'miserable') => void
  onSleepChange?: (sleeping: boolean) => void
  onDeadChange?: (dead: boolean) => void
  onLevelChange?: (level: number, xp: number, xpNeeded: number) => void
  onAgeChange?: (ageString: string) => void
  onGrowthStageChange?: (stage: string) => void
  onPoopCountChange?: (count: number) => void
  onComboChange?: (combo: number) => void
  onMessageChange?: (message: string | null) => void
  onAchievementUnlocked?: (id: string, title: string) => void
  onCollectionChange?: (collection: CollectionStats) => void
  onToySpawned?: (toy: ToyInstance | null) => void
  onMusicEnabledChange?: (enabled: boolean) => void
  onNotificationsEnabledChange?: (enabled: boolean) => void
  onWakeUpTapsChange?: (taps: number, needed: number) => void
  onRebirthCountChange?: (count: number) => void
}

export interface CollectionStats {
  foodsEaten: number
  totalPets: number
  totalPlays: number
  totalCleans: number
  goldenPoopsFound: number
  maxCombo: number
  achievementCount: number
}

export interface AchievementDef {
  id: string
  icon: string
  title: string
  desc: string
}

export interface PoopData {
  type: 'normal' | 'golden' | 'tiny'
}

interface ToyType {
  emoji: string
  name: string
  happiness: number
  duration: number
}

export interface ToyInstance {
  emoji: string
  name: string
  happiness: number
  x: number
  y: number
}

interface SavedState {
  hunger: number
  happiness: number
  cleanliness: number
  lastUpdateTime: number
  birthTime: number
  totalCareActions: number
  isDead: boolean
  achievements: Record<string, boolean>
  level: number
  xp: number
  poopCount: number
  poopUrgency: number
  rebirthCount: number
  collection: CollectionStats
  musicEnabled: boolean
  notificationsEnabled: boolean
  comboCount: number
  lastActionTime: number
  isSleeping: boolean
  poops: PoopData[]
}

const ACHIEVEMENTS_LIST: AchievementDef[] = [
  { id: 'firstFeed', icon: '\u{1F964}', title: 'First Meal', desc: 'Feed Bulk for the first time' },
  { id: 'combo10', icon: '\u{1F525}', title: 'Combo Master', desc: 'Reach a 10x combo' },
  { id: 'perfectCare', icon: '\u{1F4AF}', title: 'Perfect Care', desc: 'Get all stats to 100%' },
  { id: 'oneDay', icon: '\u{1F382}', title: 'First Birthday', desc: 'Keep Bulk alive for 1 day' },
  { id: 'care100', icon: '\u{2764}\u{FE0F}', title: 'Dedicated Carer', desc: 'Perform 100 care actions' },
  { id: 'care500', icon: '\u{1F4AA}', title: 'Super Parent', desc: 'Perform 500 care actions' },
  { id: 'revival', icon: '\u{2728}', title: 'Second Chance', desc: 'Revive Bulk' },
  { id: 'threeDays', icon: '\u{1F31F}', title: 'Week Warrior', desc: 'Keep Bulk alive for 3 days' },
  { id: 'level5', icon: '\u{2B50}', title: 'Rising Star', desc: 'Reach Level 5' },
  { id: 'level10', icon: '\u{1F31F}', title: 'Superstar', desc: 'Reach Level 10' },
  { id: 'goldenPoop', icon: '\u{2728}', title: 'Golden Discovery', desc: 'Find and clean a golden poop' },
]

const TOY_TYPES: ToyType[] = [
  { emoji: '\u{26BD}', name: 'Ball', happiness: 10, duration: 8000 },
  { emoji: '\u{1F3BE}', name: 'Tennis Ball', happiness: 8, duration: 7000 },
  { emoji: '\u{1F9F8}', name: 'Teddy', happiness: 15, duration: 10000 },
  { emoji: '\u{1F3AE}', name: 'Game', happiness: 12, duration: 9000 },
  { emoji: '\u{1FA80}', name: 'Yo-Yo', happiness: 10, duration: 8000 },
]

const FEED_MESSAGES = [
  'YUM! PURPLE SCHMEG!',
  'DELICIOUS! *SLURP*',
  'MORE SCHMEG PLZ!',
  'SO TASTY!',
  'BULK LOVES SCHMEG!',
]

const PLAY_MESSAGES = [
  'WHEEE! FUN TIME!',
  'BEST GAME EVER!',
  'PLAY MORE! PLAY MORE!',
  'THIS IS AWESOME!',
  'BULK IS HAVING FUN!',
]

const CLEAN_MESSAGES = [
  'SO FRESH! SO CLEAN!',
  'SPARKLE SPARKLE!',
  'SQUEAKY CLEAN!',
  'FRESH AS A DAISY!',
  'BULK IS SHINY!',
]

const FORTUNE_COOKIES = [
  'BULK SEES GREAT GAINS IN YOUR FUTURE',
  'THE PURPLE ONE SMILES UPON YOU',
  'A SCHMEG A DAY KEEPS THE SADNESS AWAY',
  'YOUR BULK ENERGY IS UNMATCHED TODAY',
  'SOMETHING GOLDEN APPROACHES...',
  'TREAT YOUR BULK WELL AND RICHES FOLLOW',
  'THE STARS ALIGN FOR MAXIMUM BULK',
  'PATIENCE WITH YOUR PET YIELDS GREAT REWARDS',
  'A COMBO STREAK AWAITS THE PERSISTENT',
  'BULK BELIEVES IN YOU. DO YOU BELIEVE IN BULK?',
]

export class BulkagachiEngine {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private bulk: THREE.Group
  private bulkModel: THREE.Group | null = null
  private animationFrameId = 0
  private disposed = false
  private container: HTMLElement
  private callbacks: BulkagachiCallbacks

  private hunger = 100
  private happiness = 100
  private cleanliness = 100
  private birthTime = Date.now()
  private lastUpdateTime = Date.now()
  private comboCount = 0
  private lastActionTime = 0
  private totalCareActions = 0
  private isSleeping = false
  private isDead = false
  private level = 1
  private xp = 0
  private poopCount = 0
  private poopUrgency = 0
  private rebirthCount = 0
  private poops: PoopData[] = []
  private achievements: Record<string, boolean> = {}
  private collection: CollectionStats = {
    foodsEaten: 0,
    totalPets: 0,
    totalPlays: 0,
    totalCleans: 0,
    goldenPoopsFound: 0,
    maxCombo: 0,
    achievementCount: 0,
  }
  private musicEnabled = false
  private notificationsEnabled = false

  private backgroundMusic: HTMLAudioElement | null = null
  private audioContext: AudioContext | null = null

  private wakeUpTaps = 0
  private readonly WAKE_UP_TAPS_NEEDED = 10

  private decayInterval = 0
  private minuteInterval = 0
  private toyInterval = 0
  private collectionInterval = 0
  private notificationInterval = 0
  private comboTimeout = 0
  private messageTimeout = 0
  private currentToyTimeout = 0
  private lastNotificationCheck = Date.now()

  private currentToy: ToyInstance | null = null

  private isAnimatingBounce = false
  private isAnimatingJump = false
  private isAnimatingSpin = false
  private isAnimatingShake = false

  private boundOnResize: () => void
  private boundOnClick: (e: MouseEvent) => void

  constructor(container: HTMLElement, callbacks: BulkagachiCallbacks = {}) {
    this.container = container
    this.callbacks = callbacks

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a1a)

    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    )
    this.camera.position.set(0, 1.5, 3)
    this.camera.lookAt(0, 1, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)

    this.bulk = new THREE.Group()
    this.bulk.position.set(0, 0, 0)
    this.scene.add(this.bulk)

    this.boundOnResize = this.onResize.bind(this)
    this.boundOnClick = this.onCanvasClick.bind(this)
  }

  init(): void {
    this.createScene()
    this.loadModel()
    this.loadState()
    this.emitAllState()
    this.startTimers()
    this.animate()

    window.addEventListener('resize', this.boundOnResize)
    this.renderer.domElement.addEventListener('click', this.boundOnClick)
  }

  private createScene(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)

    const light1 = new THREE.DirectionalLight(0x9b30ff, 0.8)
    light1.position.set(5, 5, 5)
    this.scene.add(light1)

    const light2 = new THREE.DirectionalLight(0xff00ff, 0.5)
    light2.position.set(-5, 3, -5)
    this.scene.add(light2)

    const groundGeo = new THREE.CircleGeometry(3, 32)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2d1b4e,
      roughness: 0.8,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    this.scene.add(ground)
  }

  private loadModel(): void {
    const loader = new GLTFLoader()
    loader.load(
      ASSET_PATHS.models.bulk,
      (gltf) => {
        if (this.disposed) return
        this.bulkModel = gltf.scene
        const box = new THREE.Box3().setFromObject(this.bulkModel)
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 1.8 / maxDim
        this.bulkModel.scale.set(scale, scale, scale)
        this.bulk.add(this.bulkModel)
      },
      undefined,
      () => {
        this.createFallbackBulk()
      },
    )
  }

  private createFallbackBulk(): void {
    const geo = new THREE.BoxGeometry(1, 1.5, 0.8)
    const mat = new THREE.MeshStandardMaterial({ color: 0x9b30ff })
    this.bulkModel = new THREE.Group()
    this.bulkModel.add(new THREE.Mesh(geo, mat))
    this.bulk.add(this.bulkModel)
  }

  private animate = (): void => {
    if (this.disposed) return
    this.animationFrameId = requestAnimationFrame(this.animate)

    if (this.bulk && !this.isDead) {
      const avgStats = (this.hunger + this.happiness + this.cleanliness) / 3
      const baseHeight = 0.5

      if (this.isSleeping) {
        if (!this.isAnimatingBounce && !this.isAnimatingJump && !this.isAnimatingSpin && !this.isAnimatingShake) {
          this.bulk.position.y = baseHeight + Math.sin(Date.now() * 0.0003) * 0.03
          this.bulk.rotation.y = 0
        }
      } else {
        if (!this.isAnimatingBounce && !this.isAnimatingJump && !this.isAnimatingSpin && !this.isAnimatingShake) {
          const bobbingSpeed = avgStats > 50 ? 0.001 : 0.0005
          const bobbingAmount = avgStats > 50 ? 0.1 : 0.05
          this.bulk.position.y = baseHeight + Math.sin(Date.now() * bobbingSpeed) * bobbingAmount
          this.bulk.rotation.y = Math.sin(Date.now() * 0.0005) * 0.2
        }
      }

      if (this.bulkModel) {
        this.bulkModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            const material = mesh.material as THREE.MeshStandardMaterial
            if (!material || !material.emissive) return

            if (this.isSleeping) {
              material.emissive.setHex(0x1a0a2e)
              material.emissiveIntensity = 0.05
            } else if (avgStats > 70) {
              material.emissive.setHex(0x9b30ff)
              material.emissiveIntensity = 0.3
            } else if (avgStats > 40) {
              material.emissive.setHex(0x6a0dad)
              material.emissiveIntensity = 0.1
            } else if (avgStats > 20) {
              material.emissive.setHex(0x4a0080)
              material.emissiveIntensity = 0.05
            } else {
              material.emissive.setHex(0x2d004d)
              material.emissiveIntensity = 0.02
            }
          }
        })
      }
    } else if (this.bulk && this.isDead) {
      if (this.bulkModel) {
        this.bulkModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            const material = mesh.material as THREE.MeshStandardMaterial
            if (!material || !material.emissive) return
            material.emissive.setHex(0x000000)
            material.emissiveIntensity = 0
          }
        })
      }
    }

    this.updateSceneBackground()
    this.renderer.render(this.scene, this.camera)
  }

  private updateSceneBackground(): void {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) {
      this.scene.background = new THREE.Color(0x2a2a3a)
    } else if (hour >= 12 && hour < 18) {
      this.scene.background = new THREE.Color(0x1a1a2a)
    } else if (hour >= 18 && hour < 22) {
      this.scene.background = new THREE.Color(0x15152a)
    } else {
      this.scene.background = new THREE.Color(0x0a0a1a)
    }
  }

  private onResize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private onCanvasClick(e: MouseEvent): void {
    if (this.isDead || this.isSleeping) return

    const rect = this.renderer.domElement.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)

    if (distance < 150) {
      this.petBulk()
    }
  }

  private loadState(): void {
    let saved: string | null = null
    try { saved = localStorage.getItem('bulkagachi') } catch { /* storage disabled */ }
    if (saved) {
      let state: SavedState
      try { state = JSON.parse(saved) } catch { return }
      this.hunger = state.hunger ?? 100
      this.happiness = state.happiness ?? 100
      this.cleanliness = state.cleanliness ?? 100
      this.lastUpdateTime = state.lastUpdateTime ?? Date.now()
      this.birthTime = state.birthTime ?? Date.now()
      this.totalCareActions = state.totalCareActions ?? 0
      this.isDead = state.isDead ?? false
      this.achievements = state.achievements ?? {}
      this.level = state.level ?? 1
      this.xp = state.xp ?? 0
      this.poopCount = state.poopCount ?? 0
      this.poopUrgency = state.poopUrgency ?? 0
      this.rebirthCount = state.rebirthCount ?? 0
      this.comboCount = state.comboCount ?? 0
      this.lastActionTime = state.lastActionTime ?? 0
      this.poops = state.poops ?? []
      this.collection = state.collection ?? {
        foodsEaten: 0,
        totalPets: 0,
        totalPlays: 0,
        totalCleans: 0,
        goldenPoopsFound: 0,
        maxCombo: 0,
        achievementCount: 0,
      }
      this.musicEnabled = state.musicEnabled ?? false
      this.notificationsEnabled = state.notificationsEnabled ?? false

      const timePassed = (Date.now() - this.lastUpdateTime) / 1000
      const minutesPassed = timePassed / 60

      if (!this.isDead) {
        this.hunger = Math.max(0, this.hunger - minutesPassed * 2)
        this.happiness = Math.max(0, this.happiness - minutesPassed * 1.5)
        this.cleanliness = Math.max(0, this.cleanliness - minutesPassed * 1)
      }

      if (this.hunger === 0 && this.happiness === 0 && this.cleanliness === 0 && !this.isDead) {
        this.isDead = true
      }

      if (this.poops.length !== this.poopCount) {
        this.poops = []
        for (let i = 0; i < this.poopCount; i++) {
          this.poops.push({ type: 'normal' })
        }
      }

      if (minutesPassed > 1 && !this.isDead) {
        setTimeout(() => {
          if (minutesPassed < 60) {
            this.showMessage(`WELCOME BACK! YOU WERE GONE FOR ${Math.round(minutesPassed)} MIN!`)
          } else if (minutesPassed < 1440) {
            this.showMessage(`WELCOME BACK! YOU WERE GONE FOR ${Math.round(minutesPassed / 60)} HOURS!`)
          } else {
            this.showMessage(`WELCOME BACK! YOU WERE GONE FOR ${Math.round(minutesPassed / 1440)} DAYS!`)
          }
        }, 1000)
      }

      this.checkSleepTime()

      if (this.musicEnabled) {
        this.startMusic()
      }
    } else {
      this.birthTime = Date.now()
      this.checkSleepTime()
      setTimeout(() => {
        this.showMessage("HELLO! I'M BULK! TAKE CARE OF ME!")
      }, 1000)
    }
  }

  private saveState(): void {
    const state: SavedState = {
      hunger: this.hunger,
      happiness: this.happiness,
      cleanliness: this.cleanliness,
      lastUpdateTime: Date.now(),
      birthTime: this.birthTime,
      totalCareActions: this.totalCareActions,
      isDead: this.isDead,
      achievements: this.achievements,
      level: this.level,
      xp: this.xp,
      poopCount: this.poopCount,
      poopUrgency: this.poopUrgency,
      rebirthCount: this.rebirthCount,
      comboCount: this.comboCount,
      lastActionTime: this.lastActionTime,
      isSleeping: this.isSleeping,
      poops: this.poops,
      collection: this.collection,
      musicEnabled: this.musicEnabled,
      notificationsEnabled: this.notificationsEnabled,
    }
    try { localStorage.setItem('bulkagachi', JSON.stringify(state)) } catch { /* storage full/disabled */ }
  }

  private emitAllState(): void {
    this.callbacks.onStatsChange?.(this.hunger, this.happiness, this.cleanliness)
    this.callbacks.onMoodChange?.(this.getMood())
    this.callbacks.onSleepChange?.(this.isSleeping)
    this.callbacks.onDeadChange?.(this.isDead)
    this.callbacks.onLevelChange?.(this.level, this.xp, this.getXPForLevel(this.level))
    this.callbacks.onAgeChange?.(this.getAgeString())
    this.callbacks.onGrowthStageChange?.(this.getGrowthStage())
    this.callbacks.onPoopCountChange?.(this.poopCount)
    this.callbacks.onComboChange?.(this.comboCount)
    this.callbacks.onCollectionChange?.(this.collection)
    this.callbacks.onMusicEnabledChange?.(this.musicEnabled)
    this.callbacks.onNotificationsEnabledChange?.(this.notificationsEnabled)
    this.callbacks.onRebirthCountChange?.(this.rebirthCount)
  }

  private startTimers(): void {
    this.decayInterval = window.setInterval(() => this.decayTick(), 10000)
    this.minuteInterval = window.setInterval(() => this.minuteTick(), 60000)
    this.toyInterval = window.setInterval(() => this.spawnToy(), 30000)
    this.collectionInterval = window.setInterval(() => this.updateCollectionStats(), 5000)
    this.notificationInterval = window.setInterval(() => this.checkNotifications(), 60000)
  }

  private decayTick(): void {
    if (this.isDead || this.isSleeping) return

    this.hunger = Math.max(0, this.hunger - 0.5)
    this.happiness = Math.max(0, this.happiness - 0.3)
    this.cleanliness = Math.max(0, this.cleanliness - 0.2)

    if (this.hunger === 0 && this.happiness === 0 && this.cleanliness === 0) {
      this.isDead = true
      this.callbacks.onDeadChange?.(true)
    }

    if (!this.isSleeping) {
      this.poopUrgency = Math.min(100, this.poopUrgency + 2)
      if (this.poopUrgency >= 90 && this.poopCount < 5) {
        this.addPoop()
        this.poopUrgency = 0
      }
    }

    if (this.hunger < 20 && Math.random() < 0.1) {
      this.showMessage('BULK IS STARVING!')
      this.playSadAnimation()
    } else if (this.happiness < 20 && Math.random() < 0.1) {
      this.showMessage('BULK IS SAD!')
      this.playSadAnimation()
    } else if (this.cleanliness < 20 && Math.random() < 0.1) {
      this.showMessage('BULK IS DIRTY!')
      this.playSadAnimation()
    }

    this.checkAchievements()
    this.callbacks.onStatsChange?.(this.hunger, this.happiness, this.cleanliness)
    this.callbacks.onMoodChange?.(this.getMood())
    this.saveState()
  }

  private minuteTick(): void {
    this.callbacks.onAgeChange?.(this.getAgeString())
    this.callbacks.onGrowthStageChange?.(this.getGrowthStage())
    this.checkSleepTime()
  }

  private checkSleepTime(): void {
    const hour = new Date().getHours()
    const shouldSleep = hour >= 22 || hour < 6
    if (shouldSleep !== this.isSleeping) {
      this.isSleeping = shouldSleep
      if (!shouldSleep) {
        this.wakeUpTaps = 0
      }
      this.callbacks.onSleepChange?.(this.isSleeping)
    }
  }

  private getMood(): 'happy' | 'ok' | 'sad' | 'miserable' {
    const avg = (this.hunger + this.happiness + this.cleanliness) / 3
    if (avg > 70) return 'happy'
    if (avg > 40) return 'ok'
    if (avg > 20) return 'sad'
    return 'miserable'
  }

  private getAgeString(): string {
    const ageInMs = Date.now() - this.birthTime
    const days = Math.floor(ageInMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((ageInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((ageInMs % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  private getGrowthStage(): string {
    const ageInHours = (Date.now() - this.birthTime) / (1000 * 60 * 60)
    if (ageInHours < 1) return 'BABY'
    if (ageInHours < 24) return 'CHILD'
    if (ageInHours < 72) return 'TEEN'
    return 'ADULT'
  }

  private getXPForLevel(lvl: number): number {
    return 50 + lvl * 25
  }

  private addXP(amount: number): void {
    this.xp += amount
    let xpNeeded = this.getXPForLevel(this.level)

    while (this.xp >= xpNeeded) {
      this.xp -= xpNeeded
      this.level++
      this.showMessage(`LEVEL UP! NOW LEVEL ${this.level}!`)
      this.playSound('play')

      if (this.level >= 5 && !this.achievements.level5) this.unlockAchievement('level5')
      if (this.level >= 10 && !this.achievements.level10) this.unlockAchievement('level10')

      xpNeeded = this.getXPForLevel(this.level)
    }

    this.callbacks.onLevelChange?.(this.level, this.xp, this.getXPForLevel(this.level))
  }

  private addPoop(): void {
    if (this.poopCount >= 5) return

    this.poopCount++
    const rand = Math.random()
    let poopType: PoopData['type'] = 'normal'

    if (rand < 0.05) {
      poopType = 'golden'
      this.showMessage('WOW! A GOLDEN POOP!')
    } else if (rand < 0.25) {
      poopType = 'tiny'
    }

    this.poops.push({ type: poopType })

    const cleanReduction = poopType === 'golden' ? 5 : poopType === 'tiny' ? 5 : 10
    this.cleanliness = Math.max(0, this.cleanliness - cleanReduction)

    if (this.poopCount === 1) {
      this.showMessage('UH OH... BULK MADE A MESS!')
    }

    this.callbacks.onStatsChange?.(this.hunger, this.happiness, this.cleanliness)
    this.callbacks.onPoopCountChange?.(this.poopCount)
    this.saveState()
  }

  cleanPoop(index: number): void {
    if (index < 0 || index >= this.poops.length) return

    const poop = this.poops[index]
    this.poops.splice(index, 1)
    this.poopCount--

    let xpReward = 3
    let cleanBonus = 5

    if (poop.type === 'golden') {
      xpReward = 10
      cleanBonus = 10
      this.collection.goldenPoopsFound++
      this.showMessage('GOLDEN POOP CLEANED!')
      if (!this.achievements.goldenPoop) {
        this.unlockAchievement('goldenPoop')
      }
    } else if (poop.type === 'tiny') {
      xpReward = 2
      cleanBonus = 3
      this.showMessage('TINY POOP CLEANED!')
    } else {
      this.showMessage('POOP CLEANED!')
    }

    this.cleanliness = Math.min(100, this.cleanliness + cleanBonus)
    this.addXP(xpReward)
    this.playSound('clean')

    this.callbacks.onStatsChange?.(this.hunger, this.happiness, this.cleanliness)
    this.callbacks.onPoopCountChange?.(this.poopCount)
    this.callbacks.onMoodChange?.(this.getMood())
    this.saveState()
  }

  getPoops(): PoopData[] {
    return [...this.poops]
  }

  private updateCombo(): void {
    const now = Date.now()
    const timeSinceLastAction = now - this.lastActionTime

    if (timeSinceLastAction < 5000) {
      this.comboCount++
    } else {
      this.comboCount = 1
    }

    this.lastActionTime = now
    this.totalCareActions++

    if (this.comboCount > 3) {
      this.callbacks.onComboChange?.(this.comboCount)

      if (this.comboCount === 5) {
        this.showMessage('COMBO x5! BONUS HAPPINESS!')
        this.happiness = Math.min(100, this.happiness + 10)
      } else if (this.comboCount === 10) {
        this.showMessage('COMBO x10! MEGA BONUS!')
        this.happiness = Math.min(100, this.happiness + 20)
        this.hunger = Math.min(100, this.hunger + 10)
        this.cleanliness = Math.min(100, this.cleanliness + 10)
      } else if (this.comboCount > 10 && this.comboCount % 5 === 0) {
        this.showMessage(`AMAZING! x${this.comboCount} COMBO!`)
      }
    } else {
      this.callbacks.onComboChange?.(this.comboCount <= 3 ? 0 : this.comboCount)
    }

    if (this.comboTimeout) window.clearTimeout(this.comboTimeout)
    this.comboTimeout = window.setTimeout(() => {
      if (Date.now() - this.lastActionTime >= 5000) {
        this.comboCount = 0
        this.callbacks.onComboChange?.(0)
      }
    }, 5000)
  }

  private checkAchievements(): void {
    const ageInDays = (Date.now() - this.birthTime) / (1000 * 60 * 60 * 24)

    if (this.totalCareActions >= 1 && !this.achievements.firstFeed) this.unlockAchievement('firstFeed')
    if (this.comboCount >= 10 && !this.achievements.combo10) this.unlockAchievement('combo10')
    if (this.hunger === 100 && this.happiness === 100 && this.cleanliness === 100 && !this.achievements.perfectCare) this.unlockAchievement('perfectCare')
    if (ageInDays >= 1 && !this.achievements.oneDay) this.unlockAchievement('oneDay')
    if (this.totalCareActions >= 100 && !this.achievements.care100) this.unlockAchievement('care100')
    if (this.totalCareActions >= 500 && !this.achievements.care500) this.unlockAchievement('care500')
    if (ageInDays >= 3 && !this.achievements.threeDays) this.unlockAchievement('threeDays')
  }

  private unlockAchievement(id: string): void {
    this.achievements[id] = true
    const achievement = ACHIEVEMENTS_LIST.find((a) => a.id === id)
    if (achievement) {
      this.callbacks.onAchievementUnlocked?.(id, achievement.title)
      this.playSound('play')
    }
    this.updateCollectionStats()
    this.saveState()
  }

  private updateCollectionStats(): void {
    this.collection.maxCombo = Math.max(this.collection.maxCombo, this.comboCount)
    this.collection.achievementCount = Object.values(this.achievements).filter((a) => a).length
    this.callbacks.onCollectionChange?.(this.collection)
  }

  private showMessage(text: string): void {
    this.callbacks.onMessageChange?.(text)
    if (this.messageTimeout) window.clearTimeout(this.messageTimeout)
    this.messageTimeout = window.setTimeout(() => {
      this.callbacks.onMessageChange?.(null)
    }, 2000)
  }

  private playSound(type: 'feed' | 'play' | 'clean'): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext()
      }
      const ctx = this.audioContext
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime)

      if (type === 'feed') {
        oscillator.frequency.setValueAtTime(400, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1)
      } else if (type === 'play') {
        oscillator.frequency.setValueAtTime(600, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15)
      } else if (type === 'clean') {
        oscillator.frequency.setValueAtTime(500, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.12)
      }

      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.2)
    } catch {
      // Audio not available
    }
  }

  private startMusic(): void {
    if (!this.backgroundMusic) {
      this.backgroundMusic = new Audio(ASSET_PATHS.audio.jazz)
      this.backgroundMusic.loop = true
      this.backgroundMusic.volume = 0.15
    }
    this.backgroundMusic.play().catch(() => {})
  }

  private stopMusic(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause()
    }
  }

  private playHappyAnimation(): void {
    if (!this.bulkModel || this.isAnimatingBounce) return
    this.isAnimatingBounce = true
    const startY = this.bulk.position.y
    let time = 0
    const duration = 500

    const bounce = (): void => {
      if (this.disposed) { this.isAnimatingBounce = false; return }
      time += 16
      const progress = time / duration
      const bounceHeight = Math.sin(progress * Math.PI) * 0.3
      this.bulk.position.y = startY + bounceHeight

      if (time < duration) {
        requestAnimationFrame(bounce)
      } else {
        this.bulk.position.y = startY
        this.isAnimatingBounce = false
      }
    }
    bounce()
  }

  private playJumpAnimation(): void {
    if (!this.bulkModel || this.isAnimatingJump) return
    this.isAnimatingJump = true
    const startY = this.bulk.position.y
    let time = 0
    const duration = 600

    const jump = (): void => {
      if (this.disposed) { this.isAnimatingJump = false; return }
      time += 16
      const progress = time / duration
      const jumpHeight = Math.sin(progress * Math.PI) * 0.5
      const scale = 1 + Math.sin(progress * Math.PI) * 0.1

      this.bulk.position.y = startY + jumpHeight
      this.bulk.scale.set(scale, scale, scale)

      if (time < duration) {
        requestAnimationFrame(jump)
      } else {
        this.bulk.position.y = startY
        this.bulk.scale.set(1, 1, 1)
        this.isAnimatingJump = false
      }
    }
    jump()
  }

  private playSpinAnimation(): void {
    if (!this.bulkModel || this.isAnimatingSpin) return
    this.isAnimatingSpin = true
    let time = 0
    const duration = 800
    const startRotation = this.bulk.rotation.y

    const spin = (): void => {
      if (this.disposed) { this.isAnimatingSpin = false; return }
      time += 16
      const progress = time / duration
      this.bulk.rotation.y = startRotation + progress * Math.PI * 2

      if (time < duration) {
        requestAnimationFrame(spin)
      } else {
        this.bulk.rotation.y = startRotation
        this.isAnimatingSpin = false
      }
    }
    spin()
  }

  private playSadAnimation(): void {
    if (!this.bulkModel || this.isAnimatingShake) return
    this.isAnimatingShake = true
    let time = 0
    const duration = 500

    const shake = (): void => {
      if (this.disposed) { this.isAnimatingShake = false; return }
      time += 16
      const progress = time / duration
      const shakeAmount = Math.sin(progress * Math.PI * 8) * 0.1
      this.bulk.position.x = shakeAmount

      if (time < duration) {
        requestAnimationFrame(shake)
      } else {
        this.bulk.position.x = 0
        this.isAnimatingShake = false
      }
    }
    shake()
  }

  private spawnToy(): void {
    if (this.currentToy || this.isDead || this.isSleeping) return

    const toy = TOY_TYPES[Math.floor(Math.random() * TOY_TYPES.length)]
    const instance: ToyInstance = {
      emoji: toy.emoji,
      name: toy.name,
      happiness: toy.happiness,
      x: Math.random() * 60 + 20,
      y: Math.random() * 60 + 20,
    }

    this.currentToy = instance
    this.callbacks.onToySpawned?.(instance)

    if (this.currentToyTimeout) window.clearTimeout(this.currentToyTimeout)
    this.currentToyTimeout = window.setTimeout(() => {
      this.currentToy = null
      this.callbacks.onToySpawned?.(null)
    }, toy.duration)
  }

  playWithToy(): void {
    if (!this.currentToy || this.isDead || this.isSleeping) return

    this.happiness = Math.min(100, this.happiness + this.currentToy.happiness)
    this.collection.totalPlays++
    this.playSound('play')
    this.showMessage(`BULK PLAYED WITH ${this.currentToy.name.toUpperCase()}! +${this.currentToy.happiness} HAPPY`)

    if (this.currentToyTimeout) window.clearTimeout(this.currentToyTimeout)
    this.currentToy = null
    this.callbacks.onToySpawned?.(null)

    this.callbacks.onStatsChange?.(this.hunger, this.happiness, this.cleanliness)
    this.callbacks.onMoodChange?.(this.getMood())
    this.saveState()
  }

  private checkNotifications(): void {
    if (!this.notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return

    const now = Date.now()
    if (now - this.lastNotificationCheck < 60000) return
    this.lastNotificationCheck = now

    if (this.hunger < 30 || this.happiness < 30 || this.cleanliness < 30) {
      const body = this.hunger < 30 ? 'Bulk is hungry!' : this.happiness < 30 ? 'Bulk is sad!' : 'Bulk is dirty!'
      new Notification('BULK NEEDS ATTENTION!', { body })
    }
  }

  getDayNightPhase(): 'morning' | 'day' | 'evening' | 'night' {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 10) return 'morning'
    if (hour >= 10 && hour < 17) return 'day'
    if (hour >= 17 && hour < 20) return 'evening'
    return 'night'
  }

  getFortuneCookie(): string {
    return FORTUNE_COOKIES[Math.floor(Math.random() * FORTUNE_COOKIES.length)]
  }

  feedBulk(): void {
    if (this.isDead || this.isSleeping) {
      if (this.isSleeping) this.showMessage('SHHH! BULK IS SLEEPING!')
      return
    }

    this.hunger = Math.min(100, this.hunger + 30)
    this.happiness = Math.min(100, this.happiness + 10)
    this.poopUrgency = Math.min(100, this.poopUrgency + 20)
    this.collection.foodsEaten++
    this.addXP(5)
    this.showMessage(FEED_MESSAGES[Math.floor(Math.random() * FEED_MESSAGES.length)])
    this.playSound('feed')
    this.playJumpAnimation()
    this.updateCombo()
    this.checkAchievements()

    this.callbacks.onStatsChange?.(this.hunger, this.happiness, this.cleanliness)
    this.callbacks.onMoodChange?.(this.getMood())
    this.saveState()
  }

  playWithBulk(): void {
    if (this.isDead || this.isSleeping) {
      if (this.isSleeping) this.showMessage('SHHH! BULK IS SLEEPING!')
      return
    }

    this.happiness = Math.min(100, this.happiness + 40)
    this.hunger = Math.max(0, this.hunger - 5)
    this.collection.totalPlays++
    this.addXP(7)
    this.showMessage(PLAY_MESSAGES[Math.floor(Math.random() * PLAY_MESSAGES.length)])
    this.playSound('play')
    this.playSpinAnimation()
    this.updateCombo()
    this.checkAchievements()

    this.callbacks.onStatsChange?.(this.hunger, this.happiness, this.cleanliness)
    this.callbacks.onMoodChange?.(this.getMood())
    this.saveState()
  }

  cleanBulk(): void {
    if (this.isDead || this.isSleeping) {
      if (this.isSleeping) this.showMessage('SHHH! BULK IS SLEEPING!')
      return
    }

    this.cleanliness = Math.min(100, this.cleanliness + 50)
    this.happiness = Math.min(100, this.happiness + 5)
    this.collection.totalCleans++
    this.addXP(6)
    this.showMessage(CLEAN_MESSAGES[Math.floor(Math.random() * CLEAN_MESSAGES.length)])
    this.playSound('clean')
    this.playHappyAnimation()
    this.updateCombo()
    this.checkAchievements()

    this.callbacks.onStatsChange?.(this.hunger, this.happiness, this.cleanliness)
    this.callbacks.onMoodChange?.(this.getMood())
    this.saveState()
  }

  petBulk(): void {
    if (this.isDead || this.isSleeping) return

    this.happiness = Math.min(100, this.happiness + 5)
    this.collection.totalPets++
    this.playSound('play')
    this.playHappyAnimation()
    this.showMessage('BULK LOVES PETS!')
    this.updateCombo()
    this.checkAchievements()

    this.callbacks.onStatsChange?.(this.hunger, this.happiness, this.cleanliness)
    this.callbacks.onMoodChange?.(this.getMood())
    this.saveState()
  }

  tapToWakeUp(): void {
    if (!this.isSleeping) return

    this.wakeUpTaps++
    this.callbacks.onWakeUpTapsChange?.(this.wakeUpTaps, this.WAKE_UP_TAPS_NEEDED)

    if (this.wakeUpTaps >= this.WAKE_UP_TAPS_NEEDED) {
      this.isSleeping = false
      this.wakeUpTaps = 0
      this.callbacks.onSleepChange?.(false)
      this.callbacks.onWakeUpTapsChange?.(0, this.WAKE_UP_TAPS_NEEDED)

      const stats = ['hunger', 'happiness', 'cleanliness'] as const
      const resetStat = stats[Math.floor(Math.random() * stats.length)]

      if (resetStat === 'hunger') {
        this.hunger = 0
        this.showMessage('BULK IS ANGRY! YOU WOKE HIM UP! HUNGER = 0!')
      } else if (resetStat === 'happiness') {
        this.happiness = 0
        this.showMessage('BULK IS ANGRY! YOU WOKE HIM UP! HAPPINESS = 0!')
      } else {
        this.cleanliness = 0
        this.showMessage('BULK IS ANGRY! YOU WOKE HIM UP! CLEANLINESS = 0!')
      }

      this.playSound('clean')
      this.callbacks.onStatsChange?.(this.hunger, this.happiness, this.cleanliness)
      this.callbacks.onMoodChange?.(this.getMood())
      this.saveState()
    }
  }

  reviveBulk(): void {
    this.isDead = false
    this.hunger = 50
    this.happiness = 50
    this.cleanliness = 50
    this.showMessage('BULK IS BACK! TAKE BETTER CARE!')
    this.playSound('play')
    if (!this.achievements.revival) this.unlockAchievement('revival')

    this.callbacks.onDeadChange?.(false)
    this.callbacks.onStatsChange?.(this.hunger, this.happiness, this.cleanliness)
    this.callbacks.onMoodChange?.(this.getMood())
    this.saveState()
  }

  toggleMusic(): void {
    this.musicEnabled = !this.musicEnabled
    this.callbacks.onMusicEnabledChange?.(this.musicEnabled)

    if (this.musicEnabled) {
      this.startMusic()
    } else {
      this.stopMusic()
    }

    this.saveState()
  }

  requestNotifications(): void {
    if (!('Notification' in window)) {
      this.showMessage('NOTIFICATIONS NOT SUPPORTED!')
      return
    }

    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        this.notificationsEnabled = true
        this.showMessage('NOTIFICATIONS ENABLED!')
      } else {
        this.notificationsEnabled = false
        this.showMessage('NOTIFICATIONS DENIED!')
      }
      this.callbacks.onNotificationsEnabledChange?.(this.notificationsEnabled)
      this.saveState()
    })
  }

  getCollection(): CollectionStats {
    return { ...this.collection }
  }

  getAchievements(): Record<string, boolean> {
    return { ...this.achievements }
  }

  getAchievementsList(): AchievementDef[] {
    return ACHIEVEMENTS_LIST
  }

  isRebirthAvailable(): boolean {
    const ageInDays = (Date.now() - this.birthTime) / (1000 * 60 * 60 * 24)
    return this.level >= 20 && ageInDays >= 7
  }

  getRebirthInfo(): { level: number; ageInDays: number } {
    const ageInDays = Math.floor((Date.now() - this.birthTime) / (1000 * 60 * 60 * 24))
    return { level: this.level, ageInDays }
  }

  performRebirth(): void {
    if (!this.isRebirthAvailable()) return

    this.rebirthCount++
    this.level = 1
    this.xp = 0
    this.birthTime = Date.now()
    this.hunger = 100
    this.happiness = 100
    this.cleanliness = 100
    this.totalCareActions = 0
    this.poopCount = 0
    this.poopUrgency = 0
    this.poops = []
    this.isDead = false
    this.isSleeping = false

    this.showMessage(`REBIRTH ${this.rebirthCount}! BULK IS REBORN!`)

    this.callbacks.onRebirthCountChange?.(this.rebirthCount)
    this.emitAllState()
    this.saveState()
  }

  getRebirthCount(): number {
    return this.rebirthCount
  }

  getBirthTime(): number {
    return this.birthTime
  }

  getLevel(): number {
    return this.level
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.animationFrameId)

    window.removeEventListener('resize', this.boundOnResize)
    this.renderer.domElement.removeEventListener('click', this.boundOnClick)

    window.clearInterval(this.decayInterval)
    window.clearInterval(this.minuteInterval)
    window.clearInterval(this.toyInterval)
    window.clearInterval(this.collectionInterval)
    window.clearInterval(this.notificationInterval)
    if (this.comboTimeout) window.clearTimeout(this.comboTimeout)
    if (this.messageTimeout) window.clearTimeout(this.messageTimeout)
    if (this.currentToyTimeout) window.clearTimeout(this.currentToyTimeout)

    this.stopMusic()
    if (this.backgroundMusic) {
      this.backgroundMusic.src = ''
      this.backgroundMusic = null
    }
    this.audioContext?.close()
    this.audioContext = null

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose()
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose())
        } else {
          object.material?.dispose()
        }
      }
    })

    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }
}
