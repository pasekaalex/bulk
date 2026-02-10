import { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { CONTRACT_ADDRESS, BULK_REQUIRED } from '../constants'

const BULK_MINT = new PublicKey(CONTRACT_ADDRESS)
// pump.fun tokens use Token-2022
const TOKEN_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')

function getAssociatedTokenAddress(wallet: PublicKey, mint: PublicKey): PublicKey {
  const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
  const [ata] = PublicKey.findProgramAddressSync(
    [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )
  return ata
}

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

    const ata = getAssociatedTokenAddress(publicKey, BULK_MINT)
    console.log('[useBulkBalance] Checking ATA:', ata.toBase58(), 'for wallet:', publicKey.toBase58())

    connection
      .getTokenAccountBalance(ata)
      .then((result) => {
        if (cancelled) return
        const amount = result.value.uiAmount ?? 0
        console.log('[useBulkBalance] Balance:', amount)
        setBalance(amount)
      })
      .catch((err) => {
        console.error('[useBulkBalance] Error:', err?.message || err)
        // Account doesn't exist = 0 balance
        if (!cancelled) setBalance(0)
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
