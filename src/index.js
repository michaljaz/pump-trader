
import dotenv from 'dotenv';
import base58 from "bs58";
import { BN } from 'bn.js';
import { Program, AnchorProvider, setProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from './idl.js';


// load environment variables
dotenv.config();
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SOLANA_WSS_ENDPOINT = process.env.SOLANA_WSS_ENDPOINT;
const SOLANA_HTTP_ENDPOINT = process.env.SOLANA_HTTP_ENDPOINT;

// load keypair
const owner = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY));
console.log(`owner address: ${owner.publicKey.toString()}`);

// buy transaction
const buyTransaction = async (mintAddress) => {

  // create mint and wallet
  const mint = new PublicKey(mintAddress)
  const wallet = new Wallet(owner);

  // create connection and provider
  const connection = new Connection(SOLANA_HTTP_ENDPOINT, { wsEndpoint: SOLANA_WSS_ENDPOINT });
  const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
  setProvider(provider);

  // create program
  const programId = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
  const program = new Program(idl, programId, provider);

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

  // create input accounts
  const inputAccounts = {
    global: new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"),
    feeRecipient: new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM"),
    mint,
    bondingCurve,
    associatedBondingCurve,
    associatedUser,
    user: owner.publicKey,
    systemProgram: new PublicKey("11111111111111111111111111111111"),
    tokenProgram: TOKEN_PROGRAM_ID,
    rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
    eventAuthority: PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], programId)[0],
    program: programId
  }

  // create instruction
  const instruction = await program.methods.buy(new BN(1500000), new BN(0)).accounts(inputAccounts).instruction();
  const instructions = [];
  instructions.push(instruction);
  const blockhash = await connection.getLatestBlockhash("finalized");

  // create transaction
  // const message = {
  //   ownerKey: owner.publicKey,
  //   recentBlockhash: blockhash.blockhash,
  //   instructions: instructions
  // }
  // console.log(message)
  // const final_tx = new VersionedTransaction(new TransactionMessage(message).compileToV0Message());
  // final_tx.sign([wallet.payer]);

  // // send transaction
  // const txid = await connection.sendTransaction(final_tx, {
  //   skipPreflight: true,
  // });
  // await connection.confirmTransaction(txid);
  // console.log(txid);
}


buyTransaction('4oc12QjBrvkSXLWSzs587R97hjCMbr7dBNRyedPMpump')


// const checkBalance = async () => {
//     const balance = await connection.getBalance(owner.publicKey);
//     console.log(`Current balance: ${balance / 1e9} SOL`);
//     return balance / 1e9;
// };


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