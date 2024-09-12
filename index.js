import dotenv from 'dotenv'
import base58 from 'bs58'
import WebSocket from 'ws'
import { AnchorProvider, setProvider, Wallet } from '@coral-xyz/anchor'
import { Connection, Keypair } from '@solana/web3.js'
import { pumpBuy, pumpSell, pumpCheck } from './lib/pump.js'

dotenv.config()
const PRIVATE_KEY = process.env.PRIVATE_KEY
const SOLANA_WSS_ENDPOINT = process.env.SOLANA_WSS_ENDPOINT
const SOLANA_HTTP_ENDPOINT = process.env.SOLANA_HTTP_ENDPOINT

const owner = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))
const wallet = new Wallet(owner)
const connection = new Connection(SOLANA_HTTP_ENDPOINT, { wsEndpoint: SOLANA_WSS_ENDPOINT })
const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
setProvider(provider)

console.log(`Owner address: ${owner.publicKey.toString()}`)



// const mint = ""
// pumpBuy(connection, owner, mint, 0.03)
// pumpSell(connection, owner, mint, 0)

async function check () {
  const signatures = await connection.getSignaturesForAddress(owner.publicKey)
  for (const signature of signatures) {
    try {
      await pumpCheck(connection, owner, signature.signature)
    } catch (e) { }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
check()


// async function buysell(mintStr) {
//     await pumpBuy(connection, owner, mintStr, 0.001)
//     await pumpSell(connection, owner, mintStr, 0)
// }

// pumpSell(connection, owner, 'FJ9fcU3vyewr2CDBNQnapywSv2v2VXwFTbf42Vm4pump', 0)
// buysell()

// function sniper () {
//   const ws = new WebSocket('wss://frontend-api.pump.fun/socket.io/?EIO=4&transport=websocket')

//   ws.on('open', function () {
//     console.log('Listening for new token creation on pump.fun...')
//   })

//   let already = false

//   ws.on('message', async function (data) {
//     const message = data.toString()
//     if (message.startsWith('0')) {
//       ws.send(40)
//     } else if (message === '2') {
//       ws.send(3)
//     } else if (message.startsWith('42')) {
//       const [type, r] = JSON.parse(message.slice(2))

//       if (type === 'newCoinCreated' && !already) {
//         const { payload } = JSON.parse(r.data.subscribe.data)
//         already = true
//         console.log('New token created:', payload.name)
//         await pumpBuy(payload.mint, 0.01)
//         console.log('waiting 30 before sell transaction...')
//         await new Promise(resolve => setTimeout(resolve, 30000))
//         await pumpSell(payload.mint, 0)
//       }
//     }
//   })
// }

// sniper()

// pumpBuy('EDEZ9Y2HfiHXWy74ybPftbRNj5fUyJVhCB2F9AYvpump', 0.001)

// swapTransaction('sell', 'AD6tPXsynJLANcJmzAfiv6yhtjRZM2cwB9qY5qHpump', 0)
