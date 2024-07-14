require('dotenv').config();
const { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const fs = require('fs');

let payer = null;
const SOLANA_WALLET_PATH = process.env.SOLANA_WALLET_PATH;
const SOLANA_WSS_ENDPOINT = process.env.SOLANA_WSS_ENDPOINT;
const SOLANA_HTTP_ENDPOINT = process.env.SOLANA_HTTP_ENDPOINT;

// setup wallet

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

// setup connection

const connection = new Connection(SOLANA_HTTP_ENDPOINT, {wsEndpoint: SOLANA_WSS_ENDPOINT});

var WebSocket = require('ws');
var ws = new WebSocket('wss://frontend-api.pump.fun/socket.io/?EIO=4&transport=websocket');

ws.on('open', function() {
    console.log('Socket opened!')
});

ws.on('message', function(data, flags) {
    const message = data.toString()
    if(message.startsWith('0')){
        ws.send(40)
    }else if(message === '2'){
        ws.send(3)
        console.log('Pinging...')
    }else if(message.startsWith('42')) {
        const parsed = JSON.parse(message.slice(2))
        if(parsed[0]==='newCoinCreated'){
            console.log('New token created!')
            console.log(`https://pump.fun/${parsed[1].mint} ${parsed[1].name}`)
        }
    }
});

const fetchSPLTokens = async () => {
  const tokenAccounts = await connection.getTokenAccountsByOwner(payer.publicKey, { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") });
  console.log(tokenAccounts)
}

const checkBalance = async () => {
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`Current balance: ${balance / 1e9} SOL`);
}

checkBalance();

// (async()=>{
//     const ACCOUNT_TO_WATCH = new PublicKey('CKu1F5sWUTeEy3NaBc2TxAK9NFRCS5srjFhPynXZ2ENt'); // Replace with your own Wallet Address
//     const subscriptionId = await connection.onAccountChange(
//         ACCOUNT_TO_WATCH,
//         (updatedAccountInfo) =>
//             console.log(`---Event Notification for ${ACCOUNT_TO_WATCH.toString()}--- \nNew Account Balance:`, updatedAccountInfo.lamports / LAMPORTS_PER_SOL, ' SOL'),
//         "confirmed"
//     );
//     console.log('Starting web socket, subscription ID: ', subscriptionId);
// })()

// fetchSPLTokens();