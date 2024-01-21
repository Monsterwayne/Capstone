import * as anchor from '@project-serum/anchor'
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { getAvatarUrl } from "src/functions/getAvatarUrl";
import { getRandomName } from "src/functions/getRandomName";
import idl from "src/idl.json";
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey'
import { utf8 } from '@project-serum/anchor/dist/cjs/utils/bytes'
import bs58 from 'bs58';

// Constants
const CHUNK_SIZE = 900; // Adjust as needed

function splitIntoChunks(text, chunkSize) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}



const PROGRAM_KEY = new PublicKey(idl.metadata.address);
console.log("PROGRAM KEY IS "+PROGRAM_KEY)

const BlogContext = createContext();

export const useBlog = () => {
  const context = useContext(BlogContext);
  if (!context) {
    throw new Error("Parent must be wrapped inside PostsProvider");
  }

  return context;
};

export const BlogProvider = ({ children }) => {
  const [user, setUser] = useState();
  const [initialized, setInitialized] = useState(false);
  const [posts, setPosts] = useState([])
  const [transactionPending, setTransactionPending] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [lastPostId, setLastPostId] = useState()

  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { publicKey } = useWallet()

  const program = useMemo(() => {
    if (anchorWallet) {
      const provider = new anchor.AnchorProvider(connection, anchorWallet, anchor.AnchorProvider.defaultOptions())
      return new anchor.Program(idl, PROGRAM_KEY, provider)
    }
  }, [connection, anchorWallet])

  useEffect(() => {

    const start = async () => {
      if (program && publicKey) {
        try {
          setTransactionPending(true)
          const [userPda] =  findProgramAddressSync([utf8.encode('user'), publicKey.toBuffer()], program.programId)
          console.log("userpda is "+ userPda)
          console.log("authority is "+ publicKey.toString())
         
          const user = await program.account.userState.fetch(userPda)
          console.log("user:"+ user)
          console.log("user name:"+ user.name + " user lastPostId:"+ user.lastPostId)
          if (user) {
            
            setInitialized(true) // create post
            
            setUser(user)
            setLastPostId(user.lastPostId)
            console.log("BBBBBBBBBBBB:")           
            const postAccounts = await program.account.postState.all(publicKey.toString())
           
console.log("postAccounts:"+ postAccounts)
          
           
            setPosts(postAccounts)
            
          }
        } catch (error) {
          console.log("Error fetching user account")
          console.log(initialized)
          setInitialized(false) //initialize user
        } finally {
         // setTransactionPending(false)
        }
      }
    }

    start()

  }, [program, publicKey, transactionPending]);


  //const initUser = async () => {
    const initUser = async (name, avatar) => {
    if (program && publicKey) {
      try {
        
        const [userPda] = findProgramAddressSync([utf8.encode('user'), publicKey.toBuffer()], program.programId)
        //const name = getRandomName();
        //const avatar = getAvatarUrl(name);

        await program.methods
          .signupUser(name, avatar)
          .accounts({
            userAccount: userPda,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
        setInitialized(true)
      } catch (error) {
        console.log(error)
      } finally {
        setTransactionPending(false)
      }
    }
  }

  const createPost = async (title, content) => {
    if (program && publicKey) {
      setTransactionPending(true)
      try {

        // Split the content into chunks
      const chunks = splitIntoChunks(content, CHUNK_SIZE);

      // Send each chunk to the blockchain and collect tx signatures
      const txSignatures = await Promise.all(chunks.map(async (chunk) => {
        // You need to implement this function based on your blockchain interaction
        return await sendChunk(chunk);
      }));


    
        const [userPda] = findProgramAddressSync([utf8.encode('user'), publicKey.toBuffer()], program.programId)
        const [postPda] = findProgramAddressSync([utf8.encode('post'), publicKey.toBuffer(), Uint8Array.from([lastPostId])], program.programId)
console.log("postPda is "+ postPda)
console.log("pubkey is "+ publicKey.toString())
        await program.methods
          .createPost(title, txSignatures)
          .accounts({
            userAccount: userPda,
            postAccount: postPda,
            //blogAccount: postPda,
            authority: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
      ///////////////////////
          // After creating a post, we fetch the updated user state
        const updatedUser = await program.account.userState.fetch(userPda);
        setUser(updatedUser);
        setLastPostId(updatedUser.lastPostId);

        // Re-fetch posts to update the UI with latest posts
      const updatedPosts = await program.account.postState.all();
      setPosts(updatedPosts);

      //////////////////////

        setShowModal(false)
      } catch (error) {
        console.error(error)
      } finally {
        setTransactionPending(false)
      }
    }
  }

  return (
    <BlogContext.Provider
      value={{
        user,
        posts,
        initialized,
        initUser,
        createPost,
        showModal,
        setShowModal,
      }}
    >
      {children}
    </BlogContext.Provider>
  );
};
