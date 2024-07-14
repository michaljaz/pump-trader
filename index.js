require('dotenv').config();

const { Keypair } = require("@solana/web3.js");

const fs = require('fs');

// setup payer wallet

let payer = null;

const SOLANA_WALLET_PATH = process.env.SOLANA_WALLET_PATH;

if (!fs.existsSync(SOLANA_WALLET_PATH)) {

  console.log("Generating a new keypair");

  payer = Keypair.generate();

  fs.writeFileSync(SOLANA_WALLET_PATH, JSON.stringify(Array.from(payer.secretKey)));

} else {

  console.log(`Reading keypair from ${SOLANA_WALLET_PATH}`);

  const secretKey = fs.readFileSync(SOLANA_WALLET_PATH, 'utf8');

  payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretKey)));

}

console.log("Public Key:", payer.publicKey.toString());

console.log("Secret Key:", payer.secretKey)