import { useWallet } from "@solana/wallet-adapter-react"
import { PhantomWalletName } from "@solana/wallet-adapter-wallets"
import { useEffect, useState } from "react"
import { Button } from "src/components/Button"
import { PostForm } from "src/components/PostForm"
import { useBlog } from "src/context/Blog"
import { useHistory } from 'react-router-dom'



export const Dashboard = () => {
  const history = useHistory()
  const [connecting, setConnecting] = useState(false)
  const { connected, select } = useWallet()
  const { user, posts, initialized, initUser, createPost, showModal, setShowModal, retrievePost } = useBlog()
  const [postTitle, setPostTitle] = useState("")
  const [postContent, setPostContent] = useState("")
  const [ userName, setUserName ] = useState("")
  const [ userAvatar, setUserAvatar ] = useState("")



    // Function to truncate the publicKey
    const truncatePubKey = (pubKey) => `${pubKey.slice(0, 4)}...`;

    // Function to generate the explorer link
    const generateExplorerLink = (pubKey) => `https://explorer.solana.com/address/${pubKey}?cluster=devnet`;
  
    // Placeholder function for fetching transaction data
    // Replace this with your actual logic to fetch data from the blockchain
    const fetchTransactionData = async (signature) => {
      // Fetch transaction data logic here
      // Return the content as string
      return "Chunk content from transaction"; // Placeholder
    };
  
    // Function to fetch and assemble post content
    const fetchAndAssemblePostContent = async (txSignatures) => {
      let assembledContent = '';
      for (const signature of txSignatures) {
        const transactionData = await fetchTransactionData(signature);
        assembledContent += transactionData;
      }
      return assembledContent;
    };
  
    // Function to handle post click event
  const handlePostClick = async (txSignatures) => {
    try {
      const content = await retrievePost(txSignatures);
      console.log("Assembled Content:", content);
      // Handle the display of the content, e.g., set in state, navigate to detail page, etc.
    } catch (error) {
      console.error("Error retrieving post content:", error);
    }
  };

  const onConnect = () => {
    setConnecting(true)
    select(PhantomWalletName)
  }

  useEffect(() => {
    if (user) {
      setConnecting(false)
    }
  }, [user])

console.log("posts: ", posts);

  return (
    <div className="dashboard background-color overflow-auto h-screen">
      <header className="fixed z-10 w-full h-14  shadow-md">
        <div className="flex justify-between items-center h-full container">
          <h2 className="text-2xl font-bold">
            <div className="bg-clip-text bg-gradient-to-br from-indigo-300 colorpink"
            >
              SuperPowerz
            </div>
          </h2>
          {connected ? (
            <div className="flex items-center">
               {!initialized && (
              <>
              <input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="font-bold text-sm ml-2"
                style={{ color: 'black' }}
                />
              <input
                type="text"
                placeholder="Enter avatar URL"
                value={userAvatar}
                onChange={(e) => setUserAvatar(e.target.value)}
                className="font-bold text-sm ml-2"
                style={{ color: 'black' }}
              />
            </>
          )}
              
              <p className=" font-bold text-sm ml-2 capitalize underlinepink">
                Home
              </p>
              <p className=" font-bold text-sm ml-2 capitalize mr-4 underlinepink">
                Blog
              </p>
              <img
                src={user?.avatar}
                alt="avatar"
                className="w-8 h-8 rounded-full bg-gray-200 shadow ring-2 ring-indigo-400 ring-offset-2 ring-opacity-50"
              />
              <p className=" font-bold text-sm ml-2 capitalize">
                {user?.name}
              </p>
              {initialized ? (
                <Button
                  className="ml-3 mr-2"
                  onClick={() => {
                    setShowModal(true)
                  }}
                >
                  Create Post
                </Button>
              ) : (
                <Button
                  className="ml-3 mr-2"
                  onClick={() => {
                    //initUser()
                    initUser(userName, userAvatar)
                  }}
                >
                  Become a Heroe
                </Button>
              )}

            </div>
          ) : (
            <Button
              loading={connecting}
              className="w-28"
              onClick={onConnect}
              leftIcon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              }
            >
              Connect
            </Button>
          )}
        </div>
      </header>
      <main className="dashboard-main pb-4 container flex relative">
        <div className="pt-3">
          {/* <h1 className="title">The Blog</h1> */}
          <div className="row">

            <article className="best-post">
              <div
                className="best-post-image"
                style={{
                  backgroundImage: `url("https://user-images.githubusercontent.com/62637513/184338364-a14b7272-d1dc-49f3-9f43-3ac37dacbe85.png")`,
                }}
              ></div>
              <div className="best-post-content">
                <div className="best-post-content-cat">December 2, 2022<span className="dot"> </span>Blog</div>
                <div className="best-post-content-title">
                  Because knowledge is the ultimate Super Power. Unleash your power. Everyone have the power to tell a story, and we want to hear yours.
                </div>
                <div className="best-post-content-sub">
                  Will talk about the heros of WBA first, like an article of @use_soda
                </div>
              </div>
            </article>

            <div className="all__posts">
            
            {posts.map((item, index) => {
          if (!item.publicKey || !item.account) {
            // If the item does not have a publicKey or account, return null or some placeholder
            return null; // or return a placeholder component
          }
  return (
    <article 
      className="post__card-2"
      onClick={() => handlePostClick(item.account.txSignatures)}
      //key={item.account.id}
      key={item.publicKey.toString()}
    >
      <div>
        {/* Displaying the PDA of the POST here */}
        <p>Post PDA: <a href={generateExplorerLink(item.publicKey.toString())} target="_blank" rel="noopener noreferrer">
            {truncatePubKey(item.publicKey.toString())}
          </a></p>
        {/* Other content of the post */}
        <div
          className="post__card__image-2"
          style={{
            backgroundImage: `url("https://user-images.githubusercontent.com/62637513/184338539-9cdbdc58-1e72-4c48-8203-0b7ec23d3eb0.png")`,
          }}
        ></div>
        <div>
          <div className="post__card_meta-2">
            <div className="post__card_cat">December 2, 2021<span className="dot"> </span>{item.account.title}  </div>
            <p className="post__card_alttitle-2">
              {item.account.content}
             
            </p>
          
          </div>
        </div>
      </div>
    </article>
  )
})}

            </div>
          </div>
        </div>
        <div className={`modal ${showModal && 'show-modal'}`} >
          <div className="modal-content">
            <span className="close-button"
              onClick={() => setShowModal(false)}
            >×</span>
            <PostForm
              postTitle={postTitle}
              postContent={postContent}
              setPostTitle={setPostTitle}
              setPostContent={setPostContent}
              onSubmit={() => createPost(postTitle, postContent)}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
