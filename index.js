
import dotenv from 'dotenv';
import base58 from "bs58";
import axios from 'axios';
import WebSocket from 'ws';
import { AnchorProvider, setProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, SYSVAR_RENT_PUBKEY, Keypair, PublicKey, Transaction, TransactionInstruction, LAMPORTS_PER_SOL, ComputeBudgetProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, AccountLayout} from '@solana/spl-token';

// load environment variables & constants
dotenv.config();
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SOLANA_WSS_ENDPOINT = process.env.SOLANA_WSS_ENDPOINT;
const SOLANA_HTTP_ENDPOINT = process.env.SOLANA_HTTP_ENDPOINT;
const PUMPFUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'
const PUMPFUN_GLOBAL = "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"
const PUMPFUN_FEE_RECIPIENT = 'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM'


// load keypair
const owner = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY));
console.log(`owner address: ${owner.publicKey.toString()}`);

// get coin data
async function getCoinData(mintStr) {
  try {
    const url = `https://frontend-api.pump.fun/coins/${mintStr}`;
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://www.pump.fun/",
        "Origin": "https://www.pump.fun",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "If-None-Match": 'W/"43a-tWaCcS4XujSi30IFlxDCJYxkMKg"'
      }
    });
    if (response.status === 200) {
      return response.data;
    } else {
      console.error('Failed to retrieve coin data:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching coin data:', error);
    return null;
  }
}

async function createTransaction(
  connection,
  instructions,
  payer,
  priorityFeeInSol = 0
) {
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1400000,
  });

  const transaction = new Transaction().add(modifyComputeUnits);

  if (priorityFeeInSol > 0) {
      const microLamports = priorityFeeInSol * 1_000_000_000; // convert SOL to microLamports
      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports,
      });
      transaction.add(addPriorityFee);
  }

  transaction.add(...instructions);

  transaction.feePayer = payer;
  transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
  return transaction;
}

function bufferFromUInt64(value) {
    let buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(BigInt(value));
    return buffer;
}

async function sendAndConfirmTransactionWrapper(connection, transaction, signers) {
    try {
        const signature = await sendAndConfirmTransaction(connection, transaction, signers, { skipPreflight: true, preflightCommitment: 'confirmed' });
        console.log('Transaction confirmed with signature:', signature);
        return signature;
    } catch (error) {
        console.error('Error sending transaction:', error);
        return null;
    }
}

// buy transaction
const swapTransaction = async (type, mintAddress, amount) => {

  

  console.log(`Initiating ${type} transaction for mint: ${mintAddress} with amount: ${amount}`);

  // get coin data
  const coinData = await getCoinData(mintAddress);

  // create mint, wallet and pump program
  const mint = new PublicKey(mintAddress)
  const wallet = new Wallet(owner);
  const programId = new PublicKey(PUMPFUN_PROGRAM_ID)

  // create connection and provider
  const connection = new Connection(SOLANA_HTTP_ENDPOINT, { wsEndpoint: SOLANA_WSS_ENDPOINT });
  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  setProvider(provider);

  if (amount === 0) {
    const tokenAccounts = await connection.getTokenAccountsByOwner(owner.publicKey, { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") });
    const tokens = tokenAccounts.value.map(accountInfo => {
      const accountData = AccountLayout.decode(accountInfo.account.data);
      return {
        mint: new PublicKey(accountData.mint),
        amount: Number(BigInt(accountData.amount.toString())) / 10 ** 6 // Fetch the raw amount as BigInt
      };
    });
    const token = tokens.find(token => token.mint.toString() === mint.toString())
    if (token) {
      amount = token.amount;
      console.log(amount)
    } else {
      return;
    }
  }

  // find bonding curve address
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBytes()],
    programId
  )

  // find associated token address
  const [associatedBondingCurve] = PublicKey.findProgramAddressSync([
    bondingCurve.toBuffer(),
    TOKEN_PROGRAM_ID.toBuffer(),
    mint.toBytes()
  ], ASSOCIATED_TOKEN_PROGRAM_ID);

  // find associated user address
  const [associatedUser] = PublicKey.findProgramAddressSync([
    owner.publicKey.toBuffer(),
    TOKEN_PROGRAM_ID.toBuffer(),
    mint.toBuffer()
  ], ASSOCIATED_TOKEN_PROGRAM_ID);

  const txBuilder = new Transaction();

  // add associated token account creation instruction
  const tokenAccountInfo = await connection.getAccountInfo(associatedUser);
  if (!tokenAccountInfo) {
    txBuilder.add(createAssociatedTokenAccountInstruction(
        owner.publicKey,
        associatedUser,
        owner.publicKey,
        mint
    ));
  }

  // add swap instruction
  const tokenBalance = amount * 1000000;
  const solIn = amount;
  const priorityFeeInSol = 0.0001;
  const slippageDecimal = 0.25;
  const solInLamports = solIn * LAMPORTS_PER_SOL;
  const tokenOut = Math.floor(solInLamports * coinData["virtual_token_reserves"] / coinData["virtual_sol_reserves"]);
  const solInWithSlippage = solIn * (1 + slippageDecimal);
  const maxSolCost = Math.floor(solInWithSlippage * LAMPORTS_PER_SOL);
  const minSolOutput = Math.floor(tokenBalance * (1 - slippageDecimal) * coinData["virtual_sol_reserves"] / coinData["virtual_token_reserves"]);
  const keys = type === 'buy' ? [
    { pubkey: new PublicKey(PUMPFUN_GLOBAL), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(PUMPFUN_FEE_RECIPIENT), isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
    { pubkey: associatedUser, isSigner: false, isWritable: true },
    { pubkey: owner.publicKey, isSigner: false, isWritable: true },
    { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: new PublicKey(SYSVAR_RENT_PUBKEY), isSigner: false, isWritable: false },
    { pubkey: PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], programId)[0], isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
  ] : [
    { pubkey: new PublicKey(PUMPFUN_GLOBAL), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(PUMPFUN_FEE_RECIPIENT), isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
    { pubkey: associatedUser, isSigner: false, isWritable: true },
    { pubkey: owner.publicKey, isSigner: false, isWritable: true },
    { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
    { pubkey: new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID), isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], programId)[0], isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
  ];
  const data = type === 'buy' ? Buffer.concat([
    bufferFromUInt64("16927863322537952870"),
    bufferFromUInt64(tokenOut),
    bufferFromUInt64(maxSolCost)
  ]) : Buffer.concat([
    bufferFromUInt64("12502976635542562355"),
    bufferFromUInt64(tokenBalance),
    bufferFromUInt64(minSolOutput)
  ])
  const instruction = new TransactionInstruction({
    keys: keys,
    programId,
    data: data
  });
  txBuilder.add(instruction);

  // create and send transaction
  const transaction = await createTransaction(connection, txBuilder.instructions, owner.publicKey, priorityFeeInSol);
  console.log(`${type} transaction created`);

  const signature = await sendAndConfirmTransactionWrapper(connection, transaction, [owner]);
  console.log(`Transaction confirmed: https://solscan.io/tx/${signature}`);

  // // const simulatedResult = await connection.simulateTransaction(transaction);
  // // console.log(simulatedResult)
}



const ws = new WebSocket('wss://frontend-api.pump.fun/socket.io/?EIO=4&transport=websocket');

// spy on pump.fun websocket and then subscribe to the token

ws.on('open', function() {
    console.log('Listening for new token creation on pump.fun...')
});

let already = false

ws.on('message', async function(data, flags) {
  const message = data.toString()
  if(message.startsWith('0')){
    ws.send(40)
  }else if(message === '2'){
    ws.send(3)
  }else if(message.startsWith('42')) {
    const [type, r] = JSON.parse(message.slice(2))
    
    if (type === 'newCoinCreated' && !already) {
      const {payload} = JSON.parse(r.data.subscribe.data)
      already = true;
      console.log('New token created:', payload.name)
      await swapTransaction('buy', payload.mint, 0.005);
      console.log('waiting 30 before sell transaction...')
      await new Promise(resolve => setTimeout(resolve, 30000));
      await swapTransaction('sell', payload.mint, 0);
    }
  }
});

// swapTransaction('sell', '', 0)