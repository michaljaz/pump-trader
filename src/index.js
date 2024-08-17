
import dotenv from 'dotenv';
import base58 from "bs58";
import axios from 'axios';
import { AnchorProvider, setProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, LAMPORTS_PER_SOL, ComputeBudgetProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction} from '@solana/spl-token';

// load environment variables
dotenv.config();
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SOLANA_WSS_ENDPOINT = process.env.SOLANA_WSS_ENDPOINT;
const SOLANA_HTTP_ENDPOINT = process.env.SOLANA_HTTP_ENDPOINT;

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
const buyTransaction = async (mintAddress) => {

  // get coin data
  const coinData = await getCoinData(mintAddress);
  console.log(coinData);

  // create mint, wallet and pump program
  const mint = new PublicKey(mintAddress)
  const wallet = new Wallet(owner);
  const programId = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')

  // create connection and provider
  const connection = new Connection(SOLANA_HTTP_ENDPOINT, { wsEndpoint: SOLANA_WSS_ENDPOINT });
  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  setProvider(provider);

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

  // add buy instruction
  const priorityFeeInSol = 0.0001;
  const solIn = 0.0001;
  const slippageDecimal = 0.25;
  const solInLamports = solIn * LAMPORTS_PER_SOL;
  const tokenOut = Math.floor(solInLamports * coinData["virtual_token_reserves"] / coinData["virtual_sol_reserves"]);
  const solInWithSlippage = solIn * (1 + slippageDecimal);
  const maxSolCost = Math.floor(solInWithSlippage * LAMPORTS_PER_SOL);
  const keys = [
    { pubkey: new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
    { pubkey: new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"), isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
    { pubkey: associatedUser, isSigner: false, isWritable: true },
    { pubkey: owner.publicKey, isSigner: false, isWritable: true },
    { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
    { pubkey: PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], programId)[0], isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
  ];
  const data = Buffer.concat([
    bufferFromUInt64("16927863322537952870"),
    bufferFromUInt64(tokenOut),
    bufferFromUInt64(maxSolCost)
  ]);
  const instruction = new TransactionInstruction({
    keys: keys,
    programId,
    data: data
  });
  txBuilder.add(instruction);

  // create and send transaction
  const transaction = await createTransaction(connection, txBuilder.instructions, owner.publicKey, priorityFeeInSol);
  console.log('Buy transaction created:', transaction);

  // const signature = await sendAndConfirmTransactionWrapper(connection, transaction, [owner]);
  // console.log('Buy transaction confirmed:', signature);

  // const simulatedResult = await connection.simulateTransaction(transaction);
  // console.log(simulatedResult)
}

buyTransaction('4oc12QjBrvkSXLWSzs587R97hjCMbr7dBNRyedPMpump');