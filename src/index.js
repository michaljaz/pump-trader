import fs from 'fs';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import bs58 from 'bs58';
import { Program, AnchorProvider, setProvider, Wallet } from '@coral-xyz/anchor';
import { Keypair, Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from './idl.js';

// load environment variables
dotenv.config();
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SOLANA_WSS_ENDPOINT = process.env.SOLANA_WSS_ENDPOINT;
const SOLANA_HTTP_ENDPOINT = process.env.SOLANA_HTTP_ENDPOINT;

// load keypair
const payer = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
console.log(`Payer address: ${payer.publicKey.toString()}`);

// buy transaction
const buyTransaction = async (mintAddress, amount) => {

  const wallet = new Wallet(payer);

  // const connection = new Connection(SOLANA_HTTP_ENDPOINT, { wsEndpoint: SOLANA_WSS_ENDPOINT });
  // const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  // setProvider(provider);

  // const program = new Program(idl, programId, provider);

  console.log(TOKEN_PROGRAM_ID)

  const mint = new PublicKey(mintAddress)

  const programId = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')

  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBytes()],
    programId
  )

  const [associatedBondingCurve] = PublicKey.findProgramAddressSync([
    bondingCurve.toBuffer(),
    TOKEN_PROGRAM_ID.toBuffer(),
    mint.toBytes()
  ], ASSOCIATED_TOKEN_PROGRAM_ID);

  const [associatedUser] = PublicKey.findProgramAddressSync([
    payer.publicKey.toBuffer(),
    TOKEN_PROGRAM_ID.toBuffer(),
    mint.toBuffer()
  ], ASSOCIATED_TOKEN_PROGRAM_ID);

  const accounts = {
    global: new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"),
    feeRecipient: new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"),
    mint,
    bondingCurve,
    associatedBondingCurve,
    associatedUser,
    user: payer.publicKey,
    systemProgram: new PublicKey("11111111111111111111111111111111"),
    tokenProgram: TOKEN_PROGRAM_ID,
    rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
    eventAuthority: PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], programId)[0],
    program: programId
  }

  console.log(accounts)

  // const instruction = await program.methods.buy(new BN(1500000), new BN(0)).accounts({
  //   global: new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"),
  //   feeRecipient: new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"),
  //   mint: mint,
  //   bondingCurve: new PublicKey(bondingCurve),
  //   associatedBondingCurve: new PublicKey(associatedBondingCurve),
  //   associatedUser: r,
  //   user: owner.publicKey,
  //   systemProgram: new PublicKey("11111111111111111111111111111111"),
  //   tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  //   rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
  //   eventAuthority: PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], programId)[0],
  //   program: programId
  // }).instruction();
}

const checkBalance = async () => {
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`Current balance: ${balance / 1e9} SOL`);
    return balance / 1e9;
};

buyTransaction('4oc12QjBrvkSXLWSzs587R97hjCMbr7dBNRyedPMpump', 0.001)



// const ws = new WebSocket('wss://pumpportal.fun/api/data');

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