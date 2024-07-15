import fs from 'fs';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { Keypair, Connection, PublicKey } from "@solana/web3.js";

dotenv.config();

// const SOLANA_WALLET_PATH = process.env.SOLANA_WALLET_PATH;
// const SOLANA_WSS_ENDPOINT = process.env.SOLANA_WSS_ENDPOINT;
// const SOLANA_HTTP_ENDPOINT = process.env.SOLANA_HTTP_ENDPOINT;

// setup wallet

// let privateKey;
// let payer;

// if (!fs.existsSync(SOLANA_WALLET_PATH)) {
//   console.log("Generating a new keypair...");

//   payer = Keypair.generate();

//   privateKey = payer.secretKey;

//   fs.writeFileSync(SOLANA_WALLET_PATH, JSON.stringify(Array.from(privateKey)));

//   console.log(`Keypair saved to ${SOLANA_WALLET_PATH}`);
// } else {
//   console.log(`Reading keypair...`);
//   try {
//     const keypair = fs.readFileSync(SOLANA_WALLET_PATH, 'utf8');
//     const keypairArray = JSON.parse(keypair);

//     if (Array.isArray(keypairArray)) {
//       privateKey = Uint8Array.from(keypairArray);
//       payer = Keypair.fromSecretKey(privateKey);

//       console.log('Private key loaded from keypair file');
//     } else {
//       throw new Error('Invalid keypair format');
//     }
//   } catch (error) {
//     console.error('Error reading Solana wallet keypair:', error);
//     process.exit(1);
//   }
// }

// setup connection

// const connection = new Connection(SOLANA_HTTP_ENDPOINT, {wsEndpoint: SOLANA_WSS_ENDPOINT});
const ws = new WebSocket('wss://frontend-api.pump.fun/socket.io/?EIO=4&transport=websocket');

// spy on pump.fun websocket and then subscribe to the token

ws.on('open', function() {
    console.log('Listening for new token creation on pump.fun...')
});

let spying = false
const saved = {}

ws.on('message', function(data, flags) {
  const message = data.toString()
  if(message.startsWith('0')){
    ws.send(40)
  }else if(message === '2'){
    ws.send(3)
  }else if(message.startsWith('42')) {
    const [type, {
      mint, name, is_buy, sol_amount, username, signature
    }] = JSON.parse(message.slice(2))

    
    if(type === 'newCoinCreated' && !spying){
      console.log('New token created!')
      console.log(`https://pump.fun/${mint} ${name}`)
      spying = mint
      ws.send('42["joinTradeRoom",{"mint":"'+spying+'"}]')
    } else if ((type === `tradeCreated:${spying}` || (type === 'tradeCreated' && mint === spying)) && !saved[signature.slice(0, 6)]) {
      const sig = signature.slice(0, 6)
      saved[sig] = true
      console.log(
        is_buy ? 'BUY\t' : 'SELL\t',
        `"${name}" at`,
        sol_amount * 0.000000001,
        'by',
        username,
        sig
      )
    }
  }
});