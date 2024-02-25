NFT Vamm Exchange API is built using Koa and primarily implements the following functionalities:

1. Implementation of backend API for user decentralized wallet (Metamask) login.
2. Leaderboard scoring rules:
    a. Number of transactions.
    b. Profit and loss (P&L).
    c. Referring and referred users (platform referrals).
    d. OG (Original Gangster) status (users who participated in the platform during the test network phase).
    Points are awarded for these actions.
3. User profile includes following and followed lists. Users in the following list can see season rankings, P&L, and the Vamm in which users participate.
4. Following and followed functionality for users.
5. User registration and login.
6. Implementation of Vamm clear house functionality:
    a. Trading settlement API retrieves all positions, daily, weekly, and monthly data including P&L, funding payments history, unrealized gains, from The Graph.
    b. Risk management.
    c. Contract execution.
    d. Fund custody.
7. Integration with Infura API.
8. Integration with The Graph.

