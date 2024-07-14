const solanaWeb3 =  require("@solana/web3.js");

const generateKey = async () => {
  const keyPair = solanaWeb3.Keypair.generate();

  console.log("Public Key:", keyPair.publicKey.toString());
  console.log("Secret Key:", keyPair.secretKey)
};

generateKey();