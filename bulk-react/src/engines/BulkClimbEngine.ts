import * as THREE from 'three'
import { BaseGameEngine, type GameCallbacks } from './shared/BaseGameEngine'
import { loadGLBModel, type LoadedModel } from './shared/ModelLoader'
import { AudioManager } from './shared/AudioManager'
import { ASSET_PATHS } from '../constants'

export class BulkClimbEngine extends BaseGameEngine {
  // Model state
  private bulk: THREE.Group | null = null
  private mixer: THREE.AnimationMixer | null = null

  // Game state
  private gameStarted = false
  private gameOver = false
  private score = 0
  private height = 0
  private bulkX = 0
  private climbSpeed = 2
  private obstacleSpeed = 3
  private currentLane = 2
  private targetX = 0
  private facingRight = true
  private lastObstacleTime = 0
  private obstacleSpawnDelay = 1500
  private lastObstacleLane = -1

  // Scene elements
  private obstacles: THREE.Mesh[] = []
  private buildingSegments: THREE.Object3D[] = []
  private windows: THREE.Object3D[] = []

  // Audio
  private audio = new AudioManager()

  // Constants
  private readonly LANE_POSITIONS = [-200, -100, 0, 100, 200]
  private readonly BULK_Y = -300
  private readonly SEGMENT_COUNT = 10
  private readonly SEGMENT_HEIGHT = 200
  private readonly RECYCLE_THRESHOLD = -600
  private readonly RECYCLE_OFFSET = 2000
  private readonly COLLISION_DIST_X = 50
  private readonly COLLISION_DIST_Y = 50

  // Bound event handlers
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundTouchStart: (e: TouchEvent) => void
  private boundTouchEnd: (e: TouchEvent) => void
  private boundClick: (e: MouseEvent) => void
  private touchStartX = 0

  constructor(container: HTMLElement, callbacks: GameCallbacks) {
    super(container, callbacks)
    this.boundKeyDown = this.handleKeyDown.bind(this)
    this.boundTouchStart = this.handleTouchStart.bind(this)
    this.boundTouchEnd = this.handleTouchEnd.bind(this)
    this.boundClick = this.handleClick.bind(this)
  }

  createScene(): void {
    this.scene.background = new THREE.Color(0x000820)
    this.scene.fog = new THREE.Fog(0x000820, 200, 1000)

    // Orthographic camera
    const aspect = this.container.clientWidth / this.container.clientHeight
    const viewSize = 500
    this.camera = new THREE.OrthographicCamera(
      -viewSize * aspect,
      viewSize * aspect,
      viewSize,
      -viewSize + 60,
      1,
      1000,
    )
    this.camera.position.z = 500
    this.camera.lookAt(0, 0, 0)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x6666ff, 0.4)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(200, 500, 300)
    directionalLight.castShadow = true
    this.scene.add(directionalLight)

    const purpleLight = new THREE.PointLight(0x9b30ff, 0.5, 500)
    purpleLight.position.set(-200, 0, 100)
    this.scene.add(purpleLight)

    const goldLight = new THREE.PointLight(0xffd700, 0.3, 500)
    goldLight.position.set(200, 0, 100)
    this.scene.add(goldLight)

    // Enable shadow maps on the renderer
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Audio
    this.audio.loadBGM(ASSET_PATHS.audio.bgm, 0.3)

    // Build background
    this.createBuilding()

    // Load character model
    this.loadBulkModel()

    // Controls
    this.setupControls()
  }

  // ---------------------------------------------------------------
  // Building background
  // ---------------------------------------------------------------

  private createBuilding(): void {
    for (let i = 0; i < this.SEGMENT_COUNT; i++) {
      const y = i * this.SEGMENT_HEIGHT - 400

      // Building wall
      const wallGeometry = new THREE.PlaneGeometry(800, this.SEGMENT_HEIGHT)
      const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x0f0f2a,
        metalness: 0.4,
        roughness: 0.6,
        side: THREE.DoubleSide,
      })
      const wall = new THREE.Mesh(wallGeometry, wallMaterial)
      wall.position.set(0, y, -100)
      wall.receiveShadow = true
      this.scene.add(wall)
      this.buildingSegments.push(wall)

      // Vertical support beams
      for (let beam = -3; beam <= 3; beam++) {
        const beamGeometry = new THREE.BoxGeometry(8, this.SEGMENT_HEIGHT, 5)
        const beamMaterial = new THREE.MeshStandardMaterial({
          color: 0x2a2a4a,
          metalness: 0.8,
          roughness: 0.2,
        })
        const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial)
        beamMesh.position.set(beam * 100, y, -95)
        this.scene.add(beamMesh)
        this.buildingSegments.push(beamMesh)
      }

      // Windows / bricks
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 8; col++) {
          // Deterministic pseudo-random pattern from original
          const seed =
            Math.sin(i * 12.9898 + row * 78.233 + col * 43.758) * 43758.5453
          const randomVal = seed - Math.floor(seed)
          const isLit = randomVal > 0.75

          if (isLit) {
            // Lit window
            const windowGeometry = new THREE.PlaneGeometry(30, 40)
            const isBlue = randomVal > 0.8
            const windowColor = isBlue ? 0x66ffff : 0xffff66
            const emissiveColor = isBlue ? 0x00ffff : 0xffff00

            const windowMaterial = new THREE.MeshStandardMaterial({
              color: windowColor,
              emissive: emissiveColor,
              emissiveIntensity: 1.0,
              metalness: 0.1,
              roughness: 0.1,
            })
            const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial)
            windowMesh.position.set(
              (col - 3.5) * 80,
              y + (row - 1.5) * 50,
              -99,
            )
            this.scene.add(windowMesh)
            this.windows.push(windowMesh)

            // Glow halo
            const glowGeometry = new THREE.PlaneGeometry(38, 48)
            const glowMaterial = new THREE.MeshBasicMaterial({
              color: emissiveColor,
              transparent: true,
              opacity: 0.3,
              side: THREE.DoubleSide,
            })
            const glow = new THREE.Mesh(glowGeometry, glowMaterial)
            glow.position.set(
              (col - 3.5) * 80,
              y + (row - 1.5) * 50,
              -98,
            )
            this.scene.add(glow)
            this.windows.push(glow)
          } else {
            // Brick / dark window
            const brickGeometry = new THREE.BoxGeometry(30, 40, 8)
            const brickMaterial = new THREE.MeshStandardMaterial({
              color: 0x3a2a4a,
              metalness: 0.2,
              roughness: 0.8,
            })
            const brickMesh = new THREE.Mesh(brickGeometry, brickMaterial)
            brickMesh.position.set(
              (col - 3.5) * 80,
              y + (row - 1.5) * 50,
              -99,
            )
            this.scene.add(brickMesh)
            this.windows.push(brickMesh)
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // Model loading
  // ---------------------------------------------------------------

  private async loadBulkModel(): Promise<void> {
    try {
      const loaded: LoadedModel = await loadGLBModel(ASSET_PATHS.models.run, 120)
      if (this.disposed) return
      const model = loaded.scene
      model.position.set(0, this.BULK_Y, 0)
      model.rotation.y = Math.PI / 2 // face right

      this.mixer = loaded.mixer
      this.scene.add(model)
      this.bulk = model
    } catch (err) {
      console.error('Error loading model:', err)
      // Fallback: simple box character
      const group = new THREE.Group()
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(60, 100, 60),
        new THREE.MeshStandardMaterial({ color: 0x9b4dca }),
      )
      body.position.y = 50
      group.add(body)
      group.position.set(0, this.BULK_Y, 0)
      this.scene.add(group)
      this.bulk = group
    }
  }

  // ---------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------

  private setupControls(): void {
    document.addEventListener('keydown', this.boundKeyDown)
    this.renderer.domElement.addEventListener('touchstart', this.boundTouchStart)
    this.renderer.domElement.addEventListener('touchend', this.boundTouchEnd)
    this.renderer.domElement.addEventListener('click', this.boundClick)
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.gameStarted || this.gameOver) return

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.moveLane(-1)
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.moveLane(1)
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    if (!this.gameStarted || this.gameOver) return
    this.touchStartX = e.touches[0].clientX
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (!this.gameStarted || this.gameOver) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchEndX - this.touchStartX

    if (Math.abs(diff) > 30) {
      this.moveLane(diff < 0 ? -1 : 1)
    }
  }

  private handleClick(e: MouseEvent): void {
    if (!this.gameStarted || this.gameOver) return
    const rect = this.renderer.domElement.getBoundingClientRect()
    const x = e.clientX - rect.left
    const centerX = rect.width / 2

    if (x < centerX) {
      this.moveLane(-1)
    } else {
      this.moveLane(1)
    }
  }

  /**
   * Move one lane left (dir = -1) or right (dir = +1).
   */
  private moveLane(dir: -1 | 1): void {
    const newLane = this.currentLane + dir
    if (newLane < 0 || newLane > 4) return

    this.currentLane = newLane
    this.targetX = this.LANE_POSITIONS[this.currentLane]

    if (dir < 0) {
      this.facingRight = false
      if (this.bulk) this.bulk.rotation.y = -Math.PI / 2
    } else {
      this.facingRight = true
      if (this.bulk) this.bulk.rotation.y = Math.PI / 2
    }
  }

  // ---------------------------------------------------------------
  // Obstacle spawning
  // ---------------------------------------------------------------

  private createObstacle(): void {
    const types = ['box', 'beam', 'barrel'] as const
    const type = types[Math.floor(Math.random() * types.length)]

    let geometry: THREE.BufferGeometry
    let material: THREE.MeshStandardMaterial

    if (type === 'box') {
      geometry = new THREE.BoxGeometry(60, 60, 60)
      material = new THREE.MeshStandardMaterial({
        color: 0xff3333,
        metalness: 0.5,
        roughness: 0.3,
        emissive: 0xff0000,
        emissiveIntensity: 0.3,
      })
    } else if (type === 'beam') {
      geometry = new THREE.BoxGeometry(80, 20, 40)
      material = new THREE.MeshStandardMaterial({
        color: 0xff9900,
        metalness: 0.7,
        roughness: 0.2,
        emissive: 0xff6600,
        emissiveIntensity: 0.2,
      })
    } else {
      geometry = new THREE.CylinderGeometry(30, 30, 60, 16)
      material = new THREE.MeshStandardMaterial({
        color: 0x555555,
        metalness: 0.8,
        roughness: 0.4,
      })
    }

    const obstacle = new THREE.Mesh(geometry, material)
    obstacle.castShadow = true
    obstacle.receiveShadow = true

    // Pick a lane different from the last one
    let lane: number
    do {
      lane = Math.floor(Math.random() * 5)
    } while (lane === this.lastObstacleLane && this.LANE_POSITIONS.length > 1)

    this.lastObstacleLane = lane
    obstacle.position.set(this.LANE_POSITIONS[lane], 400, 0)
    obstacle.userData.type = type

    // Warning glow child
    const glowGeometry = geometry.clone()
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.scale.multiplyScalar(1.2)
    obstacle.add(glow)

    this.scene.add(obstacle)
    this.obstacles.push(obstacle)
  }

  // ---------------------------------------------------------------
  // Game lifecycle (public API)
  // ---------------------------------------------------------------

  start(): void {
    this.gameStarted = true
    this.gameOver = false
    this.score = 0
    this.height = 0
    this.currentLane = 2
    this.targetX = this.LANE_POSITIONS[2]
    this.bulkX = 0
    this.facingRight = true
    this.lastObstacleTime = Date.now()
    this.lastObstacleLane = -1
    this.climbSpeed = 2
    this.obstacleSpeed = 3
    this.obstacleSpawnDelay = 1500

    // Remove existing obstacles
    this.obstacles.forEach((obs) => this.scene.remove(obs))
    this.obstacles = []

    // Reset character position
    if (this.bulk) {
      this.bulk.position.set(0, this.BULK_Y, 0)
      this.bulk.rotation.y = Math.PI / 2
    }

    // Audio
    this.audio.playBGM()

    // Notify React
    this.callbacks.onScoreChange?.(0)
    this.callbacks.onHeightChange?.(0)
    this.callbacks.onStateChange?.('playing')
  }

  restart(): void {
    this.start()
  }

  // ---------------------------------------------------------------
  // Main update loop
  // ---------------------------------------------------------------

  update(delta: number): void {
    if (!this.gameStarted || this.gameOver) return

    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(delta)
    }

    // Smoothly move bulk toward target lane
    if (this.bulk) {
      const diff = this.targetX - this.bulkX
      this.bulkX += diff * 0.15
      this.bulk.position.x = this.bulkX
    }

    // Scroll building segments downward
    for (const seg of this.buildingSegments) {
      seg.position.y -= this.climbSpeed
      if (seg.position.y < this.RECYCLE_THRESHOLD) {
        seg.position.y += this.RECYCLE_OFFSET
      }
    }

    for (const win of this.windows) {
      win.position.y -= this.climbSpeed
      if (win.position.y < this.RECYCLE_THRESHOLD) {
        win.position.y += this.RECYCLE_OFFSET
      }
    }

    // Move obstacles downward, check collisions, remove off-screen
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i]
      obs.position.y -= this.obstacleSpeed
      obs.rotation.x += 0.02
      obs.rotation.y += 0.03

      // Collision detection
      if (this.bulk) {
        const distX = Math.abs(obs.position.x - this.bulk.position.x)
        const distY = Math.abs(obs.position.y - this.bulk.position.y)

        if (distX < this.COLLISION_DIST_X && distY < this.COLLISION_DIST_Y) {
          this.endGame()
          return
        }
      }

      // Remove if off screen and award dodge points
      if (obs.position.y < this.RECYCLE_THRESHOLD) {
        this.disposeObject(obs)
        this.obstacles.splice(i, 1)
        this.score += 10
      }
    }

    // Spawn obstacles with controlled spacing
    const currentTime = Date.now()
    if (currentTime - this.lastObstacleTime > this.obstacleSpawnDelay) {
      this.createObstacle()
      this.lastObstacleTime = currentTime
    }

    // Update score and height (per-frame increment, matching original)
    this.score += 1
    this.height = Math.floor(this.score / 10)

    // Notify React
    this.callbacks.onScoreChange?.(this.score)
    this.callbacks.onHeightChange?.(this.height)

    // Gradually increase difficulty
    this.climbSpeed = 2 + this.height * 0.01
    this.obstacleSpeed = 3 + this.height * 0.015
    this.obstacleSpawnDelay = Math.max(800, 1500 - this.height * 10)
  }

  // ---------------------------------------------------------------
  // Game over
  // ---------------------------------------------------------------

  private endGame(): void {
    this.gameOver = true
    this.audio.pauseBGM()
    this.callbacks.onStateChange?.('gameover')
  }

  // ---------------------------------------------------------------
  // Resize handling
  // ---------------------------------------------------------------

  protected onResize(width: number, height: number): void {
    if (this.camera instanceof THREE.OrthographicCamera) {
      const aspect = width / height
      const viewSize = 500
      this.camera.left = -viewSize * aspect
      this.camera.right = viewSize * aspect
      this.camera.top = viewSize
      this.camera.bottom = -viewSize + 60
      this.camera.updateProjectionMatrix()
    }
  }

  // ---------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------

  dispose(): void {
    document.removeEventListener('keydown', this.boundKeyDown)
    this.renderer.domElement.removeEventListener('touchstart', this.boundTouchStart)
    this.renderer.domElement.removeEventListener('touchend', this.boundTouchEnd)
    this.renderer.domElement.removeEventListener('click', this.boundClick)
    this.audio.dispose()
    super.dispose()
  }
}
