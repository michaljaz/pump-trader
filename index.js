require('dotenv').config();
const { Keypair } = require("@solana/web3.js");
const fs = require('fs');

let payer = null;
const SOLANA_WALLET_PATH = process.env.SOLANA_WALLET_PATH;

if (!fs.existsSync(SOLANA_WALLET_PATH)) {
  console.log("Generating a new keypair");

  payer = Keypair.generate();

  fs.writeFileSync(SOLANA_WALLET_PATH, JSON.stringify(Array.from(payer.secretKey)));

  console.log(`Keypair saved to ${SOLANA_WALLET_PATH}`);
} else {
  console.log(`Reading keypair from ${SOLANA_WALLET_PATH}`);
  try {

    const keypair = fs.readFileSync(SOLANA_WALLET_PATH, 'utf8');
    const keypairArray = JSON.parse(keypair);

    if (Array.isArray(keypairArray)) {
      const privateKey = Uint8Array.from(keypairArray);
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

console.log("Public Key:", payer.publicKey.toString());
console.log("Secret Key:", payer.secretKey)