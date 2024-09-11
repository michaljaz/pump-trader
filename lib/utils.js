import axios from 'axios'
import { PublicKey, Transaction, ComputeBudgetProgram, sendAndConfirmTransaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PUMPFUN_PROGRAM_ID } from './constants.js'

export async function getCoinData (mintStr) {
  try {
    const response = await axios.get(`https://frontend-api.pump.fun/coins/${mintStr}`)
    if (response.status === 200) {
      return response.data
    } else {
      console.error('Failed to retrieve coin data:', response.status)
      return null
    }
  } catch (error) {
    console.error('Error fetching coin data:', error)
    return null
  }
}

export async function findProgramAddresses (mint, owner) {
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    new PublicKey(PUMPFUN_PROGRAM_ID)
  )
  const [associatedBondingCurve] = PublicKey.findProgramAddressSync([
    bondingCurve.toBuffer(),
    TOKEN_PROGRAM_ID.toBuffer(),
    mint.toBuffer()
  ], ASSOCIATED_TOKEN_PROGRAM_ID)
  const [associatedUser] = PublicKey.findProgramAddressSync([
    owner.publicKey.toBuffer(),
    TOKEN_PROGRAM_ID.toBuffer(),
    mint.toBuffer()
  ], ASSOCIATED_TOKEN_PROGRAM_ID)
  return { bondingCurve, associatedBondingCurve, associatedUser }
}

export async function createTransaction (
  connection,
  instructions,
  payer,
  priorityFeeInSol = 0
) {
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1400000
  })
  const transaction = new Transaction().add(modifyComputeUnits)
  if (priorityFeeInSol > 0) {
    const microLamports = priorityFeeInSol * 1_000_000_000
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports
    })
    transaction.add(addPriorityFee)
  }
  transaction.add(...instructions)
  transaction.feePayer = payer
  transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
  return transaction
}

export function bufferFromUInt64 (value) {
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64LE(BigInt(value))
  return buffer
}

export async function sendTransactionWrapper (connection, transaction, signers) {
  try {
    // const signature = await connection.sendTransaction(transaction, signers, { skipPreflight: true })
    const signature = await sendAndConfirmTransaction(connection, transaction, signers, { skipPreflight: true, preflightCommitment: 'confirmed' })
    console.log('Transaction sent with signature:', signature)
    return signature
  } catch (error) {
    console.error('Error sending transaction:', error)
    return null
  }
}
