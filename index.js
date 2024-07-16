import fs from 'fs';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

import { Keypair, Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

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

const pumpRun = async (mint, action, amount) => {
  const response = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      publicKey: payer.publicKey.toBase58(),
      action,
      mint,
      amount: amount.toString(),
      denominatedInSol: action === 'buy' ? 'true' : 'false',
      slippage: 5,
      priorityFee: 0.0003,
      pool: 'pump'
    })
  })
  if(response.status === 200){ 
    const data = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(data));
    console.log(tx)
    tx.sign([payer]);
    const signature = await connection.sendTransaction(tx)
    console.log("Transaction: https://solscan.io/tx/" + signature);
  } else {
    console.log(response.statusText); // log error
  }
}

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

    pumpRun(data.mint, 'buy', 0.01)

    ws.send(JSON.stringify({"method": "unsubscribeNewToken"}))
    ws.send(JSON.stringify({"method": "subscribeTokenTrade", "keys": [spying]}))
  } else {
    console.log(data)
  }
});