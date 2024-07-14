require('dotenv').config();
const fs = require('fs');
const { Keypair, Connection, PublicKey } = require("@solana/web3.js");

const SOLANA_WALLET_PATH = process.env.SOLANA_WALLET_PATH;
const SOLANA_WSS_ENDPOINT = process.env.SOLANA_WSS_ENDPOINT;
const SOLANA_HTTP_ENDPOINT = process.env.SOLANA_HTTP_ENDPOINT;

// setup wallet

let payer = null;

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

// spy on pump.fun websocket and then subscribe to the token

ws.on('open', function() {
    console.log('Pump.fun socket opened!')
});

ws.on('message', function(data, flags) {
  const message = data.toString()
  if(message.startsWith('0')){
    ws.send(40)
  }else if(message === '2'){
    ws.send(3)
    // console.log('Pinging...')
  }else if(message.startsWith('42')) {
    const parsed = JSON.parse(message.slice(2))
    if(parsed[0]==='newCoinCreated'){
      console.log('New token created!')
      console.log(`https://pump.fun/${parsed[1].mint} ${parsed[1].name}`)
      spyToken(parsed[1].mint)
      ws.close()
    }
  }
});

const spyToken = async (mint) => {
  console.log('Spying on token: ', mint)
  const ACCOUNT_TO_WATCH = new PublicKey(mint);
  const subscriptionId = await connection.onLogs(ACCOUNT_TO_WATCH, async (updatedAccountInfo) => {
    if (!updatedAccountInfo.err) {
      console.log(updatedAccountInfo.signature)
    }
  }, "confirmed");
  console.log('Starting web socket, subscription ID: ', subscriptionId);
}