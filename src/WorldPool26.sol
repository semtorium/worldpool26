// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title WorldPool26 v6
/// @notice 2026 World Cup Web3 prediction platform on Base Chain.
///         Two parallel games: Nations Cup (ERC-1155 mint) + Top Scorer (ticket voting).
///         v6: Single main Nations Cup prize pool — eliminations no longer move funds.
///             Final champion's NFT holders split the entire accumulated pool.
contract WorldPool26 is ERC1155, ERC2981, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // ─────────────────────────────────────────────────────────────
    // Constants
    // ─────────────────────────────────────────────────────────────

    uint256 public constant MINT_PRICE    = 0.0022 ether;
    uint256 public constant TICKET_PRICE  = 0.0018 ether;
    uint256 public constant DEV_SHARE_BPS = 2000;  // 20% instant to devWallet
    uint256 public constant POOL_FEE_BPS  = 500;   // 5%  from prize pool at settlement
    uint96  public constant ROYALTY_BPS   = 500;   // 5%  EIP-2981 secondary sale royalty
    uint256 public constant MAX_COUNTRIES = 48;
    uint256 public constant UNCLAIMED_TIMEOUT = 15 days;

    // ─────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────

    address public devWallet;
    string  public baseURI;

    /// @notice Stops NFT minting only. Ticket purchases and votes remain open.
    bool public mintClosed;
    /// @notice Stops ticket purchases and voting only. Minting remains open.
    ///         Also set automatically when Top Scorer is finalized.
    bool public votingClosed;
    /// @notice Emergency stop — blocks mint, ticket purchases and votes.
    bool public paused;
    /// @notice Frontend-only flag: site UI reads this to show a maintenance overlay.
    ///         Does NOT block any on-chain interaction — users can still mint/claim directly.
    ///         Intentional design: contract state remains accessible; only the UI is gated.
    bool public maintenanceMode;

    // ─────────────────────────────────────────────────────────────
    // Mappings — Elimination tracking
    // ─────────────────────────────────────────────────────────────

    /// @notice True once a country has been officially eliminated from the tournament
    mapping(uint256 => bool) public countryEliminated;

    uint256 public totalGlobalVolumeETH;
    uint256 public totalLockedPrizePool;

    /// @notice Single shared pool for all Nations Cup mints.
    ///         Every mint contributes here regardless of country.
    ///         Final champion's NFT holders split this entire pool.
    uint256 public nationsCupPoolBalance;
    uint256 public topScorerPoolBalance;

    uint256 public winningCountryId;
    string  public finalTopScorer;

    bool public tournamentFinalized;
    bool public topScorerFinalized;

    uint256 public finalNationsCupPool;
    uint256 public finalTopScorerPool;

    uint256 public nationsCupFinalizedAt;
    uint256 public topScorerFinalizedAt;

    /// @notice Sum of all userUnusedTickets across all wallets — used for correct pool snapshot
    uint256 public totalUnusedTickets;

    // ─────────────────────────────────────────────────────────────
    // Mappings — Nations Cup
    // ─────────────────────────────────────────────────────────────

    mapping(uint256 => uint256) public countryTotalSupply;
    mapping(address => mapping(uint256 => uint256)) public userMintCount;

    // ─────────────────────────────────────────────────────────────
    // Mappings — Top Scorer
    // ─────────────────────────────────────────────────────────────

    mapping(bytes32 => uint256) public playerVoteCounts;
    mapping(address => mapping(bytes32 => uint256)) public userPlayerVotes;
    mapping(address => uint256) public userUnusedTickets;
    /// @notice True after a user has successfully claimed their Top Scorer reward.
    ///         Used as on-chain ground truth for cross-device "Already Claimed" display.
    mapping(address => bool) public topScorerHasClaimed;
    /// @notice True after a user has successfully claimed their Nations Cup reward.
    ///         Prevents double-claiming via secondary market token purchases.
    mapping(address => bool) public nationsCupHasClaimed;
    /// @notice Accumulated dev fees that failed to transfer instantly.
    ///         Owner can withdraw via withdrawPendingDev(). Prevents mint/claim DOS
    ///         if devWallet is temporarily unreachable (e.g. a contract wallet mid-upgrade).
    uint256 public pendingDevBalance;

    // ─────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────

    event CountryMinted(address indexed user, uint256 indexed countryId, uint256 amount, uint256 timestamp);
    event TicketPurchased(address indexed user, uint256 quantity, uint256 timestamp);
    event VoteCast(address indexed user, string playerName, uint256 votes, uint256 timestamp);
    event NationsCupFinalized(uint256 indexed winningId, uint256 totalPoolSize);
    event TopScorerFinalizedEvent(string playerName, uint256 totalPoolSize);
    event NationsCupClaimed(address indexed user, uint256 reward, uint256 timestamp);
    event TopScorerClaimed(address indexed user, uint256 reward, uint256 timestamp);
    event UnusedTicketsRefunded(address indexed user, uint256 ticketCount, uint256 refundAmount, uint256 timestamp);
    event UnclaimedNationsCupWithdrawn(uint256 amount, uint256 timestamp);
    event UnclaimedTopScorerWithdrawn(uint256 amount, uint256 timestamp);
    event PendingDevWithdrawn(uint256 amount, uint256 timestamp);
    event DevWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event BaseURIUpdated(string oldURI, string newURI);
    event MintClosedChanged(bool mintClosed);
    event VotingClosedChanged(bool votingClosed);
    event PausedStateChanged(bool paused);
    event MaintenanceModeChanged(bool maintenance);
    event CountryEliminatedEvent(uint256 indexed countryId);
    /// @dev ERC-4906: signals marketplaces (OpenSea etc.) to refresh metadata
    event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

    // ─────────────────────────────────────────────────────────────
    // Modifier
    // ─────────────────────────────────────────────────────────────

    modifier whenMintOpen() {
        require(!mintClosed, "Mint is closed");
        require(!paused, "Contract is paused");
        _;
    }

    modifier whenVotingOpen() {
        require(!votingClosed, "Voting is closed");
        require(!paused, "Contract is paused");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    constructor(address _devWallet, string memory _baseURI)
        ERC1155("")
        Ownable(msg.sender)
    {
        require(_devWallet != address(0), "Invalid dev wallet");
        devWallet = _devWallet;
        baseURI   = _baseURI;
        _setDefaultRoyalty(_devWallet, ROYALTY_BPS);
    }

    // ─────────────────────────────────────────────────────────────
    // ERC-1155 URI Override
    // ─────────────────────────────────────────────────────────────

    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    }

    // ─────────────────────────────────────────────────────────────
    // Game 1: Nations Cup — Mint
    // ─────────────────────────────────────────────────────────────

    function mintCountryNFT(uint256 countryId, uint256 amount)
        external payable nonReentrant whenMintOpen
    {
        require(!tournamentFinalized,                              "Tournament already finalized");
        require(countryId >= 1 && countryId <= MAX_COUNTRIES,     "Invalid country ID");
        require(!countryEliminated[countryId],                     "Country already eliminated");
        require(amount > 0,                                        "Amount must be > 0");
        require(msg.value == MINT_PRICE * amount,                 "Incorrect ETH payment");

        uint256 devShare  = (msg.value * DEV_SHARE_BPS) / 10000;
        uint256 poolShare = msg.value - devShare;

        userMintCount[msg.sender][countryId] += amount;
        countryTotalSupply[countryId]        += amount;
        nationsCupPoolBalance                += poolShare;
        totalGlobalVolumeETH                 += msg.value;
        totalLockedPrizePool                 += poolShare;

        _mint(msg.sender, countryId, amount, "");

        // Non-blocking: if devWallet is temporarily unreachable, fee is queued in pendingDevBalance.
        // This prevents a broken devWallet from locking the entire mint function.
        (bool ok, ) = payable(devWallet).call{value: devShare}("");
        if (!ok) { pendingDevBalance += devShare; }

        emit CountryMinted(msg.sender, countryId, amount, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────
    // Game 2: Top Scorer — Buy Ticket
    // ─────────────────────────────────────────────────────────────

    function buyScorerTickets(uint256 quantity)
        external payable nonReentrant whenVotingOpen
    {
        require(!topScorerFinalized,                   "Top scorer already finalized");
        require(quantity > 0,                           "Quantity must be > 0");
        require(msg.value == TICKET_PRICE * quantity,   "Incorrect ETH payment");

        uint256 devShare  = (msg.value * DEV_SHARE_BPS) / 10000;
        uint256 poolShare = msg.value - devShare;

        userUnusedTickets[msg.sender] += quantity;
        totalUnusedTickets            += quantity;
        topScorerPoolBalance          += poolShare;
        totalGlobalVolumeETH          += msg.value;
        totalLockedPrizePool          += poolShare;

        (bool ok, ) = payable(devWallet).call{value: devShare}("");
        if (!ok) { pendingDevBalance += devShare; }

        emit TicketPurchased(msg.sender, quantity, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────
    // Game 2: Top Scorer — Vote
    // ─────────────────────────────────────────────────────────────

    function voteTopScorer(string calldata playerName, uint256 votesToUse)
        external nonReentrant whenVotingOpen
    {
        require(!topScorerFinalized,                                                        "Top scorer already finalized");
        require(votesToUse > 0,                                                              "Votes must be > 0");
        require(bytes(playerName).length > 0,                                                "Empty player name");
        require(bytes(playerName).length <= 64,                                              "Player name too long");
        require(userUnusedTickets[msg.sender] >= votesToUse,                                 "Insufficient tickets");

        bytes32 playerKey = keccak256(abi.encodePacked(playerName));

        userUnusedTickets[msg.sender]          -= votesToUse;
        totalUnusedTickets                     -= votesToUse;
        playerVoteCounts[playerKey]            += votesToUse;
        userPlayerVotes[msg.sender][playerKey] += votesToUse;

        emit VoteCast(msg.sender, playerName, votesToUse, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────
    // Settlement: Nations Cup Claim
    // ─────────────────────────────────────────────────────────────

    function claimNationsCupRewards() external nonReentrant {
        require(tournamentFinalized, "Tournament not finalized yet");
        // Double-claim guard: prevents re-claiming via secondary-market token purchases
        require(!nationsCupHasClaimed[msg.sender], "Already claimed");

        uint256 userTokens = balanceOf(msg.sender, winningCountryId);
        require(userTokens > 0, "No winning tokens");
        require(nationsCupPoolBalance > 0, "Pool already drained");

        uint256 userEntitlement = (userTokens * finalNationsCupPool) / countryTotalSupply[winningCountryId];
        require(userEntitlement > 0, "Entitlement rounds to zero");
        // Dust guard: last claimer gets at most the remaining pool (rounding may leave 1-2 wei)
        if (userEntitlement > nationsCupPoolBalance) {
            userEntitlement = nationsCupPoolBalance;
        }

        uint256 feeCut     = (userEntitlement * POOL_FEE_BPS) / 10000;
        uint256 userReward = userEntitlement - feeCut;

        // ── Effects (CEI pattern) ──────────────────────────────────
        nationsCupHasClaimed[msg.sender] = true;
        nationsCupPoolBalance  -= userEntitlement;
        totalLockedPrizePool   -= userEntitlement;
        _burn(msg.sender, winningCountryId, userTokens);

        // ── Interactions ───────────────────────────────────────────
        // Fee: non-blocking — a broken devWallet cannot block user claims
        (bool feeOk, ) = payable(devWallet).call{value: feeCut}("");
        if (!feeOk) { pendingDevBalance += feeCut; }

        (bool rewardOk, ) = payable(msg.sender).call{value: userReward}("");
        require(rewardOk, "Reward transfer failed");

        emit NationsCupClaimed(msg.sender, userReward, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────
    // Settlement: Top Scorer Claim
    // ─────────────────────────────────────────────────────────────

    function claimTopScorerRewards() external nonReentrant {
        require(topScorerFinalized, "Top scorer not finalized yet");

        bytes32 playerKey        = keccak256(abi.encodePacked(finalTopScorer));
        uint256 userVotes        = userPlayerVotes[msg.sender][playerKey];
        require(userVotes > 0, "No winning votes");

        uint256 totalWinnerVotes = playerVoteCounts[playerKey];
        require(topScorerPoolBalance > 0, "Pool already drained");

        uint256 userEntitlement = (userVotes * finalTopScorerPool) / totalWinnerVotes;
        require(userEntitlement > 0, "Entitlement rounds to zero");
        // Dust guard: last claimer gets at most the remaining pool (rounding may leave 1-2 wei)
        if (userEntitlement > topScorerPoolBalance) {
            userEntitlement = topScorerPoolBalance;
        }

        uint256 feeCut     = (userEntitlement * POOL_FEE_BPS) / 10000;
        uint256 userReward = userEntitlement - feeCut;

        userPlayerVotes[msg.sender][playerKey] = 0;
        topScorerHasClaimed[msg.sender]        = true;
        topScorerPoolBalance                   -= userEntitlement;
        totalLockedPrizePool                   -= userEntitlement;

        // Fee: non-blocking — a broken devWallet cannot block user claims
        (bool feeOk, ) = payable(devWallet).call{value: feeCut}("");
        if (!feeOk) { pendingDevBalance += feeCut; }

        (bool rewardOk, ) = payable(msg.sender).call{value: userReward}("");
        require(rewardOk, "Reward transfer failed");

        emit TopScorerClaimed(msg.sender, userReward, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────
    // Settlement: Unused Ticket Refund
    // ─────────────────────────────────────────────────────────────

    /// @notice After Top Scorer is finalized, users who bought tickets but never voted
    ///         can reclaim the pool portion (80% of ticket price) of their unused tickets.
    function refundUnusedTickets() external nonReentrant {
        require(topScorerFinalized, "Top scorer not finalized yet");

        uint256 unused = userUnusedTickets[msg.sender];
        require(unused > 0, "No unused tickets");

        uint256 refundPerTicket = (TICKET_PRICE * (10000 - DEV_SHARE_BPS)) / 10000;
        uint256 totalRefund     = unused * refundPerTicket;

        userUnusedTickets[msg.sender] = 0;
        totalUnusedTickets            -= unused;
        topScorerPoolBalance          -= totalRefund;
        totalLockedPrizePool          -= totalRefund;

        (bool ok, ) = payable(msg.sender).call{value: totalRefund}("");
        require(ok, "Refund failed");

        emit UnusedTicketsRefunded(msg.sender, unused, totalRefund, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────
    // Admin: Eliminate Countries
    // ─────────────────────────────────────────────────────────────

    /// @notice Mark countries as eliminated. No pool movement — all funds stay
    ///         in nationsCupPoolBalance until the champion is declared.
    /// @param loserIds Country IDs to mark as eliminated
    function eliminateCountries(uint256[] calldata loserIds) external onlyOwner {
        require(!tournamentFinalized, "Tournament already finalized");
        require(loserIds.length > 0,  "Empty loser list");

        for (uint256 i = 0; i < loserIds.length; i++) {
            uint256 loserId = loserIds[i];
            require(loserId >= 1 && loserId <= MAX_COUNTRIES, "Invalid country ID");
            require(!countryEliminated[loserId],               "Country already eliminated");

            countryEliminated[loserId] = true;
            emit CountryEliminatedEvent(loserId);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Admin: Maintenance Mode
    // ─────────────────────────────────────────────────────────────

    function setMaintenanceMode(bool _maintenance) external onlyOwner {
        maintenanceMode = _maintenance;
        emit MaintenanceModeChanged(_maintenance);
    }

    // ─────────────────────────────────────────────────────────────
    // Admin: Finalize
    // ─────────────────────────────────────────────────────────────

    function finalizeNationsCup(uint256 _winningCountryId) external onlyOwner {
        require(!tournamentFinalized,                                          "Already finalized");
        require(mintClosed,                                                    "Close mint before finalizing");
        require(_winningCountryId >= 1 && _winningCountryId <= MAX_COUNTRIES, "Invalid country ID");
        require(countryTotalSupply[_winningCountryId] > 0,                    "Winner has no supply");

        winningCountryId      = _winningCountryId;
        tournamentFinalized   = true;
        finalNationsCupPool   = nationsCupPoolBalance;
        nationsCupFinalizedAt = block.timestamp;

        emit NationsCupFinalized(_winningCountryId, nationsCupPoolBalance);
    }

    /// @notice Finalize Top Scorer. If the real winner has 0 votes nobody can claim —
    ///         pool stays locked until withdrawUnclaimedTopScorer() after 30 days.
    function finalizeTopScorer(string calldata playerName) external onlyOwner {
        require(!topScorerFinalized,          "Already finalized");
        require(bytes(playerName).length > 0, "Empty player name");

        uint256 refundPerTicket  = (TICKET_PRICE * (10000 - DEV_SHARE_BPS)) / 10000;
        uint256 refundableAmount = totalUnusedTickets * refundPerTicket;
        uint256 voterPool        = topScorerPoolBalance > refundableAmount
                                    ? topScorerPoolBalance - refundableAmount
                                    : 0;

        finalTopScorer       = playerName;
        topScorerFinalized   = true;
        votingClosed         = true;
        finalTopScorerPool   = voterPool;
        topScorerFinalizedAt = block.timestamp;

        emit VotingClosedChanged(true);
        emit TopScorerFinalizedEvent(playerName, voterPool);
    }

    // ─────────────────────────────────────────────────────────────
    // Admin: Unclaimed Recovery (30 days)
    // ─────────────────────────────────────────────────────────────

    function withdrawUnclaimedNationsCup() external onlyOwner {
        require(tournamentFinalized,                                           "Not finalized yet");
        require(block.timestamp >= nationsCupFinalizedAt + UNCLAIMED_TIMEOUT, "Unclaimed window not passed");
        uint256 remaining = nationsCupPoolBalance;
        require(remaining > 0,                                                 "Nothing to withdraw");

        nationsCupPoolBalance = 0;
        totalLockedPrizePool  -= remaining;

        (bool ok, ) = payable(devWallet).call{value: remaining}("");
        require(ok, "Transfer failed");

        emit UnclaimedNationsCupWithdrawn(remaining, block.timestamp);
    }

    function withdrawUnclaimedTopScorer() external onlyOwner {
        require(topScorerFinalized,                                           "Not finalized yet");
        require(block.timestamp >= topScorerFinalizedAt + UNCLAIMED_TIMEOUT, "Unclaimed window not passed");
        uint256 remaining = topScorerPoolBalance;
        require(remaining > 0,                                                "Nothing to withdraw");

        topScorerPoolBalance = 0;
        totalLockedPrizePool -= remaining;

        (bool ok, ) = payable(devWallet).call{value: remaining}("");
        require(ok, "Transfer failed");

        emit UnclaimedTopScorerWithdrawn(remaining, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────
    // Admin: Config
    // ─────────────────────────────────────────────────────────────

    function setMintClosed(bool _mintClosed) external onlyOwner {
        mintClosed = _mintClosed;
        emit MintClosedChanged(_mintClosed);
    }

    function setVotingClosed(bool _votingClosed) external onlyOwner {
        votingClosed = _votingClosed;
        emit VotingClosedChanged(_votingClosed);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }

    function setDevWallet(address _newDevWallet) external onlyOwner {
        require(_newDevWallet != address(0), "Invalid address");
        emit DevWalletUpdated(devWallet, _newDevWallet);
        devWallet = _newDevWallet;
        _setDefaultRoyalty(_newDevWallet, ROYALTY_BPS);
    }

    function setBaseURI(string calldata _newBaseURI) external onlyOwner {
        emit BaseURIUpdated(baseURI, _newBaseURI);
        baseURI = _newBaseURI;
        emit BatchMetadataUpdate(1, MAX_COUNTRIES);
    }

    // ─────────────────────────────────────────────────────────────
    // Admin: Withdraw Pending Dev Fees
    // ─────────────────────────────────────────────────────────────

    /// @notice Withdraw any dev fees that failed to transfer instantly during mint/claim.
    ///         Accumulates in pendingDevBalance when devWallet is temporarily unreachable.
    function withdrawPendingDev() external onlyOwner {
        uint256 amount = pendingDevBalance;
        require(amount > 0, "Nothing pending");
        pendingDevBalance = 0;
        (bool ok, ) = payable(devWallet).call{value: amount}("");
        require(ok, "Transfer failed");
        emit PendingDevWithdrawn(amount, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────
    // View Helpers
    // ─────────────────────────────────────────────────────────────

    function getPlayerVotes(string calldata playerName) external view returns (uint256) {
        return playerVoteCounts[keccak256(abi.encodePacked(playerName))];
    }

    function getUserVotesForPlayer(address user, string calldata playerName) external view returns (uint256) {
        return userPlayerVotes[user][keccak256(abi.encodePacked(playerName))];
    }

    /// @notice Returns elimination status for all 48 countries.
    ///         Index 0 unused; index i corresponds to countryId i.
    function getAllEliminationStatus() external view returns (bool[49] memory eliminated) {
        for (uint256 i = 1; i <= MAX_COUNTRIES; i++) {
            eliminated[i] = countryEliminated[i];
        }
    }

    // ─────────────────────────────────────────────────────────────
    // EIP-165
    // ─────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC1155, ERC2981) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
