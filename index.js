import fs from 'fs';
import bs58 from 'bs58';
import axios from 'axios';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { Keypair, Connection, PublicKey } from "@solana/web3.js";

dotenv.config();

const SOLANA_WALLET_PATH = process.env.SOLANA_WALLET_PATH;
const SOLANA_WSS_ENDPOINT = process.env.SOLANA_WSS_ENDPOINT;
const SOLANA_HTTP_ENDPOINT = process.env.SOLANA_HTTP_ENDPOINT;

// setup wallet

let privateKey;
let payer;

if (!fs.existsSync(SOLANA_WALLET_PATH)) {
  console.log("Generating a new keypair...");

  payer = Keypair.generate();

  privateKey = payer.secretKey;

  fs.writeFileSync(SOLANA_WALLET_PATH, JSON.stringify(Array.from(privateKey)));

  console.log(`Keypair saved to ${SOLANA_WALLET_PATH}`);
} else {
  console.log(`Reading keypair...`);
  try {
    const keypair = fs.readFileSync(SOLANA_WALLET_PATH, 'utf8');
    const keypairArray = JSON.parse(keypair);

    if (Array.isArray(keypairArray)) {
      privateKey = Uint8Array.from(keypairArray);
      payer = Keypair.fromSecretKey(privateKey);

      console.log('Private key loaded from keypair file');
    } else {
      throw new Error('Invalid keypair format');
    }
  } catch (error) {
    console.error('Error reading Solana wallet keypair:', error);
    process.exit(1);
  }
}

// setup connection

const connection = new Connection(SOLANA_HTTP_ENDPOINT, {wsEndpoint: SOLANA_WSS_ENDPOINT});
const ws = new WebSocket('wss://frontend-api.pump.fun/socket.io/?EIO=4&transport=websocket');

// spy on pump.fun websocket and then subscribe to the token

ws.on('open', function() {
    console.log('Listening for new token creation on pump.fun...')
});

ws.on('message', function(data, flags) {
  const message = data.toString()
  if(message.startsWith('0')){
    ws.send(40)
  }else if(message === '2'){
    ws.send(3)
  }else if(message.startsWith('42')) {
    const parsed = JSON.parse(message.slice(2))
    if(parsed[0] === 'newCoinCreated'){
      console.log('New token created!')
      console.log(`https://pump.fun/${parsed[1].mint} ${parsed[1].name}`)
      spyToken(parsed[1].mint)
      ws.close()
    }
  }
});

const spyToken = async (mint) => {
  console.log('Spying on token...')
  const ACCOUNT_TO_WATCH = new PublicKey(mint);
  await connection.onLogs(ACCOUNT_TO_WATCH, async (updatedAccountInfo) => {
    if (!updatedAccountInfo.err) {
      const { logs, signature } = updatedAccountInfo;

      let buys = 0
      let sells = 0

      for (let i in logs) {
        if (logs[i] == 'Program log: Instruction: Buy') {
          buys += 1
        } else if(logs[i] == 'Program log: Instruction: Sell'){
          sells += 1
        }
      }
      console.log(signature, buys, sells)
    }
  }, "confirmed");
}