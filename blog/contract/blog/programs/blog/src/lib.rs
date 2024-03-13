use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;
use session_keys::{session_auth_or, Session, SessionError, SessionToken};

declare_id!("3rAUkxAq81PMqB1dpR4ihfrLCTG3Bu7o7g8TH5xGVxWP");

#[program]
pub mod blog_sol {

    use super::*;

    pub fn signup_user(ctx: Context<SignupUser>, name: String, avatar: String) -> ProgramResult {
        let user_account = &mut ctx.accounts.user_account;
        let authority = &mut ctx.accounts.authority;

        user_account.name = name;
        user_account.avatar = avatar;
        user_account.authority = authority.key();

        user_account.last_post_id = 0;
        user_account.post_count = 0;

        Ok(())
    }

    #[session_auth_or(
            ctx.accounts.user.authority.key() == ctx.accounts.signer.key(),
            Error("Wrong Authority")
        )]
    pub fn create_post(
        ctx: Context<CreatePost>,
        title: String,
        tx_signatures: Vec<String>,
    ) -> ProgramResult {
        let post_account = &mut ctx.accounts.post_account;
        let user_account = &mut ctx.accounts.user_account;
        let authority = &mut ctx.accounts.authority;
        let clock = Clock::get().unwrap();

        post_account.title = title;
        //post_account.content = content;
        post_account.tx_signatures = tx_signatures;
        post_account.user = user_account.key();
        post_account.authority = authority.key();
        post_account.timestamp = clock.unix_timestamp;
        //  post_account.tx_signature = Some(tx_signature);

        user_account.last_post_id += 1;
        post_account.id = user_account.last_post_id;

        user_account.post_count += 1;

        emit!(PostEvent {
            label: "CREATE".to_string(),
            post_id: post_account.key(),
            //content: post_account.content.to_string(),
            next_post_id: None
        });

        Ok(())
    }
}

#[derive(Accounts, Session)]
pub struct CreatePost<'info> {
    #[account(
             init,
             seeds = [b"post", authority.key().as_ref(),&[user_account.last_post_id as u8].as_ref()],
             bump,
             payer = authority,
             space = 8 +8 + 50 + 904 + 32 + 32 + 32 + 32 + 32 + 32 + 32 + 1
             )]
    pub post_account: Account<'info, PostState>,

    #[account(
                mut,
                has_one = authority)]
    pub user_account: Account<'info, UserState>,

    #[session(
        // The ephemeral keypair signing the transaction
        signer = signer,
        // The authority of the user account which must have created the session
        authority = user.authority.key()
    )]
    // Session Tokens are passed as optional accounts
    pub session_token: Option<Account<'info, SessionToken>>,

    // burner key made for the session.
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub user: Account<'info, UserState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SignupUser<'info> {
    #[account(
            init,
            seeds = [b"user", authority.key().as_ref()],
            bump,
            payer = authority,
            space = 8 + 40 + 120  + 32 + 1 + 1)]
    pub user_account: Account<'info, UserState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// Define the context struct for the delete_post function
#[derive(Accounts)]
pub struct DeletePost<'info> {
    /// CHECK: This is not dangerous because we specify the `close` constraint in post_account.
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority,
        close = authority // This will transfer the lamports and close the account
    )]
    pub post_account: Account<'info, PostState>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct PostEvent {
    pub label: String,
    //pub content: String,
    pub post_id: Pubkey,
    pub next_post_id: Option<Pubkey>,
}

#[account]
pub struct UserState {
    pub name: String,
    pub avatar: String,
    pub authority: Pubkey,
    pub last_post_id: u8,
    pub post_count: u8,
}

#[account]
pub struct PostState {
    pub title: String,
    pub tx_signatures: Vec<String>,
    // pub content: String,
    pub timestamp: i64,
    pub user: Pubkey,
    pub id: u8,
    pub post_pda: Pubkey,
    pub pre_post_key: Pubkey,
    pub authority: Pubkey,
    //pub tx_signature: Option<String>,
}
