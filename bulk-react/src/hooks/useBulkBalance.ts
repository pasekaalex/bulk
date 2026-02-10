import { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { CONTRACT_ADDRESS, BULK_REQUIRED } from '../constants'

const BULK_MINT = new PublicKey(CONTRACT_ADDRESS)

export function useBulkBalance() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) {
      setBalance(null)
      return
    }

    let cancelled = false
    setLoading(true)

    connection
      .getParsedTokenAccountsByOwner(publicKey, { mint: BULK_MINT })
      .then((result) => {
        if (cancelled) return
        let total = 0
        for (const account of result.value) {
          const amount = account.account.data.parsed?.info?.tokenAmount?.uiAmount
          if (typeof amount === 'number') total += amount
        }
        setBalance(total)
      })
      .catch(() => {
        if (!cancelled) setBalance(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [publicKey, connection])

  return {
    balance,
    isHolder: balance !== null && balance >= BULK_REQUIRED,
    loading,
  }
}
