import * as THREE from 'three'
import { BaseGameEngine, type GameCallbacks } from './shared/BaseGameEngine'
import { ParticleSystem } from './shared/ParticleSystem'
import { AudioManager } from './shared/AudioManager'
import { loadGLBModel, createFallbackModel } from './shared/ModelLoader'
import { ASSET_PATHS } from '../constants'

interface FoodType {
  name: string
  inflation: number
  create: () => THREE.Group
}

export class BulkPopEngine extends BaseGameEngine {
  private audio = new AudioManager()
  private particles!: ParticleSystem

  // Bulk
  private bulk: THREE.Group | null = null
  private bulkBaseScale = new THREE.Vector3(1, 1, 1)
  private originalColors: Map<THREE.Mesh, THREE.Color> = new Map()

  // State
  private inflation = 0
  private pops = 0
  private foodsEaten = 0
  private isPopping = false
  private isEating = false
  private popTimer = 0
  private wobbleTimer = 0
  private wobbleIntensity = 0
  private breathTimer = 0

  // Food
  private currentFood: THREE.Group | null = null
  private foodSpawnTimer = 0
  private foodBobTimer = 0
  private foodTypes: FoodType[] = []

  // Eating animation
  private eatStartPos = new THREE.Vector3()
  private eatTargetPos = new THREE.Vector3()
  private eatProgress = 0

  // Camera shake
  private cameraBasePos = new THREE.Vector3()
  private shakeIntensity = 0

  // Sweat particles
  private sweatTimer = 0

  // Visual effects
  private ambientTimer = 0
  private foodSpawnScale = 0
  private foodSpawning = false
  private shockwave: THREE.Mesh | null = null
  private shockwaveTimer = 0
  private popFlashTimer = 0
  private pulseTimer = 0
  private purpleLight!: THREE.PointLight

  // Raycaster
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private onClick: ((e: MouseEvent) => void) | null = null
  private onTouch: ((e: TouchEvent) => void) | null = null

  createScene(): void {
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100,
    )
    this.camera.position.set(0, 3, 8)
    this.camera.lookAt(0, 2, 0)
    this.cameraBasePos.copy(this.camera.position)

    // Background
    this.scene.background = new THREE.Color(0x1a0a2a)
    this.scene.fog = new THREE.Fog(0x1a0a2a, 10, 30)

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 0.8)
    directional.position.set(5, 10, 5)
    this.scene.add(directional)

    this.purpleLight = new THREE.PointLight(0x9b30ff, 1.5, 15)
    this.purpleLight.position.set(0, -1, 3)
    this.scene.add(this.purpleLight)

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(20, 20)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x120820,
      roughness: 0.8,
    })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    this.scene.add(ground)

    // Particles
    this.particles = new ParticleSystem(this.scene)

    // Define food types
    this.foodTypes = [
      { name: 'cookie', inflation: 0.04, create: () => this.createCookie() },
      { name: 'donut', inflation: 0.05, create: () => this.createDonut() },
      { name: 'pizza', inflation: 0.06, create: () => this.createPizza() },
      { name: 'burger', inflation: 0.08, create: () => this.createBurger() },
      { name: 'cake', inflation: 0.10, create: () => this.createCake() },
      { name: 'schmeg', inflation: 0.15, create: () => this.createSchmeg() },
    ]

    // Load Bulk model
    loadGLBModel(ASSET_PATHS.models.bulk, 3)
      .then(({ scene: model }) => {
        this.bulk = model
        this.bulk.position.set(0, 0, 0)
        this.scene.add(this.bulk)
        this.storeBulkColors()
      })
      .catch(() => {
        this.bulk = createFallbackModel(1.5)
        this.bulk.position.set(0, 0, 0)
        this.scene.add(this.bulk)
        this.storeBulkColors()
      })

    // Audio
    this.audio.loadBGM(ASSET_PATHS.audio.jazz, 0.15)
    this.audio.loadSFX('pop', ASSET_PATHS.audio.nuke, 0.5)

    // Input
    this.onClick = (e: MouseEvent) => this.handleInput(e.clientX, e.clientY)
    this.onTouch = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.touches[0]
      this.handleInput(t.clientX, t.clientY)
    }
    this.container.addEventListener('click', this.onClick)
    this.container.addEventListener('touchstart', this.onTouch, { passive: false })
  }

  private storeBulkColors(): void {
    if (!this.bulk) return
    this.originalColors.clear()
    this.bulk.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        this.originalColors.set(child, child.material.color.clone())
      }
    })
    this.bulkBaseScale.copy(this.bulk.scale)
  }

  // ─── Food Creators ──────────────────────────────────────────────

  private createCookie(): THREE.Group {
    const group = new THREE.Group()
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16)
    const mat = new THREE.MeshStandardMaterial({ color: 0xd4a037 })
    const cookie = new THREE.Mesh(geo, mat)
    group.add(cookie)
    // Chocolate chips
    const chipGeo = new THREE.SphereGeometry(0.06, 6, 6)
    const chipMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 })
    for (let i = 0; i < 5; i++) {
      const chip = new THREE.Mesh(chipGeo, chipMat)
      const angle = (i / 5) * Math.PI * 2
      chip.position.set(Math.cos(angle) * 0.25, 0.07, Math.sin(angle) * 0.25)
      group.add(chip)
    }
    this.addFoodGlow(group, 0xd4a037)
    return group
  }

  private createDonut(): THREE.Group {
    const group = new THREE.Group()
    const geo = new THREE.TorusGeometry(0.35, 0.15, 12, 20)
    const mat = new THREE.MeshStandardMaterial({ color: 0xe75480 })
    const donut = new THREE.Mesh(geo, mat)
    donut.rotation.x = Math.PI / 2
    group.add(donut)
    this.addFoodGlow(group, 0xe75480)
    return group
  }

  private createPizza(): THREE.Group {
    const group = new THREE.Group()
    const geo = new THREE.ConeGeometry(0.45, 0.08, 3)
    const mat = new THREE.MeshStandardMaterial({ color: 0xe8a030 })
    const slice = new THREE.Mesh(geo, mat)
    slice.rotation.x = Math.PI / 2
    group.add(slice)
    // Red sauce dots
    const dotGeo = new THREE.SphereGeometry(0.05, 6, 6)
    const dotMat = new THREE.MeshStandardMaterial({ color: 0xcc3333 })
    for (let i = 0; i < 3; i++) {
      const dot = new THREE.Mesh(dotGeo, dotMat)
      dot.position.set((Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.2)
      group.add(dot)
    }
    this.addFoodGlow(group, 0xe8a030)
    return group
  }

  private createBurger(): THREE.Group {
    const group = new THREE.Group()
    // Bottom bun
    const bunGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12)
    const bunMat = new THREE.MeshStandardMaterial({ color: 0xd4a037 })
    const botBun = new THREE.Mesh(bunGeo, bunMat)
    botBun.position.y = -0.15
    group.add(botBun)
    // Patty
    const pattyGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.12, 12)
    const pattyMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    const patty = new THREE.Mesh(pattyGeo, pattyMat)
    group.add(patty)
    // Lettuce
    const lettuceGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 12)
    const lettuceMat = new THREE.MeshStandardMaterial({ color: 0x4caf50 })
    const lettuce = new THREE.Mesh(lettuceGeo, lettuceMat)
    lettuce.position.y = 0.08
    group.add(lettuce)
    // Top bun
    const topBun = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      bunMat,
    )
    topBun.position.y = 0.15
    group.add(topBun)
    this.addFoodGlow(group, 0xd4a037)
    return group
  }

  private createCake(): THREE.Group {
    const group = new THREE.Group()
    // Body
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff69b4 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    group.add(body)
    // Frosting top
    const frostGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 12)
    const frostMat = new THREE.MeshStandardMaterial({ color: 0xffffff })
    const frost = new THREE.Mesh(frostGeo, frostMat)
    frost.position.y = 0.3
    group.add(frost)
    // Cherry
    const cherryGeo = new THREE.SphereGeometry(0.08, 8, 8)
    const cherryMat = new THREE.MeshStandardMaterial({ color: 0xff0000 })
    const cherry = new THREE.Mesh(cherryGeo, cherryMat)
    cherry.position.y = 0.4
    group.add(cherry)
    this.addFoodGlow(group, 0xff69b4)
    return group
  }

  private createSchmeg(): THREE.Group {
    const group = new THREE.Group()
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
    group.add(bottle)
    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.15, 0.25, 0.4, 8)
    const neck = new THREE.Mesh(neckGeo, bottleMat)
    neck.position.y = 1.4
    group.add(neck)
    // Cap
    const capGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 8)
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xffd93d,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5,
    })
    const cap = new THREE.Mesh(capGeo, capMat)
    cap.position.y = 1.7
    group.add(cap)
    // Glow ring
    const ringGeo = new THREE.TorusGeometry(0.6, 0.1, 8, 16)
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 1,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 2
    ring.position.y = 0.6
    group.add(ring)
    return group
  }

  /** Add a BackSide glow outline to food meshes for tap affordance */
  private addFoodGlow(group: THREE.Group, color: number): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const glowMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.25,
          side: THREE.BackSide,
        })
        const glow = new THREE.Mesh(child.geometry, glowMat)
        glow.scale.set(1.25, 1.25, 1.25)
        glow.position.copy(child.position)
        glow.rotation.copy(child.rotation)
        group.add(glow)
      }
    })
  }

  /** Spawn a shockwave ring at a position */
  private spawnShockwave(pos: THREE.Vector3): void {
    if (this.shockwave) {
      this.scene.remove(this.shockwave)
      this.shockwave.geometry.dispose()
      ;(this.shockwave.material as THREE.Material).dispose()
    }
    const geo = new THREE.RingGeometry(0.3, 0.6, 32)
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    })
    this.shockwave = new THREE.Mesh(geo, mat)
    this.shockwave.rotation.x = -Math.PI / 2
    this.shockwave.position.set(pos.x, 0.05, pos.z)
    this.scene.add(this.shockwave)
    this.shockwaveTimer = 0
  }

  // ─── Input ──────────────────────────────────────────────────────

  private handleInput(clientX: number, clientY: number): void {
    if (this.isEating || this.isPopping || !this.currentFood) return

    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.currentFood.children, true)

    if (intersects.length > 0) {
      this.startEating()
    }
  }

  private startEating(): void {
    if (!this.currentFood || !this.bulk) return
    this.isEating = true
    this.eatProgress = 0
    this.eatStartPos.copy(this.currentFood.position)
    // Target: Bulk's mouth area (upper center)
    this.eatTargetPos.set(
      this.bulk.position.x,
      this.bulk.position.y + 2.5,
      this.bulk.position.z + 0.5,
    )
  }

  // ─── Game Logic ─────────────────────────────────────────────────

  private spawnFood(): void {
    if (this.currentFood) {
      this.disposeObject(this.currentFood)
      this.currentFood = null
    }

    const type = this.foodTypes[Math.floor(Math.random() * this.foodTypes.length)]
    const food = type.create()
    food.userData.inflation = type.inflation
    food.userData.glowColor = this.getFoodColor(type.name)
    food.position.set(0, 3, 4)
    // Start at scale 0 for pop-in animation
    food.scale.set(0, 0, 0)
    this.scene.add(food)
    this.currentFood = food
    this.foodBobTimer = 0
    this.foodSpawning = true
    this.foodSpawnScale = 0
  }

  private getFoodColor(name: string): number {
    const colors: Record<string, number> = {
      cookie: 0xd4a037,
      donut: 0xe75480,
      pizza: 0xe8a030,
      burger: 0x8b4513,
      cake: 0xff69b4,
      schmeg: 0x9b30ff,
    }
    return colors[name] || 0xffffff
  }

  private feedBulk(inflationAmount: number, foodColor: number = 0xffffff): void {
    this.inflation += inflationAmount
    this.foodsEaten++
    this.callbacks.onComboChange?.(this.foodsEaten)
    this.wobbleTimer = 0
    this.wobbleIntensity = 0.15

    // Eat burst particles — crumbs in the food's color
    if (this.bulk) {
      const mouthPos = this.bulk.position.clone().add(new THREE.Vector3(0, 2.5, 0.5))
      this.particles.emit(mouthPos, 8, {
        color: foodColor,
        size: 0.4,
        speed: 3,
        life: 20,
        spread: 0.8,
      })
    }

    // Eat sound — pitch rises with inflation
    const freq = 300 + this.inflation * 600
    this.audio.synthTone(freq, 0.15, 'square', 0.2)

    if (this.inflation >= 1.0) {
      this.pop()
    }
  }

  private pop(): void {
    this.isPopping = true
    this.popTimer = 0
    this.inflation = 1.0

    // Hide Bulk
    if (this.bulk) this.bulk.visible = false

    // Remove food
    if (this.currentFood) {
      this.disposeObject(this.currentFood)
      this.currentFood = null
    }

    // Explosion particles
    const pos = this.bulk
      ? this.bulk.position.clone().add(new THREE.Vector3(0, 1.5, 0))
      : new THREE.Vector3(0, 1.5, 0)
    this.particles.emit(pos, 25, { color: 0x9b30ff, size: 2, speed: 8, life: 40, spread: 1.5 })
    this.particles.emit(pos, 15, { color: 0xff3333, size: 1.5, speed: 6, life: 35, spread: 1.2 })

    // Shockwave ring on ground
    this.spawnShockwave(this.bulk?.position || new THREE.Vector3(0, 0, 0))

    // Screen flash
    this.popFlashTimer = 0.15
    this.scene.background = new THREE.Color(0x6622aa)

    // Camera shake
    this.shakeIntensity = 0.5

    // Pop sound
    this.audio.playSFX('pop')

    // Increment pops
    this.pops++
    this.callbacks.onScoreChange?.(this.pops)
  }

  private resetBulk(): void {
    this.inflation = 0
    this.isPopping = false
    this.wobbleTimer = 0
    this.wobbleIntensity = 0

    if (this.bulk) {
      this.bulk.visible = true
      // Reset scale
      this.bulk.scale.copy(this.bulkBaseScale)
      // Reset colors
      this.bulk.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const original = this.originalColors.get(child)
          if (original) child.material.color.copy(original)
          child.material.emissive.setHex(0x000000)
        }
      })
    }

    // Spawn next food after short delay
    this.foodSpawnTimer = 0.5
  }

  // ─── Update ─────────────────────────────────────────────────────

  update(delta: number): void {
    this.particles.update()

    // Camera shake decay
    if (this.shakeIntensity > 0) {
      this.camera.position.set(
        this.cameraBasePos.x + (Math.random() - 0.5) * this.shakeIntensity,
        this.cameraBasePos.y + (Math.random() - 0.5) * this.shakeIntensity,
        this.cameraBasePos.z,
      )
      this.shakeIntensity *= 0.9
      if (this.shakeIntensity < 0.01) {
        this.shakeIntensity = 0
        this.camera.position.copy(this.cameraBasePos)
      }
    }

    // Pop flash decay — lerp background back to normal
    if (this.popFlashTimer > 0) {
      this.popFlashTimer -= delta
      if (this.popFlashTimer <= 0) {
        this.scene.background = new THREE.Color(0x1a0a2a)
      }
    }

    // Shockwave expansion
    if (this.shockwave) {
      this.shockwaveTimer += delta
      const t = this.shockwaveTimer / 0.6 // expand over 600ms
      const scale = 1 + t * 12
      this.shockwave.scale.set(scale, scale, 1)
      const mat = this.shockwave.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 0.8 * (1 - t))
      if (t >= 1) {
        this.scene.remove(this.shockwave)
        this.shockwave.geometry.dispose()
        ;(this.shockwave.material as THREE.Material).dispose()
        this.shockwave = null
      }
    }

    // Ambient floating purple sparkles
    this.ambientTimer += delta
    if (this.ambientTimer > 0.4) {
      this.ambientTimer = 0
      const sparklePos = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 5,
        (Math.random() - 0.5) * 4 + 2,
      )
      this.particles.emit(sparklePos, 1, {
        color: 0x9b30ff,
        size: 0.15,
        speed: 0.3,
        life: 40,
        spread: 0.2,
      })
    }

    // Popping state
    if (this.isPopping) {
      this.popTimer += delta
      if (this.popTimer >= 1.2) {
        this.resetBulk()
      }
      return
    }

    // Waiting to spawn food
    if (this.foodSpawnTimer > 0) {
      this.foodSpawnTimer -= delta
      if (this.foodSpawnTimer <= 0) {
        this.spawnFood()
      }
    }

    // Food spawn scale-in animation (elastic overshoot)
    if (this.foodSpawning && this.currentFood) {
      this.foodSpawnScale += delta * 4 // ~250ms
      if (this.foodSpawnScale >= 1) {
        this.foodSpawnScale = 1
        this.foodSpawning = false
        this.currentFood.scale.set(1, 1, 1)
      } else {
        // Elastic ease-out: overshoot to 1.15 then settle
        const t = this.foodSpawnScale
        const s = t < 0.7
          ? (t / 0.7) * 1.15
          : 1.15 - (t - 0.7) / 0.3 * 0.15
        this.currentFood.scale.set(s, s, s)
      }
    }

    // Eating animation
    if (this.isEating && this.currentFood) {
      this.eatProgress += delta * 3.3 // ~300ms
      if (this.eatProgress >= 1) {
        // Food arrived — feed Bulk
        const inflationAmount = (this.currentFood.userData.inflation as number) || 0.05
        const foodColor = (this.currentFood.userData.glowColor as number) || 0xffffff
        this.disposeObject(this.currentFood)
        this.currentFood = null
        this.isEating = false
        this.feedBulk(inflationAmount, foodColor)
        if (!this.isPopping) {
          this.foodSpawnTimer = 0.5
        }
      } else {
        // Lerp food position toward mouth
        this.currentFood.position.lerpVectors(this.eatStartPos, this.eatTargetPos, this.eatProgress)
        // Shrink food as it approaches
        const s = 1 - this.eatProgress * 0.5
        this.currentFood.scale.set(s, s, s)
      }
    }

    // Food idle animation (bob + rotate + glow pulse)
    if (this.currentFood && !this.isEating && !this.foodSpawning) {
      this.foodBobTimer += delta
      this.currentFood.position.y = 3 + Math.sin(this.foodBobTimer * 2.5) * 0.3
      this.currentFood.rotation.y += delta * 1.2
    }

    // Bulk animations
    if (this.bulk && this.bulk.visible) {
      // Apply inflation scale (fatter, not taller)
      const sx = this.bulkBaseScale.x * (1 + this.inflation * 1.5)
      const sy = this.bulkBaseScale.y * (1 + this.inflation * 0.3)
      const sz = this.bulkBaseScale.z * (1 + this.inflation * 1.5)

      // Wobble after feeding
      let wobbleOffset = 0
      if (this.wobbleIntensity > 0) {
        this.wobbleTimer += delta
        wobbleOffset = Math.sin(this.wobbleTimer * 25) * this.wobbleIntensity
        this.wobbleIntensity *= 0.95
        if (this.wobbleIntensity < 0.001) this.wobbleIntensity = 0
      }

      // Breathing
      this.breathTimer += delta
      const breathOffset = Math.sin(this.breathTimer * 1.5) * 0.02

      // Belly pulse/throb at high inflation (rhythmic expansion)
      let pulseOffset = 0
      if (this.inflation > 0.5) {
        this.pulseTimer += delta
        const pulseSpeed = 3 + this.inflation * 5 // faster as inflation grows
        pulseOffset = Math.sin(this.pulseTimer * pulseSpeed) * this.inflation * 0.06
      }

      this.bulk.scale.set(
        sx + wobbleOffset + pulseOffset,
        sy + breathOffset,
        sz - wobbleOffset + pulseOffset,
      )

      // Color shift toward red with inflation
      const redLerp = this.inflation * 0.6
      this.bulk.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const original = this.originalColors.get(child)
          if (original) {
            child.material.color.copy(original).lerp(new THREE.Color(0xff2222), redLerp)
            if (this.inflation > 0.5) {
              // Pulsing red emissive glow
              const emissiveStrength = this.inflation * 0.3 + Math.sin(this.pulseTimer * 6) * 0.1
              child.material.emissive.set(emissiveStrength, 0, 0)
            } else {
              child.material.emissive.setHex(0x000000)
            }
          }
        }
      })

      // Purple underlight intensifies with inflation
      this.purpleLight.intensity = 1.5 + this.inflation * 3

      // Sweat particles at high inflation
      if (this.inflation > 0.7) {
        this.sweatTimer += delta
        const sweatRate = 0.3 - this.inflation * 0.15 // faster sweating as inflation rises
        if (this.sweatTimer > sweatRate) {
          this.sweatTimer = 0
          const headPos = this.bulk.position.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.8,
            3,
            0.5,
          ))
          this.particles.emit(headPos, 2, {
            color: 0xffffff,
            size: 0.3,
            speed: 1,
            life: 20,
            spread: 0.3,
          })
        }
      }
    }
  }

  // ─── Lifecycle ──────────────────────────────────────────────────

  start(): void {
    this.inflation = 0
    this.pops = 0
    this.foodsEaten = 0
    this.isPopping = false
    this.isEating = false
    this.wobbleIntensity = 0
    this.shakeIntensity = 0
    this.sweatTimer = 0

    if (this.bulk) {
      this.bulk.visible = true
      this.bulk.scale.copy(this.bulkBaseScale)
      // Reset colors
      this.bulk.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const original = this.originalColors.get(child)
          if (original) child.material.color.copy(original)
          child.material.emissive.setHex(0x000000)
        }
      })
    }

    // Remove any leftover food
    if (this.currentFood) {
      this.disposeObject(this.currentFood)
      this.currentFood = null
    }

    if (this.shockwave) {
      this.scene.remove(this.shockwave)
      this.shockwave.geometry.dispose()
      ;(this.shockwave.material as THREE.Material).dispose()
      this.shockwave = null
    }
    this.popFlashTimer = 0
    this.pulseTimer = 0
    this.scene.background = new THREE.Color(0x1a0a2a)
    this.purpleLight.intensity = 1.5

    this.particles.clear()
    this.callbacks.onStateChange?.('playing')
    this.callbacks.onScoreChange?.(0)
    this.audio.playBGM()
    this.spawnFood()
  }

  stop(): void {
    this.audio.stopBGM()
    if (this.currentFood) {
      this.disposeObject(this.currentFood)
      this.currentFood = null
    }
    this.isEating = false
    this.callbacks.onStateChange?.('gameover')
  }

  restart(): void {
    this.start()
  }

  dispose(): void {
    if (this.onClick) this.container.removeEventListener('click', this.onClick)
    if (this.onTouch) this.container.removeEventListener('touchstart', this.onTouch)
    this.particles.clear()
    this.audio.dispose()
    super.dispose()
  }
}
