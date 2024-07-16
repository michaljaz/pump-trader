import fs from 'fs';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import bs58 from 'bs58';
import { Program, AnchorProvider, setProvider, Wallet } from '@coral-xyz/anchor';
import { Keypair, Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SOLANA_WSS_ENDPOINT = process.env.SOLANA_WSS_ENDPOINT;
const SOLANA_HTTP_ENDPOINT = process.env.SOLANA_HTTP_ENDPOINT;
const PUMP_FUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

console.log(`Reading keypair...`);
const payer = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

console.log(payer.publicKey.toString());

const connection = new Connection(SOLANA_HTTP_ENDPOINT, {wsEndpoint: SOLANA_WSS_ENDPOINT});
const ws = new WebSocket('wss://pumpportal.fun/api/data');


const checkBalance = async () => {
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`Current balance: ${balance / 1e9} SOL`);
    return balance / 1e9;
};

checkBalance();


// ws.on('open', function() {
//   ws.send(JSON.stringify({ "method": "subscribeNewToken" }))
//   console.log('Connected to pumpportal.fun');
// });

// let spying = false

// ws.on('message', function (data, flags) {
//   data = JSON.parse(data.toString())

//   if (!data.message && !spying) {
//     spying = data.mint
//     console.log(`https://pump.fun/${data.mint}`)

//     // pumpRun(data.mint, 'buy', 0.005)

//     ws.send(JSON.stringify({"method": "unsubscribeNewToken"}))
//     ws.send(JSON.stringify({"method": "subscribeTokenTrade", "keys": [spying]}))
//   } else {
//     console.log(data)
//   }
// });