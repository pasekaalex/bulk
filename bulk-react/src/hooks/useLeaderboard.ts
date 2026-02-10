import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  fetchLeaderboard,
  submitScore,
  type LeaderboardEntry,
} from '../lib/supabase'

export function useLeaderboard(game: string) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await fetchLeaderboard(game)
    setEntries(data)
    setLoading(false)
  }, [game])

  return { entries, loading, refresh }
}

export type SubmitState = 'idle' | 'submitting' | 'submitted' | 'error'

export function useScoreSubmission() {
  const { publicKey } = useWallet()
  const [state, setState] = useState<SubmitState>('idle')

  const submit = useCallback(
    async (
      game: string,
      score: number,
      stats?: Record<string, number | string>,
    ) => {
      if (!publicKey) return
      setState('submitting')
      const result = await submitScore(
        publicKey.toBase58(),
        game,
        score,
        stats,
      )
      setState(result.success ? 'submitted' : 'error')
    },
    [publicKey],
  )

  const reset = useCallback(() => setState('idle'), [])

  return { submit, state, reset, wallet: publicKey?.toBase58() ?? null }
}
