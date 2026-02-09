export interface AchievementDef {
  id: string
  game: string
  icon: string
  title: string
  desc: string
}

const STORAGE_KEY = 'bulkAchievements'

export const ALL_ACHIEVEMENTS: AchievementDef[] = [
  // Flappy Bulk
  { id: 'flappy_first', game: 'Flappy Bulk', icon: '\u{1F423}', title: 'First Flight', desc: 'Score at least 1 point' },
  { id: 'flappy_10', game: 'Flappy Bulk', icon: '\u{1F426}', title: 'Soaring High', desc: 'Score 10 points' },
  { id: 'flappy_25', game: 'Flappy Bulk', icon: '\u{1F985}', title: 'Eagle Eye', desc: 'Score 25 points' },
  { id: 'flappy_50', game: 'Flappy Bulk', icon: '\u{1F680}', title: 'Flap God', desc: 'Score 50 points' },

  // Bulk Climb
  { id: 'climb_100', game: 'Bulk Climb', icon: '\u{1FA7C}', title: 'Getting Started', desc: 'Climb 100m' },
  { id: 'climb_500', game: 'Bulk Climb', icon: '\u{26F0}\u{FE0F}', title: 'Mountain Goat', desc: 'Climb 500m' },
  { id: 'climb_1000', game: 'Bulk Climb', icon: '\u{1F3D4}\u{FE0F}', title: 'Summit King', desc: 'Climb 1000m' },

  // Bulk Runner
  { id: 'runner_500', game: 'Bulk Runner', icon: '\u{1F3C3}', title: 'Jogger', desc: 'Run 500m' },
  { id: 'runner_2000', game: 'Bulk Runner', icon: '\u{1F3C3}\u{200D}\u{2642}\u{FE0F}', title: 'Marathon Man', desc: 'Run 2000m' },
  { id: 'runner_money', game: 'Bulk Runner', icon: '\u{1F4B0}', title: 'Money Bags', desc: 'Collect $100' },

  // Bulk Rampage
  { id: 'rampage_wave3', game: 'Bulk Rampage', icon: '\u{1F4A5}', title: 'Warmed Up', desc: 'Reach Wave 3' },
  { id: 'rampage_wave5', game: 'Bulk Rampage', icon: '\u{1F525}', title: 'Unstoppable', desc: 'Reach Wave 5' },
  { id: 'rampage_kills50', game: 'Bulk Rampage', icon: '\u{1F480}', title: 'Mass Destruction', desc: 'Defeat 50 enemies' },
  { id: 'rampage_combo20', game: 'Bulk Rampage', icon: '\u{26A1}', title: 'Combo Fiend', desc: 'Reach a 20x combo' },

  // Bulkagachi (mirrored from engine)
  { id: 'bulkagachi_firstFeed', game: 'Bulkagachi', icon: '\u{1F964}', title: 'First Meal', desc: 'Feed Bulk for the first time' },
  { id: 'bulkagachi_combo10', game: 'Bulkagachi', icon: '\u{1F525}', title: 'Combo Master', desc: 'Reach a 10x combo' },
  { id: 'bulkagachi_perfectCare', game: 'Bulkagachi', icon: '\u{1F4AF}', title: 'Perfect Care', desc: 'Get all stats to 100%' },
  { id: 'bulkagachi_oneDay', game: 'Bulkagachi', icon: '\u{1F382}', title: 'First Birthday', desc: 'Keep Bulk alive for 1 day' },
  { id: 'bulkagachi_care100', game: 'Bulkagachi', icon: '\u{2764}\u{FE0F}', title: 'Dedicated Carer', desc: 'Perform 100 care actions' },
  { id: 'bulkagachi_care500', game: 'Bulkagachi', icon: '\u{1F4AA}', title: 'Super Parent', desc: 'Perform 500 care actions' },
  { id: 'bulkagachi_revival', game: 'Bulkagachi', icon: '\u{2728}', title: 'Second Chance', desc: 'Revive Bulk' },
  { id: 'bulkagachi_threeDays', game: 'Bulkagachi', icon: '\u{1F31F}', title: 'Week Warrior', desc: 'Keep Bulk alive for 3 days' },
  { id: 'bulkagachi_level5', game: 'Bulkagachi', icon: '\u{2B50}', title: 'Rising Star', desc: 'Reach Level 5' },
  { id: 'bulkagachi_level10', game: 'Bulkagachi', icon: '\u{1F31F}', title: 'Superstar', desc: 'Reach Level 10' },
  { id: 'bulkagachi_goldenPoop', game: 'Bulkagachi', icon: '\u{2728}', title: 'Golden Discovery', desc: 'Find and clean a golden poop' },
]

export function getUnlocked(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* storage disabled */ }
  return {}
}

function saveUnlocked(unlocked: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked))
  } catch { /* storage full/disabled */ }
}

export function checkAndUnlock(checks: { id: string; condition: boolean }[]): AchievementDef[] {
  const unlocked = getUnlocked()
  const newlyUnlocked: AchievementDef[] = []

  for (const { id, condition } of checks) {
    if (condition && !unlocked[id]) {
      unlocked[id] = true
      const def = ALL_ACHIEVEMENTS.find((a) => a.id === id)
      if (def) newlyUnlocked.push(def)
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlocked(unlocked)
  }

  return newlyUnlocked
}

export function syncBulkagachi(engineAchievements: Record<string, boolean>) {
  const unlocked = getUnlocked()
  let changed = false

  for (const [id, value] of Object.entries(engineAchievements)) {
    const globalId = `bulkagachi_${id}`
    if (value && !unlocked[globalId]) {
      unlocked[globalId] = true
      changed = true
    }
  }

  if (changed) {
    saveUnlocked(unlocked)
  }
}
