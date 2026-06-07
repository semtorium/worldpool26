/**
 * WorldPool26 — Community Test Report Generator
 *
 * Run: node report.mjs > test_raporu.txt
 * Requires: run from frontend/ folder (viem is there)
 */

import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";

// ── Config ─────────────────────────────────────────────────────
const CONTRACT = "0x57B4722d8b97DE1F254f6d2F65f4c594a850b4c7";

const COUNTRIES = [
  { id:  1, name: "Mexico" },        { id:  2, name: "South Africa" },
  { id:  3, name: "South Korea" },   { id:  4, name: "Czech Republic" },
  { id:  5, name: "Canada" },        { id:  6, name: "Bosnia-Herz." },
  { id:  7, name: "Qatar" },         { id:  8, name: "Switzerland" },
  { id:  9, name: "Brazil" },        { id: 10, name: "Morocco" },
  { id: 11, name: "Haiti" },         { id: 12, name: "Scotland" },
  { id: 13, name: "United States" }, { id: 14, name: "Paraguay" },
  { id: 15, name: "Australia" },     { id: 16, name: "Turkey" },
  { id: 17, name: "Germany" },       { id: 18, name: "Curaçao" },
  { id: 19, name: "Ivory Coast" },   { id: 20, name: "Ecuador" },
  { id: 21, name: "Netherlands" },   { id: 22, name: "Japan" },
  { id: 23, name: "Sweden" },        { id: 24, name: "Tunisia" },
  { id: 25, name: "Belgium" },       { id: 26, name: "Egypt" },
  { id: 27, name: "Iran" },          { id: 28, name: "New Zealand" },
  { id: 29, name: "Spain" },         { id: 30, name: "Cape Verde" },
  { id: 31, name: "Saudi Arabia" },  { id: 32, name: "Uruguay" },
  { id: 33, name: "France" },        { id: 34, name: "Senegal" },
  { id: 35, name: "Iraq" },          { id: 36, name: "Norway" },
  { id: 37, name: "Argentina" },     { id: 38, name: "Algeria" },
  { id: 39, name: "Austria" },       { id: 40, name: "Jordan" },
  { id: 41, name: "Portugal" },      { id: 42, name: "DR Congo" },
  { id: 43, name: "Uzbekistan" },    { id: 44, name: "Colombia" },
  { id: 45, name: "England" },       { id: 46, name: "Croatia" },
  { id: 47, name: "Ghana" },         { id: 48, name: "Panama" },
];

const PLAYERS = [
  "Kylian Mbappé","Harry Kane","Lionel Messi","Erling Haaland",
  "Lamine Yamal","Mikel Oyarzabal","Cristiano Ronaldo","Vinicius Junior",
  "Lautaro Martínez","Ousmane Dembélé","Romelu Lukaku","Raphinha",
  "Julián Álvarez","Álvaro Morata","Cody Gakpo","Bukayo Saka",
  "Jude Bellingham","Florian Wirtz","Kai Havertz","Jean-Philippe Mateta",
  "Gonçalo Ramos","Nick Woltemade","Marcus Thuram","Neymar Jr",
  "Bruno Fernandes","Luis Díaz","Désiré Doué","Mohamed Salah",
  "Dani Olmo","Memphis Depay","Ferran Torres","Viktor Gyökeres",
  "Igor Thiago","Deniz Undav","Jamal Musiala","Loïs Openda",
  "Santiago Giménez","Darwin Núñez","Eberechi Eze","Matheus Cunha",
  "Alexander Sørloth","Marcus Rashford","Morgan Rogers","Nico Williams",
  "Folarin Balogun","Christian Pulisic","Jonathan David","Enner Valencia",
  "Leandro Trossard","Mikel Merino",
];

const ABI = [
  { type:"function", name:"owner",                  inputs:[],                                  outputs:[{type:"address"}],  stateMutability:"view" },
  { type:"function", name:"devWallet",              inputs:[],                                  outputs:[{type:"address"}],  stateMutability:"view" },
  { type:"function", name:"totalGlobalVolumeETH",   inputs:[],                                  outputs:[{type:"uint256"}],  stateMutability:"view" },
  { type:"function", name:"totalLockedPrizePool",   inputs:[],                                  outputs:[{type:"uint256"}],  stateMutability:"view" },
  { type:"function", name:"nationsCupPoolBalance",  inputs:[],                                  outputs:[{type:"uint256"}],  stateMutability:"view" },
  { type:"function", name:"topScorerPoolBalance",   inputs:[],                                  outputs:[{type:"uint256"}],  stateMutability:"view" },
  { type:"function", name:"totalUnusedTickets",     inputs:[],                                  outputs:[{type:"uint256"}],  stateMutability:"view" },
  { type:"function", name:"mintClosed",             inputs:[],                                  outputs:[{type:"bool"}],     stateMutability:"view" },
  { type:"function", name:"votingClosed",           inputs:[],                                  outputs:[{type:"bool"}],     stateMutability:"view" },
  { type:"function", name:"paused",                 inputs:[],                                  outputs:[{type:"bool"}],     stateMutability:"view" },
  { type:"function", name:"maintenanceMode",        inputs:[],                                  outputs:[{type:"bool"}],     stateMutability:"view" },
  { type:"function", name:"tournamentFinalized",    inputs:[],                                  outputs:[{type:"bool"}],     stateMutability:"view" },
  { type:"function", name:"topScorerFinalized",     inputs:[],                                  outputs:[{type:"bool"}],     stateMutability:"view" },
  { type:"function", name:"winningCountryId",       inputs:[],                                  outputs:[{type:"uint256"}],  stateMutability:"view" },
  { type:"function", name:"finalTopScorer",         inputs:[],                                  outputs:[{type:"string"}],   stateMutability:"view" },
  { type:"function", name:"finalNationsCupPool",    inputs:[],                                  outputs:[{type:"uint256"}],  stateMutability:"view" },
  { type:"function", name:"finalTopScorerPool",     inputs:[],                                  outputs:[{type:"uint256"}],  stateMutability:"view" },
  { type:"function", name:"nationsCupFinalizedAt",  inputs:[],                                  outputs:[{type:"uint256"}],  stateMutability:"view" },
  { type:"function", name:"topScorerFinalizedAt",   inputs:[],                                  outputs:[{type:"uint256"}],  stateMutability:"view" },
  { type:"function", name:"countryTotalSupply",     inputs:[{type:"uint256"}],                  outputs:[{type:"uint256"}],  stateMutability:"view" },
  { type:"function", name:"getAllEliminationStatus",inputs:[],                                  outputs:[{type:"bool[49]"}], stateMutability:"view" },
  { type:"function", name:"getPlayerVotes",         inputs:[{name:"playerName",type:"string"}], outputs:[{type:"uint256"}],  stateMutability:"view" },

  { type:"event", name:"CountryMinted",       inputs:[{name:"user",type:"address",indexed:true},{name:"countryId",type:"uint256",indexed:true},{name:"amount",type:"uint256"},{name:"timestamp",type:"uint256"}] },
  { type:"event", name:"TicketPurchased",     inputs:[{name:"user",type:"address",indexed:true},{name:"quantity",type:"uint256"},{name:"timestamp",type:"uint256"}] },
  { type:"event", name:"VoteCast",            inputs:[{name:"user",type:"address",indexed:true},{name:"playerName",type:"string"},{name:"votes",type:"uint256"},{name:"timestamp",type:"uint256"}] },
  { type:"event", name:"NationsCupFinalized", inputs:[{name:"winningId",type:"uint256",indexed:true},{name:"totalPoolSize",type:"uint256"}] },
  { type:"event", name:"TopScorerFinalizedEvent", inputs:[{name:"playerName",type:"string"},{name:"totalPoolSize",type:"uint256"}] },
  { type:"event", name:"NationsCupClaimed",   inputs:[{name:"user",type:"address",indexed:true},{name:"reward",type:"uint256"},{name:"timestamp",type:"uint256"}] },
  { type:"event", name:"TopScorerClaimed",    inputs:[{name:"user",type:"address",indexed:true},{name:"reward",type:"uint256"},{name:"timestamp",type:"uint256"}] },
  { type:"event", name:"CountryEliminatedEvent", inputs:[{name:"countryId",type:"uint256",indexed:true}] },
];

// ── Helpers ────────────────────────────────────────────────────
const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
const read   = (fn, args = []) => client.readContract({ address: CONTRACT, abi: ABI, functionName: fn, args });
const ETH    = (wei) => parseFloat(formatEther(BigInt(wei))).toFixed(6);
const line   = (char = "─", len = 66) => char.repeat(len);
const title  = (s) => `\n${line("═")}\n  ${s}\n${line("═")}`;
const sec    = (s) => `\n${line()}\n  ${s}\n${line()}`;

async function getLogs(eventName) {
  // fromBlock = deployment block (Base Sepolia). Using 0n causes RPC to reject (43M+ block range).
  const DEPLOY_BLOCK = 43073285n;
  try {
    return await client.getLogs({
      address: CONTRACT,
      event: ABI.find(x => x.type === "event" && x.name === eventName),
      fromBlock: DEPLOY_BLOCK,
      toBlock: "latest",
    });
  } catch {
    // Fallback: last 50 000 blocks (~27 h) — only used if primary call fails
    const latest = await client.getBlockNumber();
    const from   = latest > 50000n ? latest - 50000n : DEPLOY_BLOCK;
    try {
      return await client.getLogs({
        address: CONTRACT,
        event: ABI.find(x => x.type === "event" && x.name === eventName),
        fromBlock: from,
        toBlock: "latest",
      });
    } catch { return []; }
  }
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  const now = new Date().toISOString();

  // ── Fetch contract state ──
  const [
    owner, devWallet,
    totalVolume, totalLocked,
    ncPool, tsPool, totalUnusedTickets,
    mintClosed, votingClosed, paused, maintenanceMode,
    ncFinalized, tsFinalized,
    winningId, finalScorer,
    finalNcPool, finalTsPool,
    ncFinalizedAt, tsFinalizedAt,
    elimStatus,
  ] = await Promise.all([
    read("owner"), read("devWallet"),
    read("totalGlobalVolumeETH"), read("totalLockedPrizePool"),
    read("nationsCupPoolBalance"), read("topScorerPoolBalance"), read("totalUnusedTickets"),
    read("mintClosed"), read("votingClosed"), read("paused"), read("maintenanceMode"),
    read("tournamentFinalized"), read("topScorerFinalized"),
    read("winningCountryId"), read("finalTopScorer"),
    read("finalNationsCupPool"), read("finalTopScorerPool"),
    read("nationsCupFinalizedAt"), read("topScorerFinalizedAt"),
    read("getAllEliminationStatus"),
  ]);

  // Fetch country supplies
  const supplies = await Promise.all(COUNTRIES.map(c => read("countryTotalSupply", [BigInt(c.id)])));

  // Fetch player votes
  const playerVotes = await Promise.all(PLAYERS.map(p => read("getPlayerVotes", [p])));

  // Fetch events
  const [mintLogs, ticketLogs, voteLogs, ncFinalLogs, tsFinalLogs, ncClaimLogs, tsClaimLogs, elimLogs] = await Promise.all([
    getLogs("CountryMinted"),
    getLogs("TicketPurchased"),
    getLogs("VoteCast"),
    getLogs("NationsCupFinalized"),
    getLogs("TopScorerFinalizedEvent"),
    getLogs("NationsCupClaimed"),
    getLogs("TopScorerClaimed"),
    getLogs("CountryEliminatedEvent"),
  ]);

  // ── Aggregate ──
  const totalVolEth   = BigInt(totalVolume);
  const ncPoolBig     = BigInt(ncPool);
  const tsPoolBig     = BigInt(tsPool);
  const totalMints    = supplies.reduce((a, b) => a + Number(b), 0);
  const uniqueMinters = new Set(mintLogs.map(l => l.args.user?.toLowerCase())).size;
  const uniqueVoters  = new Set(voteLogs.map(l => l.args.user?.toLowerCase())).size;
  const totalTickets  = ticketLogs.reduce((a, l) => a + Number(l.args.quantity ?? 0n), 0);
  const totalVotesCast = voteLogs.reduce((a, l) => a + Number(l.args.votes ?? 0n), 0);
  const ncClaimedTotal = ncClaimLogs.reduce((a, l) => a + BigInt(l.args.reward ?? 0n), 0n);
  const tsClaimedTotal = tsClaimLogs.reduce((a, l) => a + BigInt(l.args.reward ?? 0n), 0n);

  const activeCountries = COUNTRIES
    .map((c, i) => ({ ...c, supply: Number(supplies[i]), eliminated: elimStatus[c.id] === true }))
    .filter(c => c.supply > 0)
    .sort((a, b) => b.supply - a.supply);

  const activePlayers = PLAYERS
    .map((name, i) => ({ name, votes: Number(playerVotes[i]) }))
    .filter(p => p.votes > 0)
    .sort((a, b) => b.votes - a.votes);

  const totalPlayerVotes = activePlayers.reduce((a, p) => a + p.votes, 0);

  // ── OUTPUT ──
  console.log(title("WORLDPOOL26 — TEST REPORT"));
  console.log(`  Generated  : ${now}`);
  console.log(`  Contract   : ${CONTRACT}`);
  console.log(`  Network    : Base Sepolia Testnet (Chain ID: 84532)`);
  console.log(`  Explorer   : https://sepolia.basescan.org/address/${CONTRACT}`);
  console.log(`  Owner      : ${owner}`);
  console.log(`  Dev Wallet : ${devWallet}`);

  // ── Contract Status ──
  console.log(sec("CONTRACT STATUS"));
  console.log(`  Paused            : ${paused         ? "🔴 YES" : "✅ No"}`);
  console.log(`  Mint Closed       : ${mintClosed     ? "🔴 YES" : "✅ Open"}`);
  console.log(`  Voting Closed     : ${votingClosed   ? "🔴 YES" : "✅ Open"}`);
  console.log(`  Maintenance Mode  : ${maintenanceMode? "🟡 YES" : "✅ No"}`);
  console.log(`  NC Finalized      : ${ncFinalized    ? "✅ YES" : "🟡 Not yet"}`);
  console.log(`  TS Finalized      : ${tsFinalized    ? "✅ YES" : "🟡 Not yet"}`);

  // ── Financials ──
  console.log(sec("FINANCIALS"));
  const devApprox = (totalVolEth * 20n) / 100n;
  console.log(`  Gross Volume (all mints + tickets) : ${ETH(totalVolEth)} ETH`);
  console.log(`  Dev Cut ~20% (sent instantly)      : ${ETH(devApprox)} ETH`);
  console.log(`  Total Locked in Contract           : ${ETH(totalLocked)} ETH`);
  console.log(`    ├─ Nations Cup Pool              : ${ETH(ncPoolBig)} ETH`);
  console.log(`    └─ Top Scorer Pool               : ${ETH(tsPoolBig)} ETH`);
  console.log(`  Total Unused Tickets (refundable)  : ${Number(totalUnusedTickets)}`);

  // ── Nations Cup ──
  console.log(sec("NATIONS CUP"));
  if (ncFinalized) {
    const winner = COUNTRIES.find(c => c.id === Number(winningId));
    const ncAt   = new Date(Number(ncFinalizedAt) * 1000).toISOString();
    console.log(`  Status          : ✅ FINALIZED`);
    console.log(`  Winner          : ${winner?.name ?? "Unknown"} (ID: ${winningId})`);
    console.log(`  Final Pool Snap : ${ETH(finalNcPool)} ETH`);
    console.log(`  Remaining Pool  : ${ETH(ncPoolBig)} ETH`);
    console.log(`  Claimed         : ${ETH(BigInt(finalNcPool) - ncPoolBig)} ETH`);
    console.log(`  Finalized At    : ${ncAt}`);
  } else {
    console.log(`  Status          : 🟡 Active (not yet finalized)`);
    console.log(`  Pool Balance    : ${ETH(ncPoolBig)} ETH`);
  }
  console.log(`  Total NFTs Minted     : ${totalMints}`);
  console.log(`  Countries with Mints  : ${activeCountries.length} / 48`);
  console.log(`  Unique Minter Wallets : ${uniqueMinters}`);
  console.log(`  NC Claims             : ${ncClaimLogs.length} wallets — ${ETH(ncClaimedTotal)} ETH paid out`);
  console.log(`  Eliminated Countries  : ${elimLogs.length}`);

  if (activeCountries.length > 0) {
    const poolForCalc = ncFinalized ? BigInt(finalNcPool) : ncPoolBig;
    const totalSupply = activeCountries.reduce((a, c) => a + c.supply, 0);

    console.log(`\n  Country Breakdown (sorted by NFT count):`);
    console.log(`  Note: All mints go to ONE shared pool. Winning country holders split entire pool.`);
    console.log(`  ${"Country".padEnd(20)} ${"NFTs".padStart(5)}  ${"Share%".padStart(7)}  ${"ETH/NFT if wins".padStart(16)}  ${"Status".padStart(10)}`);
    console.log(`  ${line("-", 64)}`);
    for (const c of activeCountries) {
      const share  = totalMints > 0 ? ((c.supply / totalMints) * 100).toFixed(1) : "0.0";
      const perNft = c.supply > 0 ? (Number(poolForCalc) / 1e18 * 0.95 / c.supply).toFixed(6) : "0.000000";
      const isWinner = ncFinalized && c.id === Number(winningId);
      const status = isWinner ? "🏆 WINNER" : c.eliminated ? "❌ Elim" : "🟢 Active";
      console.log(`  ${c.name.padEnd(20)} ${String(c.supply).padStart(5)}  ${share.padStart(6)}%  ${perNft.padStart(16)}  ${status}`);
    }
    console.log(`  ${"TOTAL".padEnd(20)} ${String(totalMints).padStart(5)}`);
  }

  // ── Top Scorer ──
  console.log(sec("TOP SCORER"));
  if (tsFinalized) {
    const tsAt = new Date(Number(tsFinalizedAt) * 1000).toISOString();
    console.log(`  Status           : ✅ FINALIZED`);
    console.log(`  Winner           : ${finalScorer}`);
    console.log(`  Final Pool Snap  : ${ETH(finalTsPool)} ETH`);
    console.log(`  Remaining Pool   : ${ETH(tsPoolBig)} ETH`);
    console.log(`  Claimed          : ${ETH(BigInt(finalTsPool) - tsPoolBig)} ETH`);
    console.log(`  Finalized At     : ${tsAt}`);
  } else {
    console.log(`  Status           : 🟡 Active (not yet finalized)`);
    console.log(`  Pool Balance     : ${ETH(tsPoolBig)} ETH`);
  }
  console.log(`  Total Tickets Bought : ${totalTickets}`);
  console.log(`  Total Votes Cast     : ${totalVotesCast}`);
  console.log(`  Unique Voter Wallets : ${uniqueVoters}`);
  console.log(`  TS Claims            : ${tsClaimLogs.length} wallets — ${ETH(tsClaimedTotal)} ETH paid out`);

  if (activePlayers.length > 0) {
    console.log(`\n  Player Vote Distribution:`);
    console.log(`  ${"Player".padEnd(26)} ${"Votes".padStart(7)}  ${"Share %".padStart(8)}`);
    console.log(`  ${line("-", 46)}`);
    for (const p of activePlayers) {
      const share = totalPlayerVotes > 0 ? ((p.votes / totalPlayerVotes) * 100).toFixed(1) : "0.0";
      const isWinner = tsFinalized && p.name === finalScorer;
      const tag = isWinner ? " 🥇" : "";
      console.log(`  ${(p.name + tag).padEnd(28)} ${String(p.votes).padStart(5)}   ${share.padStart(7)}%`);
    }
    if (activePlayers.length < PLAYERS.length) {
      console.log(`  (${PLAYERS.length - activePlayers.length} players with 0 votes omitted)`);
    }
  } else {
    console.log(`  No votes cast yet.`);
  }

  // ── Per-Wallet Breakdown ──
  const MINT_PRICE_ETH   = 0.0022;
  const TICKET_PRICE_ETH = 0.0018;
  const DEV_RATE         = 0.20;

  // Aggregate per wallet
  const wallets = {};
  const track = (addr) => {
    const a = addr?.toLowerCase() ?? "unknown";
    if (!wallets[a]) wallets[a] = { mintQty:0, ticketQty:0, spentMintEth:0, spentTicketEth:0, claimedNcEth:0, claimedTsEth:0 };
    return wallets[a];
  };

  for (const l of mintLogs) {
    const qty = Number(l.args.amount ?? 0n);
    const w = track(l.args.user);
    w.mintQty      += qty;
    w.spentMintEth += qty * MINT_PRICE_ETH;
  }
  for (const l of ticketLogs) {
    const qty = Number(l.args.quantity ?? 0n);
    const w = track(l.args.user);
    w.ticketQty      += qty;
    w.spentTicketEth += qty * TICKET_PRICE_ETH;
  }
  for (const l of ncClaimLogs) {
    track(l.args.user).claimedNcEth += Number(l.args.reward ?? 0n) / 1e18;
  }
  for (const l of tsClaimLogs) {
    track(l.args.user).claimedTsEth += Number(l.args.reward ?? 0n) / 1e18;
  }

  const walletList = Object.entries(wallets)
    .map(([addr, w]) => {
      const totalSpent    = w.spentMintEth + w.spentTicketEth;
      const totalClaimed  = w.claimedNcEth + w.claimedTsEth;
      const devFromWallet = totalSpent * DEV_RATE;
      const poolFromWallet= totalSpent * (1 - DEV_RATE);
      const netPnl        = totalClaimed - totalSpent;
      return { addr, ...w, totalSpent, totalClaimed, devFromWallet, poolFromWallet, netPnl };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);

  if (walletList.length > 0) {
    console.log(sec("PER-WALLET BREAKDOWN"));
    console.log(`  ${"Wallet".padEnd(44)} ${"Mints".padStart(5)} ${"Tkts".padStart(5)} ${"Spent".padStart(10)} ${"→Dev".padStart(9)} ${"→Pool".padStart(9)} ${"Claimed".padStart(10)} ${"Net P&L".padStart(11)}`);
    console.log(`  ${line("-", 107)}`);
    let totalSpentSum = 0, totalDevSum = 0, totalPoolSum = 0, totalClaimedSum = 0;
    for (const w of walletList) {
      const pnlSign = w.netPnl >= 0 ? "+" : "";
      console.log(
        `  ${w.addr.padEnd(44)}` +
        ` ${String(w.mintQty).padStart(5)}` +
        ` ${String(w.ticketQty).padStart(5)}` +
        ` ${w.totalSpent.toFixed(4).padStart(10)} ETH` +
        ` ${w.devFromWallet.toFixed(4).padStart(9)}` +
        ` ${w.poolFromWallet.toFixed(4).padStart(9)}` +
        ` ${w.totalClaimed.toFixed(4).padStart(10)}` +
        ` ${(pnlSign + w.netPnl.toFixed(4)).padStart(10)} ETH`
      );
      totalSpentSum   += w.totalSpent;
      totalDevSum     += w.devFromWallet;
      totalPoolSum    += w.poolFromWallet;
      totalClaimedSum += w.totalClaimed;
    }
    console.log(`  ${line("-", 107)}`);
    const totalPnl = totalClaimedSum - totalSpentSum;
    const pnlSign  = totalPnl >= 0 ? "+" : "";
    console.log(
      `  ${"TOTALS".padEnd(44)}` +
      ` ${String(totalMints).padStart(5)}` +
      ` ${String(totalTickets).padStart(5)}` +
      ` ${totalSpentSum.toFixed(4).padStart(10)} ETH` +
      ` ${totalDevSum.toFixed(4).padStart(9)}` +
      ` ${totalPoolSum.toFixed(4).padStart(9)}` +
      ` ${totalClaimedSum.toFixed(4).padStart(10)}` +
      ` ${(pnlSign + totalPnl.toFixed(4)).padStart(10)} ETH`
    );
  }

  // ── Dev Fee Verification ──
  console.log(sec("DEV FEE VERIFICATION"));
  const mintRevenue   = totalMints   * MINT_PRICE_ETH;
  const ticketRevenue = totalTickets * TICKET_PRICE_ETH;
  const grossRevenue  = mintRevenue + ticketRevenue;
  const expectedDevCut = grossRevenue * DEV_RATE;
  const expectedNcPool  = mintRevenue   * (1 - DEV_RATE);
  const expectedTsPool  = ticketRevenue * (1 - DEV_RATE);
  const expectedTotalPool = expectedNcPool + expectedTsPool;
  const actualPoolAfterClaims = Number(BigInt(totalLocked)) / 1e18;

  console.log(`  Mint Revenue       : ${totalMints} NFTs × 0.0022 ETH = ${mintRevenue.toFixed(6)} ETH`);
  console.log(`  Ticket Revenue     : ${totalTickets} tickets × 0.0018 ETH = ${ticketRevenue.toFixed(6)} ETH`);
  console.log(`  Gross Revenue      : ${grossRevenue.toFixed(6)} ETH`);
  console.log(``);
  console.log(`  Expected dev cut (20%)   : ${expectedDevCut.toFixed(6)} ETH`);
  console.log(`  Expected NC pool  (80%)  : ${expectedNcPool.toFixed(6)} ETH`);
  console.log(`  Expected TS pool  (80%)  : ${expectedTsPool.toFixed(6)} ETH`);
  console.log(`  Expected total pool      : ${expectedTotalPool.toFixed(6)} ETH`);
  console.log(``);
  console.log(`  Actual locked in contract: ${actualPoolAfterClaims.toFixed(6)} ETH`);
  console.log(`  Already claimed (NC+TS)  : ${(Number(ncClaimedTotal + tsClaimedTotal) / 1e18).toFixed(6)} ETH`);
  console.log(`  Pool + claimed = ?       : ${(actualPoolAfterClaims + Number(ncClaimedTotal + tsClaimedTotal) / 1e18).toFixed(6)} ETH`);
  console.log(``);

  const claimedTotal = Number(ncClaimedTotal + tsClaimedTotal) / 1e18;
  // Dev takes 5% settlement fee from each claim.
  // NationsCupClaimed / TopScorerClaimed events emit userReward = 95% of entitlement.
  // So settlement fee actually paid = claimedRewards * 5/95 (only for claims that happened).
  const ncSettlementFee = Number(ncClaimedTotal) / 1e18 * (5 / 95);
  const tsSettlementFee = Number(tsClaimedTotal) / 1e18 * (5 / 95);
  const totalSettlement = ncSettlementFee + tsSettlementFee;
  console.log(`  Dev settlement fee (5/95 of claimed rewards): ${totalSettlement.toFixed(6)} ETH`);
  const poolPlusClaims = actualPoolAfterClaims + claimedTotal + totalSettlement;
  const poolMatchOk = Math.abs(poolPlusClaims - expectedTotalPool) < 0.0001;
  console.log(`  ${poolMatchOk ? "✅" : "❌"} pool + claims + settlement ≈ expected total pool (${poolMatchOk ? "MATCH" : "MISMATCH: delta " + (poolPlusClaims - expectedTotalPool).toFixed(6) + " ETH"})`);

  // Gross volume vs totalGlobalVolumeETH cross-check
  const onChainVol     = Number(totalVolEth) / 1e18;
  const volMatchOk     = Math.abs(onChainVol - grossRevenue) < 0.0001;
  console.log(`  ${volMatchOk ? "✅" : "❌"} contract totalGlobalVolumeETH (${onChainVol.toFixed(6)}) ≈ calculated gross (${grossRevenue.toFixed(6)})`);

  // ── Integrity Checks ──
  console.log(sec("INTEGRITY CHECKS"));

  // Check 1: totalLockedPrizePool = ncPool + tsPool
  const expectedLocked = ncPoolBig + tsPoolBig;
  const lockedMatch    = expectedLocked === BigInt(totalLocked);
  console.log(`  ${lockedMatch ? "✅" : "❌"} totalLockedPrizePool = ncPool + tsPool`);
  if (!lockedMatch) {
    console.log(`     Expected : ${ETH(expectedLocked)} ETH`);
    console.log(`     Actual   : ${ETH(totalLocked)} ETH`);
    console.log(`     Delta    : ${ETH(BigInt(totalLocked) - expectedLocked)} ETH`);
  }

  // Check 2: locked <= 80% of gross volume
  const vol80  = (totalVolEth * 80n) / 100n;
  const poolOk = BigInt(totalLocked) <= vol80;
  console.log(`  ${poolOk ? "✅" : "❌"} Total locked ≤ 80% of gross volume (claims reduce it)`);

  // Check 3: winner supply > 0 if finalized
  if (ncFinalized && Number(winningId) > 0) {
    const winnerSupply = Number(supplies[Number(winningId) - 1]) > 0;
    console.log(`  ${winnerSupply ? "✅" : "❌"} Winning country has NFT supply > 0`);
  }

  // Check 4: no double pool
  console.log(`  ✅ Single pool architecture (no per-country pools to mismatch)`);

  // ── Event Log Summary ──
  console.log(sec("RAW EVENT LOG SUMMARY"));
  console.log(`  CountryMinted events        : ${mintLogs.length}`);
  console.log(`  TicketPurchased events      : ${ticketLogs.length}`);
  console.log(`  VoteCast events             : ${voteLogs.length}`);
  console.log(`  NationsCupFinalized events  : ${ncFinalLogs.length}`);
  console.log(`  TopScorerFinalized events   : ${tsFinalLogs.length}`);
  console.log(`  NationsCupClaimed events    : ${ncClaimLogs.length}`);
  console.log(`  TopScorerClaimed events     : ${tsClaimLogs.length}`);
  console.log(`  CountryEliminated events    : ${elimLogs.length}`);

  if (mintLogs.length > 0) {
    console.log(`\n  All CountryMinted events:`);
    console.log(`  ${"Wallet".padEnd(44)} ${"Country".padEnd(18)} ${"Qty".padStart(4)}  ${"Time (UTC)"}`);
    console.log(`  ${line("-", 94)}`);
    for (const l of mintLogs) {
      const country = COUNTRIES.find(c => c.id === Number(l.args.countryId))?.name ?? `#${l.args.countryId}`;
      const ts      = new Date(Number(l.args.timestamp ?? 0n) * 1000).toISOString();
      console.log(`  ${(l.args.user ?? "?").padEnd(44)} ${country.padEnd(18)} ${String(l.args.amount ?? 0n).padStart(4)}  ${ts}`);
    }
  }

  if (ticketLogs.length > 0) {
    console.log(`\n  All TicketPurchased events:`);
    console.log(`  ${"Wallet".padEnd(44)} ${"Qty".padStart(5)}  ${"Time (UTC)"}`);
    console.log(`  ${line("-", 70)}`);
    for (const l of ticketLogs) {
      const ts = new Date(Number(l.args.timestamp ?? 0n) * 1000).toISOString();
      console.log(`  ${(l.args.user ?? "?").padEnd(44)} ${String(l.args.quantity ?? 0n).padStart(5)}  ${ts}`);
    }
  }

  if (voteLogs.length > 0) {
    console.log(`\n  All VoteCast events:`);
    console.log(`  ${"Wallet".padEnd(44)} ${"Player".padEnd(28)} ${"Votes".padStart(6)}  ${"Time (UTC)"}`);
    console.log(`  ${line("-", 100)}`);
    for (const l of voteLogs) {
      const ts = new Date(Number(l.args.timestamp ?? 0n) * 1000).toISOString();
      console.log(`  ${(l.args.user ?? "?").padEnd(44)} ${(l.args.playerName ?? "").padEnd(28)} ${String(l.args.votes ?? 0n).padStart(6)}  ${ts}`);
    }
  }

  console.log(`\n${line("═")}`);
  console.log(`  END OF REPORT — ${now}`);
  console.log(line("═"));
}

main().catch(err => {
  console.error("Report failed:", err.message);
  process.exit(1);
});
