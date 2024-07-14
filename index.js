require('dotenv').config();

const { Keypair } = require("@solana/web3.js");

const fs = require('fs');

// setup payer wallet

let payer = null;

if (!fs.existsSync('./key.json')) {

  // if key.json doesn't exist, create a new keypair and save it to key.json

  payer = Keypair.generate();

  fs.writeFileSync('./key.json', JSON.stringify(Array.from(payer.secretKey)));

} else {

  // if key.json exists, read the secret key from key.json

  const secretKey = fs.readFileSync('./key.json', 'utf8');

  payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretKey)));

}

console.log("Public Key:", payer.publicKey.toString());

console.log("Secret Key:", payer.secretKey)