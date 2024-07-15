import dotenv from 'dotenv';
import fs from 'fs';
import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import axios from 'axios';
import bs58 from 'bs58';
import WebSocket from 'ws';
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

const pumpFunBuy = async (mint, amount) => {
  const url = "https://pumpapi.fun/api/trade";
  const data = {
    trade_type: "buy",
    mint,
    amount,
    slippage: 5,
    priorityFee: 0.0003,
    userPrivateKey: bs58.encode(privateKey)
  };

  try {
    const response = await axios.post(url, data);
    return response.data.tx_hash;
  } catch (error) {
    console.log(`Error executing buy transaction: ${error.message}`);
    return null;
  }
};

const pumpFunSell = async (mint, amount) => {
    const url = "https://pumpapi.fun/api/trade";
    const data = {
        trade_type: "sell",
        mint,
        amount, // Amount in tokens
        slippage: 5,
        priorityFee: 0.003, // Adjust priority fee if needed
        userPrivateKey: bs58.encode(privateKey)
    };

    try {
        const response = await axios.post(url, data);
        return response.data.tx_hash;
    } catch (error) {
        console.error(`Error executing sell transaction: ${error.message}`, error.response?.data);
        return null;
    }
};

// pumpFunBuy('7Hp41zY9MB2hozupgMB9PuPcnLtMsXJ5fwuCqscApump', 0.1)

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
      console.log(updatedAccountInfo.signature)
    }
  }, "confirmed");
}