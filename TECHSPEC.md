# ABS WorldPool — Technical Specification

> **Version:** v4 (current) · **Last updated:** June 2026  
> **Status:** Testnet live · Mainnet pending  
> **Live URL:** https://absworldpool.xyz

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Smart Contract](#3-smart-contract)
4. [Frontend](#4-frontend)
5. [Infrastructure & Deployment](#5-infrastructure--deployment)
6. [Security Model](#6-security-model)
7. [Mainnet Launch Checklist](#7-mainnet-launch-checklist)
8. [Key Design Decisions](#8-key-design-decisions)

---

## 1. Project Overview

ABS WorldPool is a Web3 prediction platform built on **Abstract Chain** (EVM L2) for the 2026 FIFA World Cup. Users participate in two parallel games by spending ETH. All funds flow directly through a single on-chain smart contract — no custody, no backend.

### Games

| Game | Mechanic | Price | Win Condition |
|------|----------|-------|---------------|
| **Nations Cup** | Mint ERC-1155 NFTs for any of 48 countries | 0.0022 ETH / NFT | Hold NFTs of the World Cup champion → claim pro-rata share of that country's pool |
| **Top Scorer** | Buy voting tickets, vote for a player | 0.0018 ETH / ticket | Voted for the real top scorer → claim pro-rata share of the scorer pool |

### Economics

```
Every mint/ticket payment:
  └─ 20%  → devWallet  (instant, at time of purchase)
  └─ 80%  → prize pool (locked in contract)

At settlement (claim):
  └─ 95%  → winner
  └─  5%  → devWallet  (fee taken from each claim)
```

- No per-wallet mint limit — removed in v4; pro-rata system ensures fair distribution regardless of quantity.
- Prize pools accumulate independently per country (Nations Cup) and as a single pool (Top Scorer).
- `totalLockedPrizePool` tracks both games combined. Do NOT add `topScorerPoolBalance` separately — it would double-count.

### Timeline

| Event | Date |
|-------|------|
| Tournament start | June 11, 2026 16:00 UTC |
| Testnet deploy | May 2026 |
| Mainnet deploy | Before June 11, 2026 |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────┐
│                  USER BROWSER                   │
│                                                 │
│  Next.js 14 App (absworldpool.xyz)              │
│  ├─ Wagmi 2 + Viem 2  (contract reads/writes)  │
│  └─ @abstract-foundation/agw-react  (wallet)   │
└───────────────────┬─────────────────────────────┘
                    │  JSON-RPC
                    ▼
┌─────────────────────────────────────────────────┐
│           ABSTRACT TESTNET (Chain 11124)        │
│                                                 │
│  ABSWorldPool.sol  (Solidity 0.8.24)            │
│  ├─ ERC1155  (country NFTs, token IDs 1–48)    │
│  ├─ ERC2981  (5% royalty on secondary sales)   │
│  ├─ Ownable  (admin functions)                 │
│  └─ ReentrancyGuard                            │
└─────────────────────────────────────────────────┘
```

**No backend server.** All state lives on-chain. The frontend reads contract state directly via RPC and writes via wallet transactions.

---

## 3. Smart Contract

### Addresses

| Network | Address |
|---------|---------|
| Abstract Testnet | `0xee37Ddb34a737AD274671423Feb838C72e7999e4` |
| Abstract Mainnet | TBD (deploy before June 11) |

- **Chain ID:** 11124 (testnet) / 2741 (mainnet)
- **RPC (testnet):** `https://api.testnet.abs.xyz`
- **Explorer:** `https://explorer.testnet.abs.xyz`
- **Foundry project:** `AbsWorldPool/` (separate from frontend repo)

### Constants

| Name | Value | Description |
|------|-------|-------------|
| `MINT_PRICE` | 0.0022 ETH | Price per country NFT |
| `TICKET_PRICE` | 0.0018 ETH | Price per voting ticket |
| `DEV_SHARE_BPS` | 2000 (20%) | Instant dev cut on every purchase |
| `POOL_FEE_BPS` | 500 (5%) | Fee deducted from each claim payout |
| `ROYALTY_BPS` | 500 (5%) | EIP-2981 royalty on secondary sales |
| `MAX_COUNTRIES` | 48 | Total country token IDs |
| `UNCLAIMED_TIMEOUT` | 30 days | After finalization, owner can sweep unclaimed funds |

### State Variables

```solidity
// Config
address public devWallet;
string  public baseURI;
bool    public paused;

// Financials
uint256 public totalGlobalVolumeETH;   // gross: all mints + tickets
uint256 public totalLockedPrizePool;   // net: both pools combined
uint256 public topScorerPoolBalance;   // scorer pool only

// Finalization
bool    public tournamentFinalized;
bool    public topScorerFinalized;
uint256 public winningCountryId;
string  public finalTopScorer;
uint256 public finalNationsCupPool;    // snapshot at finalization
uint256 public finalTopScorerPool;     // snapshot (excludes unused ticket refunds)
uint256 public nationsCupFinalizedAt;
uint256 public topScorerFinalizedAt;
uint256 public totalUnusedTickets;     // for correct pool snapshot calc

// Mappings
mapping(uint256 => uint256) public countryPools;
mapping(uint256 => uint256) public countryTotalSupply;
mapping(address => mapping(uint256 => uint256)) public userMintCount;
mapping(bytes32 => uint256) public playerVoteCounts;      // key = keccak256(playerName)
mapping(address => mapping(bytes32 => uint256)) public userPlayerVotes;
mapping(address => uint256) public userUnusedTickets;
```

### User Functions

#### `mintCountryNFT(countryId, amount)` — payable
- Requires `!tournamentFinalized`, `!paused`
- `countryId` must be 1–48
- `msg.value` must equal `MINT_PRICE * amount` exactly
- Mints ERC-1155 tokens, adds `80%` to `countryPools[countryId]`

#### `buyScorerTickets(quantity)` — payable
- Requires `!topScorerFinalized`, `!paused`
- Adds tickets to `userUnusedTickets[msg.sender]`
- Adds `80%` to `topScorerPoolBalance`

#### `voteTopScorer(playerName, votesToUse)` — nonpayable
- Requires `!topScorerFinalized`, `!paused`
- Converts unused tickets → votes for `playerName`
- `playerName` max 64 bytes, stored as `keccak256` key

#### `claimNationsCupRewards()` — nonpayable
- Requires `tournamentFinalized`
- Payout = `(userTokens / totalSupply) * finalNationsCupPool * 0.95`
- Burns the user's winning country NFTs after claim

#### `claimTopScorerRewards()` — nonpayable
- Requires `topScorerFinalized`
- Payout = `(userVotes / totalWinnerVotes) * finalTopScorerPool * 0.95`
- Zeros out `userPlayerVotes` after claim

#### `refundUnusedTickets()` — nonpayable
- Requires `topScorerFinalized`
- Refunds `80% * TICKET_PRICE` per unused ticket (the pool portion only — dev already took 20%)

### Admin Functions (onlyOwner)

| Function | Description |
|----------|-------------|
| `finalizeNationsCup(countryId)` | Locks winner, snapshots pool. Requires supply > 0. |
| `finalizeTopScorer(playerName)` | Locks winner. 0-vote case: nobody claims, owner recovers after 30 days. Snapshot excludes unused-ticket refund portion. |
| `advanceStage(loserId, winnerId)` | Rolls loser country's pool into winner's pool. If winner has 0 supply → emergency route to devWallet. Cannot be called after finalization. |
| `setPaused(bool)` | Halts mint/ticket/vote. Claims still work. |
| `setDevWallet(address)` | Updates dev wallet + royalty receiver. |
| `setBaseURI(string)` | Updates NFT metadata URI. Emits ERC-4906 `BatchMetadataUpdate` (1–48) for OpenSea refresh. |
| `withdrawUnclaimedNationsCup()` | Sweeps unclaimed NC pool to devWallet. Callable 30 days after finalization. |
| `withdrawUnclaimedTopScorer()` | Sweeps unclaimed TS pool to devWallet. Same 30-day rule. |

### Events

| Event | When emitted |
|-------|-------------|
| `CountryMinted(user, countryId, amount, timestamp)` | Every NFT mint |
| `TicketPurchased(user, quantity, timestamp)` | Every ticket purchase |
| `VoteCast(user, playerName, votes, timestamp)` | Every vote |
| `PoolRolledOver(loserId, winnerId, amount)` | Every `advanceStage` call |
| `NationsCupFinalized(winningId, totalPoolSize)` | NC finalization |
| `TopScorerFinalizedEvent(playerName, totalPoolSize)` | TS finalization |
| `NationsCupClaimed(user, reward, timestamp)` | NC reward claim |
| `TopScorerClaimed(user, reward, timestamp)` | TS reward claim |
| `UnusedTicketsRefunded(user, count, amount, timestamp)` | Ticket refund |
| `BatchMetadataUpdate(1, 48)` | `setBaseURI` call (ERC-4906) |

### Country Token IDs

Token IDs are non-sequential and assigned by tournament tier/odds rank:

| ID | Country | ID | Country | ID | Country |
|----|---------|----|---------|----|---------|
| 1 | Mexico | 17 | Germany | 33 | France |
| 2 | South Africa | 18 | Curaçao | 34 | Senegal |
| 3 | South Korea | 19 | Ivory Coast | 35 | Iraq |
| 4 | Czech Republic | 20 | Ecuador | 36 | Norway |
| 5 | Canada | 21 | Netherlands | 37 | Argentina |
| 6 | Bosnia-Herz. | 22 | Japan | 38 | Algeria |
| 7 | Qatar | 23 | Sweden | 39 | Austria |
| 8 | Switzerland | 24 | Tunisia | 40 | Jordan |
| 9 | Brazil | 25 | Belgium | 41 | Portugal |
| 10 | Morocco | 26 | Egypt | 42 | DR Congo |
| 11 | Haiti | 27 | Iran | 43 | Uzbekistan |
| 12 | Scotland | 28 | New Zealand | 44 | Colombia |
| 13 | United States | 29 | **Spain** | 45 | **England** |
| 14 | Paraguay | 30 | Cape Verde | 46 | Croatia |
| 15 | Australia | 31 | Saudi Arabia | 47 | Ghana |
| 16 | Turkey | 32 | Uruguay | 48 | Panama |
| | | **33** | **France** | | |

> ⚠️ **Critical:** These IDs must match `frontend/lib/countries.ts` and `report.mjs` exactly.

---

## 4. Frontend

### Stack

| Technology | Version | Role |
|------------|---------|------|
| Next.js | 14 | React framework (App Router) |
| TypeScript | 5 | Type safety |
| Wagmi | 2 | Ethereum hooks |
| Viem | 2 | Low-level EVM client |
| @abstract-foundation/agw-react | latest | Abstract Global Wallet |
| Tailwind CSS | 3 | Styling |
| Framer Motion | — | Animations |
| @vercel/analytics | — | Page view tracking |

### Repository

- **GitHub:** `https://github.com/semtorium/absworldpool` (public — required for Vercel free tier)
- **Local path:** `AbsWorldPool/frontend/`
- **Branch:** `main` (auto-deploys to Vercel on every push)

### Key Files

```
frontend/
├── app/
│   ├── page.tsx              ← Root page: loading → terms → modals → app
│   ├── layout.tsx            ← Providers, Analytics, global CSS
│   ├── admin/page.tsx        ← Owner-only admin panel (viem direct, no wagmi)
│   └── terms/page.tsx        ← Full Terms of Use & Privacy Policy
├── components/
│   ├── LoadingScreen.tsx     ← Platform-themed loader (rings + progress bar)
│   ├── TermsModal.tsx        ← First-visit ToS gate (localStorage: tos_accepted)
│   ├── Navbar.tsx            ← Sticky nav, tab switcher, ProfileDrawer
│   ├── HoldersTicker.tsx     ← Top 10 NFT holders marquee (enters from right)
│   ├── PrizeCounter.tsx      ← Hero prize pool display (gold/purple by tab)
│   ├── NationsCupPage.tsx    ← Country grid, ALL/My NFTs filter, countdown
│   ├── CountryCard.tsx       ← Individual country card with mint UI
│   ├── MintSuccessModal.tsx  ← Confetti popup on successful mint
│   ├── NationsCupWinnerModal.tsx  ← Post-finalization NC winner popup + claim
│   ├── TopScorerWinnerModal.tsx   ← Post-finalization TS winner popup + claim
│   ├── TopScorerPage.tsx     ← Ticket buy + player voting
│   ├── GroupsPage.tsx        ← Groups tab + Bracket tab (R32→Final)
│   ├── LeaderboardPage.tsx   ← NFT+vote ranked leaderboard (mock data)
│   └── ActivityPage.tsx      ← On-chain live event feed (30s refresh)
├── lib/
│   ├── config.ts             ← CONTRACT_ADDRESS, prices, TOP_SCORER_PLAYERS (50)
│   ├── countries.ts          ← 48 countries: id, name, flagCode, group, favoriteRank
│   ├── abi.ts                ← Full contract ABI
│   ├── i18n.ts               ← 6 languages: EN, TR, KO, ES, PT, AR
│   └── LanguageContext.tsx   ← Auto-detect + manual override, RTL for Arabic
└── report.mjs                ← Community test report generator (node report.mjs)
```

### Page Flow

```
Page load
  └─ LoadingScreen (waits for getAllCountryPools RPC, 5s max fallback)
       └─ localStorage "tos_accepted"?
            ├─ NO  → TermsModal (checkbox + accept)
            └─ YES → check finalization state
                       ├─ ncFinalized && !nc_claimed_<addr>  → NationsCupWinnerModal
                       │    └─ on close → tsFinalized && !ts_claimed_<addr> → TopScorerWinnerModal
                       └─ App renders
```

### Tab Structure

| Tab ID | Name | Auth Required | PrizeCounter |
|--------|------|---------------|-------------|
| `nations` | World Cup 26 | No | Gold (total locked pool) |
| `scorer` | Top Scorer | No | Purple (scorer pool only) |
| `groups` | Groups | No | Hidden |
| `leaderboard` | Leaderboard | Yes (wallet) | Hidden |
| `activity` | Activity | Yes (wallet) | Hidden |

### Wallet Integration

- **Main site:** `useLoginWithAbstract()` from `@abstract-foundation/agw-react` — Abstract Global Wallet
- **Admin panel:** viem directly via EIP-6963 wallet discovery (MetaMask, Rabby, etc.) — intentionally bypasses AGW
- **DO NOT** nest `<WagmiProvider>` inside `<AbstractWalletProvider>` — it overrides the Abstract connector context

### localStorage Keys

| Key | Value | Description |
|-----|-------|-------------|
| `tos_accepted` | `"true"` | Terms accepted, never show again |
| `abs_active_tab` | tab id | Last active tab, restored on load |
| `abs_lang` | lang code | Manual language override |
| `nc_claimed_<address>` | `"true"` | NC rewards claimed for this wallet |
| `ts_claimed_<address>` | `"true"` | TS rewards claimed for this wallet |

> **Note:** `nc_claimed_` / `ts_claimed_` keys use lowercase wallet address. These are checked at render time (not just on init) to handle async wallet reconnection.

### Winner Modal Logic

```
showNcWinner (state) && ncFinalized && winningCountryId !== undefined && !isNcClaimed (memo)
  → NationsCupWinnerModal renders

On NC modal close → check tsFinalized && !tsClaimed → open TopScorerWinnerModal

isNcClaimed = useMemo(() => localStorage.getItem(`nc_claimed_${address.toLowerCase()}`), [address])
```

The `useMemo` re-evaluates when `address` changes — prevents the modal from reappearing after page refresh while the wallet reconnects asynchronously.

### Internationalization

6 languages with auto-detection on first visit:

| Code | Language |
|------|----------|
| `en` | English |
| `tr` | Türkçe |
| `ko` | 한국어 |
| `es` | Español |
| `pt` | Português |
| `ar` | العربية (RTL) |

Auto-detection reads `navigator.languages` and maps to supported codes. Manual selection saved to `localStorage`. Arabic sets `document.documentElement.dir = "rtl"`.

### Report Script

```bash
cd frontend
node report.mjs > test_raporu.txt
```

Reads all on-chain data via viem: mints, votes, pools, claims, finalization state, integrity checks. Output: text report with financials, country breakdown, player votes, event log.

---

## 5. Infrastructure & Deployment

### Hosting

| Service | Role |
|---------|------|
| **Vercel** (Free tier) | Frontend hosting, auto-deploy on push to `main` |
| **Cloudflare** | Domain registrar + DNS proxy for `absworldpool.xyz` |
| **GitHub** | Source code (must be **public** for Vercel free auto-deploy) |

### DNS

| Record | Type | Value | Proxy |
|--------|------|-------|-------|
| `@` | A | `216.198.79.1` | Proxied (Cloudflare) |
| `www` | CNAME | `894cca0acb43cdf7.vercel-dns-017.com` | DNS only |

### Deploy Flow

```
1. Edit files in AbsWorldPool/frontend/
2. git add <files>
3. git commit -m "..."
4. git push origin main
   └─ Vercel detects push → builds → deploys in ~1-2 min
```

### Git Config (required)

```bash
git config user.email "semtorium@gmail.com"
git config user.name "semtorium"
```

Wrong author email → Vercel "Deployment Blocked" error (must match GitHub OAuth account).

### Smart Contract Deploy

```powershell
# From AbsWorldPool/ directory
& "$env:USERPROFILE\.foundry\bin\forge.exe" script script/Deploy.s.sol --rpc-url abstract_testnet --broadcast
```

Required `.env` variables in `AbsWorldPool/`:

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Deployer wallet private key |
| `DEV_WALLET` | Address receiving 20% dev cut + 5% fees |
| `BASE_URI` | IPFS/CDN base URI ending with `/` |

After deploy → update `CONTRACT_ADDRESS` in `frontend/lib/config.ts` and `frontend/report.mjs` → push → Vercel auto-deploys.

### Contracts Repo

The `AbsWorldPool/` Foundry project has **no git remote** and no commits — it exists only locally. Only the `frontend/` directory is tracked in GitHub.

---

## 6. Security Model

### Contract Security

- **ReentrancyGuard** on all state-mutating user functions
- **onlyOwner** on all admin functions
- **whenNotPaused** modifier — owner can halt minting/voting in emergencies (claims still work)
- **No upgradeability** — contract is immutable after deploy
- **No oracle dependency** — all state changes are manual (owner calls finalize)
- `advanceStage` guarded: cannot be called after finalization; loser ≠ winner enforced
- Emergency routing in `advanceStage`: if winner has 0 supply, funds route to devWallet instead of getting locked

### Unclaimed Funds

30-day recovery window after each finalization:
- `withdrawUnclaimedNationsCup()` — sweeps remaining pool to devWallet
- `withdrawUnclaimedTopScorer()` — same for scorer pool

If `finalizeTopScorer` is called with a player who got 0 votes: no one can claim, pool stays locked until 30-day sweep.

### Frontend Security

- Admin panel (`/admin`) reads `owner()` from contract on load. Non-owner wallets see access denied — **does NOT reveal the owner address** to prevent targeted attacks.
- Admin panel bypasses AGW wallet to avoid interference with main app context.
- `ensureChain()` called before every admin write — forces wallet to Abstract Testnet (chainId `0x2B74`) before sending transactions.

### GitHub Token

- Old token (revoked) — do not use.
- For new sessions needing push: generate a fine-grained PAT (Contents: Read & Write) and set:
  ```bash
  git remote set-url origin https://<TOKEN>@github.com/semtorium/absworldpool.git
  ```

---

## 7. Mainnet Launch Checklist

### Before Deploy

- [ ] Generate new deployer wallet private key (never reuse testnet key)
- [ ] Prepare mainnet dev wallet address (separate from deployer)
- [ ] Create Midjourney artwork for all 48 countries
- [ ] Upload images to IPFS (Pinata recommended)
- [ ] Prepare IPFS base URI: `https://gateway.pinata.cloud/ipfs/<CID>/`
- [ ] Prepare 48 JSON metadata files in `AbsWorldPool/metadata/json/`
- [ ] Fund deployer wallet with enough ETH for gas

### Deploy

```powershell
# Update .env: PRIVATE_KEY, DEV_WALLET, BASE_URI
& "$env:USERPROFILE\.foundry\bin\forge.exe" script script/Deploy.s.sol --rpc-url abstract_mainnet --broadcast
```

### After Deploy

- [ ] Update `CONTRACT_ADDRESS` in `frontend/lib/config.ts`
- [ ] Update `CONTRACT` in `frontend/report.mjs`
- [ ] Call `transferOwnership(<cold-wallet-or-multisig>)` — deployer should NOT be permanent owner
- [ ] Push frontend → verify Vercel deploy
- [ ] Verify contract on explorer (`--verify` flag or manual)
- [ ] Test one mint on mainnet before announcing
- [ ] Confirm NFTs appear on OpenSea (Abstract Chain supported)

---

## 8. Key Design Decisions

### No Mint Limit
Per-wallet limit removed. Pro-rata system ensures fair rewards regardless of quantity minted — no advantage to buying more beyond proportional return.

### Prize Pool Double-Count Prevention
`totalLockedPrizePool` accumulates both nations cup AND top scorer pool shares in the same variable. Never add `topScorerPoolBalance` to it for display — that double-counts the scorer portion.

### HoldersTicker Direction
Track starts with a `100vw` spacer so items enter from the right edge of the screen at t=0. Animation runs `translateX(0) → translateX(-50%)` on a doubled list. Removing the spacer causes items to appear at the left edge immediately.

### Arabic RTL Persistence
`document.documentElement.dir` must be set in the `useEffect` that restores language from `localStorage`, not just in the `setLang` function — the restore path skips `setLang`.

### Admin Panel Wallet Isolation
Admin panel uses viem directly with EIP-6963 wallet discovery, completely bypassing the `AbstractWalletProvider` wagmi context. This prevents any interference between admin transactions and the main site's wallet state.

### finalTopScorerPool Snapshot
The snapshot taken at `finalizeTopScorer` explicitly excludes the refundable portion of unused tickets:
```
finalTopScorerPool = topScorerPoolBalance - (totalUnusedTickets × 80% of TICKET_PRICE)
```
This ensures correct voters split only the "voted-in" portion, while unused ticket holders can separately reclaim their pool share via `refundUnusedTickets()`.

### Winner Modal Async Wallet Fix
On page refresh, Abstract Global Wallet reconnects asynchronously. If `modalInitRef` ran before address loaded, it would check localStorage with an empty address key and incorrectly re-show the winner modal. Fixed by computing `isNcClaimed`/`isTsClaimed` as `useMemo([address])` and using them as render conditions in addition to `showNcWinner` state.

### ERC-4906 Metadata Refresh
`setBaseURI` emits `BatchMetadataUpdate(1, 48)` — the ERC-4906 standard signal. OpenSea and other marketplaces listen for this event and automatically refresh NFT metadata without manual intervention.
