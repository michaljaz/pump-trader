import { SYSVAR_RENT_PUBKEY, PublicKey, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, AccountLayout } from '@solana/spl-token'
import { PUMPFUN_PROGRAM_ID, PUMPFUN_GLOBAL, PUMPFUN_FEE_RECIPIENT } from './constants.js'
import { getCoinData, findProgramAddresses, createTransaction, bufferFromUInt64, sendTransactionWrapper } from './utils.js'

export async function pumpBuy (connection, owner, mintStr, solIn) {
  const coinData = await getCoinData(mintStr)
  console.log(`BUYING ${coinData.name} with ${solIn} SOL`)

  const mint = new PublicKey(mintStr)
  const programId = new PublicKey(PUMPFUN_PROGRAM_ID)

  const { bondingCurve, associatedBondingCurve, associatedUser } = await findProgramAddresses(mint, owner)

  const txBuilder = new Transaction()

  const tokenAccountInfo = await connection.getAccountInfo(associatedUser)
  if (!tokenAccountInfo) {
    txBuilder.add(createAssociatedTokenAccountInstruction(
      owner.publicKey,
      associatedUser,
      owner.publicKey,
      mint
    ))
  }

  const priorityFeeInSol = 0.0001
  const slippageDecimal = 0.25
  const solInLamports = solIn * LAMPORTS_PER_SOL
  const tokenOut = Math.floor(solInLamports * coinData.virtual_token_reserves / coinData.virtual_sol_reserves)
  const solInWithSlippage = solIn * (1 + slippageDecimal)
  const maxSolCost = Math.floor(solInWithSlippage * LAMPORTS_PER_SOL)

  const keys = [
    { pubkey: new PublicKey(PUMPFUN_GLOBAL), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(PUMPFUN_FEE_RECIPIENT), isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
    { pubkey: associatedUser, isSigner: false, isWritable: true },
    { pubkey: owner.publicKey, isSigner: false, isWritable: true },
    { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: new PublicKey(SYSVAR_RENT_PUBKEY), isSigner: false, isWritable: false },
    { pubkey: PublicKey.findProgramAddressSync([Buffer.from('__event_authority')], programId)[0], isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false }
  ]

  const data = Buffer.concat([
    bufferFromUInt64('16927863322537952870'),
    bufferFromUInt64(tokenOut),
    bufferFromUInt64(maxSolCost)
  ])

  const instruction = new TransactionInstruction({
    keys,
    programId,
    data
  })

  txBuilder.add(instruction)

  console.log('Building transaction...')
  const transaction = await createTransaction(connection, txBuilder.instructions, owner.publicKey, priorityFeeInSol)

  console.log('Sending transaction...')
  const signature = await sendTransactionWrapper(connection, transaction, [owner])
  console.log(`Transaction confirmed: https://solscan.io/tx/${signature}`)
}

export async function pumpSell (connection, owner, mintStr, amount) {
  const coinData = await getCoinData(mintStr)
  console.log(`SELLING ${coinData.name} with ${amount} tokens`)

  const mint = new PublicKey(mintStr)
  const programId = new PublicKey(PUMPFUN_PROGRAM_ID)

  if (amount === 0) {
    console.log('Amount not specified, fetching token balance...')
    const tokenAccounts = await connection.getTokenAccountsByOwner(owner.publicKey, { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') })
    const tokens = tokenAccounts.value.map(accountInfo => {
      const accountData = AccountLayout.decode(accountInfo.account.data)
      return {
        mint: new PublicKey(accountData.mint),
        amount: Number(BigInt(accountData.amount.toString())) / 10 ** 6
      }
    })
    const token = tokens.find(token => token.mint.toString() === mint.toString())
    if (token) {
      amount = token.amount
      console.log(amount)
    } else {
      return
    }
  }

  const { bondingCurve, associatedBondingCurve, associatedUser } = await findProgramAddresses(mint, owner)

  const txBuilder = new Transaction()
  const tokenBalance = amount * 1000000
  const priorityFeeInSol = 0.0001
  const slippageDecimal = 0.25
  const minSolOutput = Math.floor(tokenBalance * (1 - slippageDecimal) * coinData.virtual_sol_reserves / coinData.virtual_token_reserves)

  const keys = [
    { pubkey: new PublicKey(PUMPFUN_GLOBAL), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(PUMPFUN_FEE_RECIPIENT), isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
    { pubkey: associatedUser, isSigner: false, isWritable: true },
    { pubkey: owner.publicKey, isSigner: false, isWritable: true },
    { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID), isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: PublicKey.findProgramAddressSync([Buffer.from('__event_authority')], programId)[0], isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false }
  ]

  const data = Buffer.concat([
    bufferFromUInt64('12502976635542562355'),
    bufferFromUInt64(tokenBalance),
    bufferFromUInt64(minSolOutput)
  ])

  const instruction = new TransactionInstruction({
    keys,
    programId,
    data
  })

  txBuilder.add(instruction)

  console.log('Building transaction...')
  const transaction = await createTransaction(connection, txBuilder.instructions, owner.publicKey, priorityFeeInSol)

  console.log('Sending transaction...')
  const signature = await sendTransactionWrapper(connection, transaction, [owner])
  console.log(`Transaction confirmed: https://solscan.io/tx/${signature}`)
}

export async function pumpCheck (connection, owner, signature) {
  const tx = await connection.getTransaction(signature)
  const keyNum = tx.transaction.message.accountKeys.map(key => key.toString()).indexOf(owner.publicKey.toString())
  const balanceChange = (tx.meta.postBalances[keyNum] - tx.meta.preBalances[keyNum]) / LAMPORTS_PER_SOL
  const outBalance = tx.meta.postBalances[keyNum] / LAMPORTS_PER_SOL
  console.log(`${balanceChange < 0 ? '\x1b[31m' : '\x1b[32m '} ${balanceChange.toFixed(9)} SOL\x1b[0m ${outBalance.toFixed(9)} SOL https://solscan.io/tx/${signature} \x1b[0m`)
  // console.log(`⮑ https://solscan.io/tx/${signature}`)
}
