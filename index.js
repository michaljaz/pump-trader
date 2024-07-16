import fs from 'fs';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { Keypair, Connection, PublicKey } from "@solana/web3.js";

dotenv.config();

const SOLANA_WALLET_PATH = process.env.SOLANA_WALLET_PATH;
const SOLANA_WSS_ENDPOINT = process.env.SOLANA_WSS_ENDPOINT;
const SOLANA_HTTP_ENDPOINT = process.env.SOLANA_HTTP_ENDPOINT;

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

const connection = new Connection(SOLANA_HTTP_ENDPOINT, {wsEndpoint: SOLANA_WSS_ENDPOINT});
const ws = new WebSocket('wss://pumpportal.fun/api/data');


ws.on('open', function() {
  ws.send(JSON.stringify({ "method": "subscribeNewToken" }))
  console.log('Connected to pumpportal.fun');
});

let spying = false

ws.on('message', function (data, flags) {
  data = JSON.parse(data.toString())
  
  if (!data.message && !spying) {
    spying = data.mint
    console.log(`https://pump.fun/${data.mint}`)

    ws.send(JSON.stringify({"method": "unsubscribeNewToken"}))
    ws.send(JSON.stringify({"method": "subscribeTokenTrade", "keys": [spying]}))
  } else {
    console.log(data)
  }
});