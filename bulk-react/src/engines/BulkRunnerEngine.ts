import * as THREE from 'three'
import { BaseGameEngine, type GameCallbacks } from './shared/BaseGameEngine'
import { loadGLBModel } from './shared/ModelLoader'
import { AudioManager } from './shared/AudioManager'
import { ASSET_PATHS } from '../constants'

export class BulkRunnerEngine extends BaseGameEngine {
  // Player
  private bulk: THREE.Group | null = null
  private mixer: THREE.AnimationMixer | null = null

  // Game state
  private gameStarted = false
  private gameOver = false
  private score = 0
  private distance = 0
  private speed = 0.5
  private money = 0

  // Lane system
  private currentLane = 1 // 0=left, 1=center, 2=right
  private readonly lanePositions = [-3, 0, 3]

  // Collections
  private obstacles: THREE.Group[] = []
  private groundTiles: THREE.Object3D[] = []
  private drinks: THREE.Group[] = []
  private buildings: THREE.Group[] = []
  private explosions: THREE.Group[] = []

  // Jump mechanics
  private isJumping = false
  private jumpVelocity = 0
  private readonly gravity = -0.02
  private readonly jumpStrength = 0.35
  private readonly groundLevel = 0.2

  // Touch controls
  private touchStartX = 0
  private touchStartY = 0

  // Car spawn prevention
  private lastSpawnTime: Record<number, number> = {}
  private readonly minSpawnInterval = 1500

  // Game-over delay
  private gameOverTimer: ReturnType<typeof setTimeout> | null = null

  // Audio
  private audio = new AudioManager()

  // Bound event handlers
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundTouchStart: (e: TouchEvent) => void
  private boundTouchEnd: (e: TouchEvent) => void

  constructor(container: HTMLElement, callbacks: GameCallbacks) {
    super(container, callbacks)
    this.boundKeyDown = this.handleKeyDown.bind(this)
    this.boundTouchStart = this.handleTouchStart.bind(this)
    this.boundTouchEnd = this.handleTouchEnd.bind(this)
  }

  // ─── Scene setup ───────────────────────────────────────────────

  createScene(): void {
    // Night city atmosphere
    this.scene.background = new THREE.Color(0x0a0a15)
    this.scene.fog = new THREE.Fog(0x0a0a15, 50, 200)

    // Camera - behind and above player
    const cam = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000,
    )
    cam.position.set(0, 5, 10)
    cam.lookAt(0, 2, 0)
    this.camera = cam

    // Renderer shadows
    this.renderer.shadowMap.enabled = true

    // Lights - city night lighting
    const ambient = new THREE.AmbientLight(0x404060, 0.3)
    this.scene.add(ambient)

    // Moonlight
    const moon = new THREE.DirectionalLight(0x6666aa, 0.5)
    moon.position.set(5, 30, 10)
    moon.castShadow = true
    this.scene.add(moon)

    // Purple city glow from below
    const cityGlow = new THREE.DirectionalLight(0x9b30ff, 0.4)
    cityGlow.position.set(0, -5, 0)
    this.scene.add(cityGlow)

    // Street light effect (hemisphere)
    const streetLight = new THREE.HemisphereLight(0xffffcc, 0x222233, 0.6)
    this.scene.add(streetLight)

    // Build world
    this.createGround()
    this.createCity()
    this.createBulk()

    // Audio
    this.audio.loadBGM(ASSET_PATHS.audio.run, 0.25)

    // Controls
    this.setupControls()
  }

  // ─── Ground / road ─────────────────────────────────────────────

  private createGround(): void {
    for (let i = 0; i < 20; i++) {
      // Main road (dark asphalt)
      const groundGeo = new THREE.PlaneGeometry(12, 20)
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
      const tile = new THREE.Mesh(groundGeo, groundMat)
      tile.rotation.x = -Math.PI / 2
      tile.position.z = -i * 20
      tile.receiveShadow = true
      this.scene.add(tile)
      this.groundTiles.push(tile)

      // Sidewalks on both sides
      const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a })

      const leftSidewalk = new THREE.Mesh(new THREE.PlaneGeometry(4, 20), sidewalkMat)
      leftSidewalk.rotation.x = -Math.PI / 2
      leftSidewalk.position.set(-8, 0.05, -i * 20)
      this.scene.add(leftSidewalk)
      this.groundTiles.push(leftSidewalk)

      const rightSidewalk = new THREE.Mesh(new THREE.PlaneGeometry(4, 20), sidewalkMat)
      rightSidewalk.rotation.x = -Math.PI / 2
      rightSidewalk.position.set(8, 0.05, -i * 20)
      this.scene.add(rightSidewalk)
      this.groundTiles.push(rightSidewalk)

      // Lane markers (white road lines)
      for (let lane = 0; lane < 3; lane++) {
        const marker = new THREE.Mesh(
          new THREE.PlaneGeometry(0.3, 3),
          new THREE.MeshStandardMaterial({ color: 0xffffff }),
        )
        marker.rotation.x = -Math.PI / 2
        marker.position.set(this.lanePositions[lane], 0.02, -i * 20)
        this.scene.add(marker)
        this.groundTiles.push(marker)
      }

      // Yellow center line
      const centerLine = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 20),
        new THREE.MeshStandardMaterial({ color: 0xffcc00 }),
      )
      centerLine.rotation.x = -Math.PI / 2
      centerLine.position.set(0, 0.02, -i * 20)
      this.scene.add(centerLine)
      this.groundTiles.push(centerLine)
    }
  }

  // ─── City buildings ────────────────────────────────────────────

  private readonly buildingColors = [
    0x2a2a3a, 0x3a3a4a, 0x252535, 0x1a1a2a, 0x353545,
    0x404050, 0x2f2f3f, 0x454555,
  ]
  private readonly windowColor = 0xffffaa

  private createCity(): void {
    for (let i = 0; i < 30; i++) {
      this.createBuilding(-12 - Math.random() * 5, -i * 15)
      this.createBuilding(12 + Math.random() * 5, -i * 15)
    }
  }

  private createBuilding(x: number, z: number): void {
    const building = new THREE.Group()

    // Random building dimensions
    const width = 4 + Math.random() * 6
    const height = 15 + Math.random() * 40
    const depth = 4 + Math.random() * 6

    // Main building body
    const bodyGeo = new THREE.BoxGeometry(width, height, depth)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.buildingColors[Math.floor(Math.random() * this.buildingColors.length)],
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = height / 2
    body.castShadow = true
    body.receiveShadow = true
    building.add(body)

    // Windows (emissive rectangles)
    const windowMat = new THREE.MeshStandardMaterial({
      color: this.windowColor,
      emissive: this.windowColor,
      emissiveIntensity: 0.5 + Math.random() * 0.5,
    })

    const windowRows = Math.floor(height / 3)
    const windowCols = Math.floor(width / 1.5)

    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        if (Math.random() > 0.7) continue // some lights off

        const windowGeo = new THREE.PlaneGeometry(0.8, 1.2)
        const windowMesh = new THREE.Mesh(windowGeo, windowMat)

        const wx = -width / 2 + 1 + col * 1.5
        const wy = 2 + row * 3
        windowMesh.position.set(wx, wy, depth / 2 + 0.01)
        building.add(windowMesh)

        const windowBack = windowMesh.clone()
        windowBack.position.z = -depth / 2 - 0.01
        windowBack.rotation.y = Math.PI
        building.add(windowBack)
      }
    }

    // Rooftop details
    if (Math.random() > 0.5) {
      const roofGeo = new THREE.BoxGeometry(1.5, 2, 1.5)
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x555555 })
      const roofDetail = new THREE.Mesh(roofGeo, roofMat)
      roofDetail.position.set(
        (Math.random() - 0.5) * width * 0.5,
        height + 1,
        (Math.random() - 0.5) * depth * 0.5,
      )
      building.add(roofDetail)
    }

    // Antenna on some tall buildings
    if (height > 35 && Math.random() > 0.5) {
      const antennaGeo = new THREE.CylinderGeometry(0.1, 0.1, 8, 8)
      const antennaMat = new THREE.MeshStandardMaterial({ color: 0x888888 })
      const antenna = new THREE.Mesh(antennaGeo, antennaMat)
      antenna.position.y = height + 4
      building.add(antenna)

      // Blinking red light
      const lightGeo = new THREE.SphereGeometry(0.2, 8, 8)
      const lightMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1,
      })
      const light = new THREE.Mesh(lightGeo, lightMat)
      light.position.y = height + 8
      building.add(light)
    }

    building.position.set(x, 0, z)
    this.scene.add(building)
    this.buildings.push(building)
  }

  // ─── Bulk character ────────────────────────────────────────────

  private createBulk(): void {
    this.bulk = new THREE.Group()
    this.bulk.position.set(0, 0, 0)
    this.scene.add(this.bulk)
    this.loadBulkModel()
  }

  private async loadBulkModel(): Promise<void> {
    try {
      const { scene: model, mixer } = await loadGLBModel(ASSET_PATHS.models.run, 4)
      if (this.disposed) return

      // Adjust model vertical position (raise by 10 % like the original)
      const box = new THREE.Box3().setFromObject(model)
      const yOffset = -box.min.y * 0.1
      model.position.y += yOffset

      // Rotate 180 degrees to face forward (away from camera)
      model.rotation.y = Math.PI

      this.mixer = mixer

      if (this.bulk) {
        this.bulk.add(model)
      }
    } catch {
      this.createFallbackBulk()
    }
  }

  private createFallbackBulk(): void {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9b30ff,
      emissive: 0x4a0080,
      emissiveIntensity: 0.3,
    })

    const modelContainer = new THREE.Group()

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 1), mat)
    body.position.y = 2.2
    body.castShadow = true
    modelContainer.add(body)

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat)
    head.position.y = 3.85
    head.castShadow = true
    modelContainer.add(head)

    // Arms
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), mat)
    armL.position.set(-1.2, 2.2, 0)
    armL.castShadow = true
    modelContainer.add(armL)

    const armR = armL.clone()
    armR.position.x = 1.2
    modelContainer.add(armR)

    // Legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), mat)
    legL.position.set(-0.4, 0.66, 0)
    legL.castShadow = true
    modelContainer.add(legL)

    const legR = legL.clone()
    legR.position.x = 0.4
    modelContainer.add(legR)

    // Rotate 180 to face forward
    modelContainer.rotation.y = Math.PI

    if (this.bulk) {
      this.bulk.add(modelContainer)
    }
  }

  // ─── Obstacles (cars) ──────────────────────────────────────────

  private createObstacle(): void {
    const now = Date.now()
    const availableLanes: number[] = []

    for (let i = 0; i < 3; i++) {
      const timeSinceLastSpawn = now - (this.lastSpawnTime[i] || 0)
      if (timeSinceLastSpawn > this.minSpawnInterval) {
        availableLanes.push(i)
      }
    }

    if (availableLanes.length === 0) return

    const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)]
    this.lastSpawnTime[lane] = now

    const car = new THREE.Group()

    // Random car color
    const carColors = [0xff3333, 0x3333ff, 0x33ff33, 0xffff33, 0xff9900, 0x00ffff, 0xff00ff, 0xffffff]
    const carColor = carColors[Math.floor(Math.random() * carColors.length)]
    const carMat = new THREE.MeshStandardMaterial({ color: carColor, metalness: 0.8, roughness: 0.3 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111 })
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 })

    // Car body (main)
    const bodyGeo = new THREE.BoxGeometry(2, 1, 4)
    const bodyMesh = new THREE.Mesh(bodyGeo, carMat)
    bodyMesh.position.y = 0.7
    bodyMesh.castShadow = true
    car.add(bodyMesh)

    // Car roof/cabin
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.8, 2)
    const cabin = new THREE.Mesh(cabinGeo, carMat)
    cabin.position.set(0, 1.5, -0.3)
    cabin.castShadow = true
    car.add(cabin)

    // Windshield
    const windshieldGeo = new THREE.PlaneGeometry(1.6, 0.7)
    const windshield = new THREE.Mesh(windshieldGeo, glassMat)
    windshield.position.set(0, 1.5, 0.75)
    windshield.rotation.x = -0.3
    car.add(windshield)

    // Rear window
    const rearWindow = new THREE.Mesh(windshieldGeo, glassMat)
    rearWindow.position.set(0, 1.5, -1.35)
    rearWindow.rotation.x = 0.3
    rearWindow.rotation.y = Math.PI
    car.add(rearWindow)

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16)
    const wheelPositions: [number, number, number][] = [
      [-1, 0.4, 1.2], [1, 0.4, 1.2],
      [-1, 0.4, -1.2], [1, 0.4, -1.2],
    ]
    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeo, darkMat)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(pos[0], pos[1], pos[2])
      wheel.castShadow = true
      car.add(wheel)
    })

    // Headlights
    const lightGeo = new THREE.BoxGeometry(0.3, 0.2, 0.1)
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffaa,
      emissive: 0xffffaa,
      emissiveIntensity: 0.8,
    })
    const headlightL = new THREE.Mesh(lightGeo, lightMat)
    headlightL.position.set(-0.6, 0.7, 2)
    car.add(headlightL)
    const headlightR = headlightL.clone()
    headlightR.position.x = 0.6
    car.add(headlightR)

    // Taillights
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    })
    const taillightL = new THREE.Mesh(lightGeo, tailMat)
    taillightL.position.set(-0.6, 0.7, -2)
    car.add(taillightL)
    const taillightR = taillightL.clone()
    taillightR.position.x = 0.6
    car.add(taillightR)

    car.position.set(this.lanePositions[lane], 0, -200)
    car.userData.lane = lane
    this.scene.add(car)
    this.obstacles.push(car)
  }

  // ─── Explosion effect ──────────────────────────────────────────

  private createExplosion(x: number, y: number, z: number): void {
    const explosion = new THREE.Group()
    explosion.position.set(x, y, z)

    // Fire particles
    const particleCount = 30
    for (let i = 0; i < particleCount; i++) {
      const size = 0.3 + Math.random() * 0.5
      const geo = new THREE.SphereGeometry(size, 8, 8)
      const colors = [0xff4400, 0xff8800, 0xffcc00, 0xff0000, 0xffff00]
      const mat = new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        emissive: colors[Math.floor(Math.random() * colors.length)],
        emissiveIntensity: 2,
      })
      const particle = new THREE.Mesh(geo, mat)
      particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.3 + 0.1,
        (Math.random() - 0.5) * 0.5,
      )
      particle.userData.life = 1
      explosion.add(particle)
    }

    // Debris (car parts)
    for (let i = 0; i < 10; i++) {
      const debrisGeo = new THREE.BoxGeometry(
        0.2 + Math.random() * 0.4,
        0.1 + Math.random() * 0.2,
        0.2 + Math.random() * 0.4,
      )
      const debrisMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
      const debris = new THREE.Mesh(debrisGeo, debrisMat)
      debris.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        Math.random() * 0.4 + 0.2,
        (Math.random() - 0.5) * 0.4,
      )
      debris.userData.rotSpeed = new THREE.Vector3(
        Math.random() * 0.3,
        Math.random() * 0.3,
        Math.random() * 0.3,
      )
      debris.userData.life = 1
      explosion.add(debris)
    }

    // Flash light
    const flashLight = new THREE.PointLight(0xff8800, 5, 20)
    explosion.add(flashLight)
    explosion.userData.flashLight = flashLight
    explosion.userData.age = 0

    this.scene.add(explosion)
    this.explosions.push(explosion)
  }

  // ─── Drink pickups ─────────────────────────────────────────────

  private createDrink(): void {
    const lane = Math.floor(Math.random() * 3)
    const drink = new THREE.Group()

    // Bottle body
    const bottleGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8)
    const bottleMat = new THREE.MeshStandardMaterial({
      color: 0x9b30ff,
      emissive: 0x6b00ff,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    })
    const bottle = new THREE.Mesh(bottleGeo, bottleMat)
    bottle.position.y = 0.6
    drink.add(bottle)

    // Bottle neck
    const neckGeo = new THREE.CylinderGeometry(0.15, 0.25, 0.4, 8)
    const neck = new THREE.Mesh(neckGeo, bottleMat)
    neck.position.y = 1.4
    drink.add(neck)

    // Cap
    const capGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 8)
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xffd93d,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5,
    })
    const cap = new THREE.Mesh(capGeo, capMat)
    cap.position.y = 1.7
    drink.add(cap)

    // Glowing ring effect
    const ringGeo = new THREE.TorusGeometry(0.6, 0.1, 8, 16)
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 1,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.6
    drink.add(ring)

    drink.position.set(this.lanePositions[lane], 1, -200)
    drink.userData.lane = lane
    drink.userData.rotationSpeed = 0.05
    this.scene.add(drink)
    this.drinks.push(drink)
  }

  // ─── Controls ──────────────────────────────────────────────────

  private setupControls(): void {
    window.addEventListener('keydown', this.boundKeyDown)
    this.container.addEventListener('touchstart', this.boundTouchStart, { passive: true })
    this.container.addEventListener('touchend', this.boundTouchEnd, { passive: true })
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.gameStarted || this.gameOver) return

    const key = e.key.toLowerCase()

    if (e.key === 'ArrowLeft' || key === 'a') {
      if (this.currentLane > 0) this.currentLane--
    } else if (e.key === 'ArrowRight' || key === 'd') {
      if (this.currentLane < 2) this.currentLane++
    } else if (e.key === ' ' || key === 'w' || e.key === 'ArrowUp') {
      if (!this.isJumping) {
        this.isJumping = true
        this.jumpVelocity = this.jumpStrength
      }
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    this.touchStartX = e.touches[0].clientX
    this.touchStartY = e.touches[0].clientY
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (!this.gameStarted || this.gameOver) return

    const dx = e.changedTouches[0].clientX - this.touchStartX
    const dy = e.changedTouches[0].clientY - this.touchStartY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (Math.abs(dx) > 30 && dist > 30) {
      // Horizontal swipe
      if (dx > 0 && this.currentLane < 2) this.currentLane++
      else if (dx < 0 && this.currentLane > 0) this.currentLane--
    } else if (dist < 30) {
      // Tap = jump
      if (!this.isJumping) {
        this.isJumping = true
        this.jumpVelocity = this.jumpStrength
      }
    }
  }

  // ─── Public API ────────────────────────────────────────────────

  start(): void {
    this.gameStarted = true
    this.gameOver = false
    this.score = 0
    this.distance = 0
    this.speed = 0.5
    this.money = 0
    this.currentLane = 1
    this.isJumping = false
    this.jumpVelocity = 0
    this.lastSpawnTime = {}

    // Reset bulk position
    if (this.bulk) {
      this.bulk.position.set(0, 0, 0)
    }

    // Clear old obstacles, drinks, explosions
    this.obstacles.forEach((o) => this.scene.remove(o))
    this.obstacles = []
    this.drinks.forEach((d) => this.scene.remove(d))
    this.drinks = []
    this.explosions.forEach((e) => this.scene.remove(e))
    this.explosions = []

    this.audio.playBGM()

    this.callbacks.onScoreChange?.(0)
    this.callbacks.onMoneyChange?.(0)
    this.callbacks.onDistanceChange?.(0)
    this.callbacks.onStateChange?.('playing')
  }

  restart(): void {
    this.start()
  }

  // ─── Main update loop ──────────────────────────────────────────

  update(delta: number): void {
    // Always update the animation mixer
    if (this.mixer) {
      this.mixer.update(delta)
    }

    // Always update explosions (visible after game over)
    this.updateExplosions()

    if (!this.gameStarted || this.gameOver) return

    // Score / distance
    this.distance += this.speed
    this.score = Math.floor(this.distance)
    this.callbacks.onScoreChange?.(this.score)
    this.callbacks.onDistanceChange?.(Math.floor(this.distance))

    // Speed increases with distance
    this.speed = 0.5 + this.distance * 0.0001

    // Move bulk to current lane smoothly
    if (this.bulk) {
      const targetX = this.lanePositions[this.currentLane]
      this.bulk.position.x += (targetX - this.bulk.position.x) * 0.2

      // Jump physics
      if (this.isJumping) {
        this.jumpVelocity += this.gravity
        this.bulk.position.y += this.jumpVelocity

        if (this.bulk.position.y <= this.groundLevel) {
          this.bulk.position.y = this.groundLevel
          this.isJumping = false
          this.jumpVelocity = 0
        }
      } else {
        // Running bob + raised to prevent feet clipping
        this.bulk.position.y = this.groundLevel + Math.sin(Date.now() * 0.02) * 0.05
      }
    }

    // Move ground tiles
    this.groundTiles.forEach((tile) => {
      tile.position.z += this.speed
      if (tile.position.z > 20) {
        tile.position.z -= 400
      }
    })

    // Move buildings
    this.buildings.forEach((building) => {
      building.position.z += this.speed
      if (building.position.z > 30) {
        building.position.z -= 450
      }
    })

    // Spawn obstacles
    if (Math.random() < 0.02) {
      this.createObstacle()
    }

    // Spawn drinks (less frequent)
    if (Math.random() < 0.015) {
      this.createDrink()
    }

    // Update drinks
    this.updateDrinks()

    // Update obstacles + collision
    this.updateObstacles()

    // Camera follows player horizontally
    if (this.bulk) {
      (this.camera as THREE.PerspectiveCamera).position.x +=
        (this.bulk.position.x - this.camera.position.x) * 0.1
    }
  }

  // ─── Drink update ──────────────────────────────────────────────

  private updateDrinks(): void {
    for (let i = this.drinks.length - 1; i >= 0; i--) {
      const drink = this.drinks[i]
      drink.position.z += this.speed

      // Rotate and bob
      drink.rotation.y += drink.userData.rotationSpeed as number
      drink.position.y = 1 + Math.sin(Date.now() * 0.005 + i) * 0.3

      // Pickup check
      if (drink.position.z > -2 && drink.position.z < 2 && this.bulk) {
        if (Math.abs(this.bulk.position.x - drink.position.x) < 1.5) {
          this.money += 50
          this.callbacks.onMoneyChange?.(this.money)
          this.disposeObject(drink)
          this.drinks.splice(i, 1)
          continue
        }
      }

      // Remove passed drinks
      if (drink.position.z > 10) {
        this.disposeObject(drink)
        this.drinks.splice(i, 1)
      }
    }
  }

  // ─── Obstacle update + collision ───────────────────────────────

  private updateObstacles(): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i]
      obs.position.z += this.speed

      // Collision check
      if (obs.position.z > -2 && obs.position.z < 2 && this.bulk) {
        if (Math.abs(this.bulk.position.x - obs.position.x) < 2) {
          const carHeight = 2
          if (this.bulk.position.y < carHeight) {
            // Hit! Create explosion at car position
            this.createExplosion(obs.position.x, obs.position.y + 1, obs.position.z)
            this.disposeObject(obs)
            this.obstacles.splice(i, 1)

            // Stop updates immediately and delay gameover display
            this.gameOver = true
            this.gameOverTimer = setTimeout(() => this.endGame(), 500)
            return
          }
        }
      }

      // Remove passed obstacles
      if (obs.position.z > 10) {
        this.disposeObject(obs)
        this.obstacles.splice(i, 1)
      }
    }
  }

  // ─── Explosion update ──────────────────────────────────────────

  private updateExplosions(): void {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const explosion = this.explosions[i]
      explosion.userData.age += 0.016

      // Fade flash light
      const flashLight = explosion.userData.flashLight as THREE.PointLight | undefined
      if (flashLight) {
        flashLight.intensity = Math.max(0, 5 - explosion.userData.age * 10)
      }

      // Update particles and debris
      explosion.children.forEach((child) => {
        if (child.userData.velocity) {
          const vel = child.userData.velocity as THREE.Vector3
          child.position.add(vel)
          vel.y -= 0.01 // gravity on particles

          child.userData.life -= 0.02

          // Rotation for debris pieces
          const rotSpeed = child.userData.rotSpeed as THREE.Vector3 | undefined
          if (rotSpeed) {
            child.rotation.x += rotSpeed.x
            child.rotation.y += rotSpeed.y
            child.rotation.z += rotSpeed.z
          }

          // Scale down as life decreases
          const scale = Math.max(0.1, child.userData.life as number)
          child.scale.set(scale, scale, scale)
        }
      })

      // Remove old explosions
      if (explosion.userData.age > 2) {
        this.disposeObject(explosion)
        this.explosions.splice(i, 1)
      }
    }
  }

  // ─── End game ──────────────────────────────────────────────────

  private endGame(): void {
    this.gameOver = true
    this.audio.pauseBGM()
    this.callbacks.onStateChange?.('gameover')
  }

  // ─── Cleanup ───────────────────────────────────────────────────

  dispose(): void {
    window.removeEventListener('keydown', this.boundKeyDown)
    this.container.removeEventListener('touchstart', this.boundTouchStart)
    this.container.removeEventListener('touchend', this.boundTouchEnd)

    if (this.gameOverTimer !== null) {
      clearTimeout(this.gameOverTimer)
      this.gameOverTimer = null
    }

    this.audio.dispose()
    this.mixer = null

    super.dispose()
  }
}
