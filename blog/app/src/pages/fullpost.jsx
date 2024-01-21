import { AnchorProvider, Program } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import idl from "src/idl.json";
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey';
import { utf8 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import './FullPost.css'; // Import the CSS file
import { useHistory } from "react-router-dom";

const PROGRAM_KEY = new PublicKey(idl.metadata.address);

function getProgram(provider) {
  return new Program(idl, PROGRAM_KEY, provider);
}

export const FullPost = () => {
  const { id } = useParams(); // This is your Post PDA
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [post, setPost] = useState(null);
  const [user, setUser] = useState(null);
  const history = useHistory();

   // Function to navigate to the dashboard
   const navigateToDashboard = () => {
    history.push('/'); // Use the correct path for your dashboard
  };


  useEffect(() => {
    if (wallet && id) {
      const provider = new AnchorProvider(connection, wallet, {});
      const program = getProgram(provider);

      const fetchPostAndUser = async () => {
        try {
          const postAccountKey = new PublicKey(id);
          const postAccount = await program.account.postState.fetch(postAccountKey);
          setPost(postAccount);

          // Derive the PDA for the user account
          const [userPda] = findProgramAddressSync(
            [utf8.encode('user'), postAccount.user.toBuffer()],
            program.programId
          );

          // Fetch the user account using the PDA
          const userAccount = await program.account.userState.fetch(userPda);
          setUser(userAccount);
        } catch (error) {
          console.error("Error fetching post or user:", error);
        }
      };

      fetchPostAndUser();
    }
  }, [wallet, connection, id]);

  return (
    <div className="blog-post-container">
      <button onClick={navigateToDashboard} className="home-button">Home</button>
      {post ? (
        <article className="blog-post">
          <h1 className="post-title">{post.title}</h1>
          <p>Post Address: {id}</p>
          <p>User's Public Addres: {post.authority.toString()}</p>
          {user && (
            <div className="post-author-info">
              <img src={user.avatar} alt="User Avatar" className="user-avatar"/>
              <p className="author-name">{user.name}</p>
            </div>
            
          )}
          <div className="post-content">
            <p>{post.content}</p>
          </div>
        </article>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};
