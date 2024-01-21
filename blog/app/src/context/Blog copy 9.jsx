import * as anchor from "@project-serum/anchor";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { PublicKey, Connection, SystemProgram, Keypair } from "@solana/web3.js";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import idl from "src/idl.json";
import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import bs58 from "bs58";
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";

const SPL_NOOP_ADDRESS = new PublicKey(
  "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
);
const CHUNK_SIZE = 900;
const PROGRAM_KEY = new PublicKey(idl.metadata.address);
const BlogContext = createContext();

export const useBlog = () => {
  const context = useContext(BlogContext);
  if (!context) {
    throw new Error("Parent must be wrapped inside BlogProvider");
  }
  return context;
};

export const BlogProvider = ({ children }) => {
  const [user, setUser] = useState();
  const [posts, setPosts] = useState([]);
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  // State to track whether the user is initialized
  const [initialized, setInitialized] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastPostId, setLastPostId] = useState();

  // Initialize the anchor program with the PROGRAM_KEY
  const program = useMemo(() => {
    if (anchorWallet) {
      const provider = new anchor.AnchorProvider(
        connection,
        anchorWallet,
        anchor.AnchorProvider.defaultOptions(),
      );
      return new anchor.Program(idl, PROGRAM_KEY, provider);
    }
  }, [connection, anchorWallet]);

  // Function to initialize or sign up a new user
  const initUser = async (name, avatar) => {
    if (program && publicKey) {
      try {
        const [userPda] = findProgramAddressSync(
          [utf8.encode("user"), publicKey.toBuffer()],
          program.programId,
        );

        await program.methods
          .signupUser(name, avatar)
          .accounts({
            userAccount: userPda,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        const newUserAccount = await program.account.userState.fetch(userPda);
        setUser(newUserAccount);
        setInitialized(true); // This user is now initialized
        // ... [The rest of your success logic]
      } catch (error) {
        console.error("Error during user initialization:", error);
        setInitialized(false); // Initialization failed
      }
    }
  };

  async function createBurnerAndSendSol() {
    let burner = Keypair.generate();
    console.log("BURNER ACCOUNNTTTT:" + burner.publicKey);
    const lamports = await connection.getMinimumBalanceForRentExemption(0);
    const transaction = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: burner.publicKey,
        lamports: lamports * 2,
      }),
    );
    let txSignature = await sendTransaction(transaction, connection, {
      skipPreflight: false,
    }).then(confirm);
    return burner;
  }

  // Function to send a chunk of content to the blockchain using the noop program
  const sendChunk = async (chunk, burner) => {
    if (!anchorWallet || !anchorWallet.publicKey) {
      throw new Error("Wallet not connected or payer not defined");
    }

    const buffer = Buffer.from(chunk, "utf-8");
    console.log("buffer:" + buffer);
    const noopInstruction = new anchor.web3.TransactionInstruction({
      programId: SPL_NOOP_ADDRESS,
      keys: [],
      data: buffer,
    });
    console.log("noopInstruction:" + noopInstruction);
    const transaction = new anchor.web3.Transaction().add(noopInstruction);
    console.log("transaction:" + transaction);
    transaction.feePayer = burner.publicKey;
    console.log("transaction.feePayer:" + transaction.feePayer);
    let { blockhash } = await connection.getLatestBlockhash();
    console.log("blockhash:" + blockhash);
    transaction.recentBlockhash = blockhash;
    console.log("transaction.recentBlockhash:" + transaction.recentBlockhash);

    let txSignature = await connection
      .sendTransaction(transaction, [burner], {
        skipPreflight: true,
      })
      .then(confirm);
      console.log("txSignature:" + txSignature);
    // console.log("connection.sendTransaction:" + connection.sendTransaction);
    // //await connection.confirmTransaction(txSignature, "confirmed");
    // console.log(
    //   "connection.confirmTransaction:" + connection.confirmTransaction,
    // );
    return txSignature;
    
  };

  // Function to retrieve and assemble the content from transaction signatures
  const retrievePost = async (txSignatures) => {
    let postContent = "";
    console.log('Retrieving posts...');
    for (const signature of txSignatures) {
      console.log(`Fetching transaction for signature: ${signature}`);
      const transaction = await connection.getTransaction(signature);
      if (
        transaction &&
        transaction.transaction &&
        transaction.transaction.message.instructions.length > 0
      ) {
        const instruction = transaction.transaction.message.instructions[0];
        const chunkData = bs58.decode(instruction.data);
        contentPiece += Buffer.from(chunkData).toString("utf-8");
        console.log(`Decoded content from signature ${signature}:`, contentPiece);
        postContent += contentPiece;
      }else{
        console.log(`No transaction found for signature: ${signature}`);
      }
    }
    console.log('Assembled post content:', postContent);
    return postContent;

  };
  
  // Function to create a new post
  const createPost = async (title, content) => {
    if (program && publicKey) {
      //const chunks = splitIntoChunks(content, CHUNK_SIZE);
      //const txSignatures = await Promise.all(chunks.map(chunk => sendChunk(chunk)));

      // Combine title and content into a single object
      const postObject = { title, content };

      // Convert the object to a JSON string
      const postJson = JSON.stringify(postObject);
      console.log("POSSSS" + postJson);

      // Check if the postJson is not empty
      if (!postJson || postJson.trim() === "") {
        console.error("Post data is empty or undefined");
        return; // Exit the function if content is invalid
      }

      // Split the JSON string into chunks
      let chunks = splitIntoChunks(postJson, CHUNK_SIZE);
      console.log(`Created ${chunks.length} chunks to be sent as transactions.`);

      //fund burner wallet
      let burner;
      try {
        burner = await createBurnerAndSendSol();
      } catch (e) {
        console.log(e);
      }

      // Send each chunk to the blockchain and collect tx signatures
      const txSignatures = await Promise.all(
        chunks.map((chunk) => sendChunk(chunk, burner)),
      );
      console.log("TXXXX" + txSignatures);
      const [userPda] = findProgramAddressSync(
        [Buffer.from("user"), publicKey.toBuffer()],
        program.programId,
      );
      const [postPda] = findProgramAddressSync(
        [
          Buffer.from("post"),
          publicKey.toBuffer(),
          Uint8Array.from([lastPostId]),
        ],
        program.programId,
      );
      
      console.log(txSignatures);

      await program.methods
        .createPost(title, txSignatures)
        .accounts({
          userAccount: userPda,
          postAccount: postPda,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Fetch the updated posts
      const updatedPosts = await program.account.postState.all();
      setPosts(updatedPosts);
      setShowModal(false);
      console.log("updatedPosts: ", updatedPosts);
    }
  };

  // Function to split content into chunks
  function splitIntoChunks(text, chunkSize) {
    console.log("text: ", text);
    console.log("chunkSize: ", chunkSize);
    let chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      console.log("chunks pre push: ", chunks);
      chunks.push(text.slice(0, +chunkSize));
      console.log("chunks post push: ", chunks);
    }
    console.log("chunks post loop: ", chunks);
    console.log("Chunks after split:", chunks); 
    return chunks;
  }

  async function confirm(signature) {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  }

  useEffect(() => {
    const fetchUserAndPosts = async () => {
      if (program && publicKey) {
        try {
          const [userPda] = findProgramAddressSync(
            [utf8.encode("user"), publicKey.toBuffer()],
            program.programId,
          );
          console.log("userPda: ", userPda.toString());
          const userAccount = await program.account.userState.fetch(userPda);
          console.log("user: ", userAccount);
          setInitialized(true);
          setUser(userAccount);
          setLastPostId(userAccount.lastPostId);

          const [postPda] = findProgramAddressSync(
            [
              Buffer.from("post"),
              publicKey.toBuffer(),
              Uint8Array.from([lastPostId]),
            ],
            program.programId,
          );
          const postAccounts = await program.account.postState.all();

          console.log("postAccounts:", postAccounts);
console.log("Type of postAccounts:", Array.isArray(postAccounts));

 
          const postFetchPromises = postAccounts.map(async (postAccount) => {
            console.log("Post account:", postAccount);
            try {
             
              const content = await retrievePost(postAccount.account.txSignatures);
              console.log("Content:", content);
              return { ...postAccount.account, content };
            } catch (error) {
              console.error(`Failed to fetch content for post: ${postAccount.account.title}`, error);
              return { ...postAccount.account, content: 'Failed to load content' };
            }
          });
  
          const postsWithContent = await Promise.all(postFetchPromises);
          setPosts(postsWithContent);
        } catch (error) {
          console.error("Error fetching user or posts:", error);
        }
      }
    };
  
    fetchUserAndPosts();
  }, [program, publicKey]);

  return (
    <BlogContext.Provider
      value={{
        user,
        posts,
        createPost,
        initUser,
        sendChunk,
        retrievePost,
        initialized,
        setInitialized, // Provide the setInitialized function
        showModal,
        setShowModal,
      }}
    >
      {children}
    </BlogContext.Provider>
  );
};

export default BlogProvider;
