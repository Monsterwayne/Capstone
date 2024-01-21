import React, { useEffect, useState } from "react";
import { AnchorProvider, Program } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useParams } from "react-router-dom";
import idl from "src/idl.json";
import "./FullPost.css"; // Import the CSS file here

const PROGRAM_KEY = new PublicKey(idl.metadata.address);

function getProgram(provider) {
  return new Program(idl, PROGRAM_KEY, provider);
}

export const FullPost = () => {
  const { id } = useParams();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [provider, setProvider] = useState();
  const [post, setPost] = useState();
  const [author, setAuthor] = useState();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (wallet) {
      const provider = new AnchorProvider(connection, wallet, {});
      setProvider(provider);
    }
  }, [connection, wallet]);

  useEffect(() => {
    if (provider) {
      setIsLoading(true);
      const getPostAndAuthor = async () => {
        try {
          const program = getProgram(provider);
          console.log("This ios the program ID  " + program.programId.toString())
          const postKey = new PublicKey(id);
          console.log("this is the postkey "+ postKey.toString())
          const fetchedPost = await program.account.postState.fetch(postKey);
          setPost(fetchedPost);

          // Fetch the author's data
          const authorKey = new PublicKey(fetchedPost.user);
          const fetchedAuthor = await program.account.userState.fetch(authorKey);
          setAuthor({ data: fetchedAuthor, publicKey: authorKey });
        } catch (error) {
          console.error("Error fetching post or author:", error);
        } finally {
          setIsLoading(false);
        }
      };
      getPostAndAuthor();
    }
  }, [provider, id]);

  if (isLoading) {
    return <div className="loading">Loading post...</div>;
  }

  if (!post) {
    return <div className="post-not-found">Post not found</div>;
  }

  const postDate = new Date(post.timestamp.toNumber() * 1000).toLocaleDateString();

  console.log( postDate)

  return (
    <article className="full-post">
      <div className="post-image">
        <img src="path-to-your-image.jpg" alt={post.title} />
      </div>

      <div className="post-content">
        <h1 className="post-title">{post.title}</h1>
        <div className="post-meta">
        <div className="author-info">
            {author?.data?.avatar && (
              <img src={author.data.avatar} alt={author.data.name} className="author-avatar" />
            )}
            <span className="author-name">{author?.data?.name || "Unknown"}</span>
        </div>
          <span className="author-key">Author's pubkey: {author?.publicKey.toString() || "N/A"}</span>
          <span className="date">Date: {postDate}</span>
          <span className="pda">Post Address: {id}</span>
        </div>
        <p className="post-text">{post.content}</p>
      </div>
    </article>
  );
};
