// Importing necessary modules and functions from various libraries
import * as anchor from '@project-serum/anchor' // Importing all exports from the anchor library used for Solana blockchain interactions.
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react' // Importing hooks from the Solana wallet adapter for React.
import { PublicKey, SystemProgram } from "@solana/web3.js"; // Importing PublicKey and SystemProgram from Solana's web3.js library.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react"; // Importing React hooks and context API functions.
import { getAvatarUrl } from "src/functions/getAvatarUrl"; // Importing a custom function to get avatar URLs.
import { getRandomName } from "src/functions/getRandomName"; // Importing a custom function to generate random names.
import idl from "src/idl.json"; // Importing the IDL JSON file for the anchor program.
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey' // Importing a function to find program addresses synchronously.
import { utf8 } from '@project-serum/anchor/dist/cjs/utils/bytes' // Importing utf8 utilities for byte manipulation.
import { set } from '@project-serum/anchor/dist/cjs/utils/features';

// Defining a constant for the program key using the IDL file's metadata.
const PROGRAM_KEY = new PublicKey(idl.metadata.address);

// Creating a new context for the blog application.
const BlogContext = createContext();

// Custom hook to use the BlogContext.
export const useBlog = () => {
  const context = useContext(BlogContext); // Accessing the context.
  if (!context) {
    throw new Error("Parent must be wrapped inside PostsProvider"); // Throwing an error if the context is not found.
  }
  return context; // Returning the context.
};

// Provider component for the BlogContext.
export const BlogProvider = ({ children }) => {
  // State hooks for various pieces of data.
  const [user, setUser] = useState(); // State for the user.
  const [initialized, setInitialized] = useState(false); // State to track if initialization is done.
  const [posts, setPosts] = useState([]); // State for storing posts.
  const [transactionPending, setTransactionPending] = useState(false) // State to track if a transaction is pending.
  const [showModal, setShowModal] = useState(false) // State for controlling modal visibility.
  const [lastPostId, setLastPostId] = useState() // State for storing the ID of the last post.

  // Hooks to interact with the Solana blockchain and wallet.
  const anchorWallet = useAnchorWallet(); // Hook to get the connected wallet.
  const { connection } = useConnection(); // Hook to get the Solana connection.
  const { publicKey } = useWallet() // Hook to get the public key of the wallet.

  // Memoized creation of the anchor program instance.
  const program = useMemo(() => {
    if (anchorWallet) {
      const provider = new anchor.AnchorProvider(connection, anchorWallet, anchor.AnchorProvider.defaultOptions())
      return new anchor.Program(idl, PROGRAM_KEY, provider) // Creating a new anchor program instance.
    }
  }, [connection, anchorWallet])

  // Effect hook to initialize user data.
  useEffect(() => {
    const start = async () => {
      if (program && publicKey) {
        try {
          setTransactionPending(true) // Indicating that a transaction is pending.
          // Finding the user's program-derived address (PDA).
          const [userPda] = await findProgramAddressSync([utf8.encode('user'), publicKey.toBuffer()], program.programId)
          // Fetching the user account data.
          const user = await program.account.userAccount.fetch(userPda)
          if (user) {
            // Setting state if the user is found.
            setInitialized(true)
            setUser(user)
            setLastPostId(user.lastPostId)
            // Fetching all post accounts associated with the user.
            const postAccounts = await program.account.postAccount.all(publicKey.toString())
            setPosts(postAccounts)
            
          }
        } catch (error) {
          //console.log(error)
          setInitialized(false)
        }
      }
    }
    start()
  }, [program, publicKey, transactionPending]);

  //console.log("PROGRAM KEY"+ PROGRAM_KEY)
  // Function to initialize a new user.
  const initUser = async () => {
    if (program && publicKey) {
      console.log('Initializing user...', connection)
      try {
        setTransactionPending(true) // Indicating that a transaction is pending.
        // Finding the user's PDA.
        const [userPda] = findProgramAddressSync([utf8.encode('user'), publicKey.toBuffer()], program.programId)

        console.log("USER_PDA  " + userPda)
        console.log("USER PUBLIC KEY  " + publicKey)
       //console.log("PROGRAM KEY"+ PROGRAM_KEY)
        // Generating a random name and avatar URL.
        const name = getRandomName();
        const avatar = getAvatarUrl(name);
        console.log('Initializing avatarrrrr...')
        // Sending a transaction to initialize the user.
        const response = await program.methods
        //console.log('Program object:', program)

          .initUser(name, avatar)
         // console.log("NAME  " + name + "  AVATAR  " + avatar)
          //console.log('Program:', program),
          //console.log('Program Methods:', program.methods),
          //console.log('initUser Method:', program.methods.initUser)
          .accounts({
            signer: publicKey,
            userAccount: userPda,
            systemProgram: SystemProgram.programId
            
          }) 
          console.log('Accounts:', {
            userAccount: userPda,
            signer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          
          console.log('Transaction response 1:', response)
          .rpc()
          console.log('Transaction response 2:', response);
        setInitialized(true) // Setting the initialized state to true.
      } catch (error) {
        //console.log("ERRRORRRRRRRR ")
        console.log(error)
      } finally {
        //console.log("FINALLLLYYY ")
        setTransactionPending(false) // Resetting the transaction pending state.
      }
    }
  }

  // Function to create a new post.
  const createPost = async (title, content) => {
    if (program && publicKey) {
      setTransactionPending(true) // Indicating that a transaction is pending.
      try {
        // Finding the PDAs for the user and the new post.
        const [userPda] = findProgramAddressSync([utf8.encode('user'), publicKey.toBuffer()], program.programId)
        const [postPda] = findProgramAddressSync([utf8.encode('post'), publicKey.toBuffer(), Uint8Array.from([lastPostId])], program.programId)
        // Sending a transaction to create the post.
        await program.methods
          .createPost(title, content)
          .accounts({
            userAccount: userPda,
            postAccount: postPda,
            signer: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
        setShowModal(false) // Hiding the modal after the post is created.
      } catch (error) {
        console.error(error)
      } finally {
        setTransactionPending(false) // Resetting the transaction pending state.
      }
    }
  }

  // Returning the provider component with the context value.
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
      {children} // Rendering children components within the context provider.
    </BlogContext.Provider>
  );
};
