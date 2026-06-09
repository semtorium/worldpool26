// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/WorldPool26.sol";

contract WorldPool26Test is Test {
    using stdStorage for StdStorage;

    WorldPool26 public pool;

    address public owner    = makeAddr("owner");
    address public dev      = makeAddr("dev");
    address public alice    = makeAddr("alice");
    address public bob      = makeAddr("bob");
    address public carol    = makeAddr("carol");

    string  constant BASE_URI   = "https://gateway.pinata.cloud/ipfs/QmTEST/";
    string  constant MBAPPE     = "Kylian Mbappe";
    string  constant HAALAND    = "Erling Haaland";

    uint256 constant BRAZIL  = 1;
    uint256 constant FRANCE  = 2;
    uint256 constant GERMANY = 3;

    /// @dev Early-bird discounted price: MINT_PRICE × 80% = 0.00176 ETH
    uint256 constant DISC_PRICE = 1760000000000000;
    /// @dev Full mint price for reference
    uint256 constant FULL_PRICE = 2200000000000000;

    // ─────────────────────────────────────────────────────────────
    // Setup
    // ─────────────────────────────────────────────────────────────

    function setUp() public {
        vm.startPrank(owner);
        pool = new WorldPool26(dev, BASE_URI);
        vm.stopPrank();

        vm.deal(alice, 10 ether);
        vm.deal(bob,   10 ether);
        vm.deal(carol, 10 ether);
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    function _mintForAlice(uint256 countryId, uint256 amount) internal {
        uint256 price = pool.calcMintCost(amount);
        vm.prank(alice);
        pool.mintCountryNFT{value: price}(countryId, amount);
    }

    function _buyTickets(address user, uint256 qty) internal {
        uint256 price = pool.TICKET_PRICE() * qty;
        vm.prank(user);
        pool.buyScorerTickets{value: price}(qty);
    }

    function _vote(address user, string memory player, uint256 votes) internal {
        vm.prank(user);
        pool.voteTopScorer(player, votes);
    }

    function _eliminate(uint256[] memory loserIds) internal {
        vm.prank(owner);
        pool.eliminateCountries(loserIds);
    }

    /// @dev Close mint then finalize Nations Cup — required because contract
    ///      enforces `require(mintClosed)` before finalizeNationsCup.
    function _closeMintAndFinalize(uint256 countryId) internal {
        vm.startPrank(owner);
        pool.setMintClosed(true);
        pool.finalizeNationsCup(countryId);
        vm.stopPrank();
    }

    /// @dev Close voting then finalize Top Scorer — required because contract (v8)
    ///      enforces `require(votingClosed)` before finalizeTopScorer to prevent
    ///      mempool front-running.
    function _closeVotingAndFinalizeTopScorer(string memory playerName) internal {
        vm.startPrank(owner);
        pool.setVotingClosed(true);
        pool.finalizeTopScorer(playerName);
        vm.stopPrank();
    }

    /// @dev Exhaust the early-bird window by minting exactly EARLY_BIRD_SUPPLY NFTs in one tx.
    ///      Uses GERMANY (not BRAZIL/FRANCE) so whale tokens don't pollute claim tests.
    function _exhaustEarlyBird() internal {
        address whale = makeAddr("whale");
        uint256 supply = pool.EARLY_BIRD_SUPPLY();
        uint256 cost   = pool.calcMintCost(supply);
        vm.deal(whale, cost + 1 ether);
        vm.prank(whale);
        pool.mintCountryNFT{value: cost}(GERMANY, supply);
        assertEq(pool.totalNFTsMinted(), supply);
    }

    // ─────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────

    function test_constructor() public view {
        assertEq(pool.devWallet(), dev);
        assertEq(pool.baseURI(), BASE_URI);
        assertFalse(pool.tournamentFinalized());
        assertFalse(pool.topScorerFinalized());
        assertEq(pool.nationsCupPoolBalance(), 0);
        assertEq(pool.totalNFTsMinted(), 0);
    }

    function test_constructor_revertsZeroDevWallet() public {
        vm.expectRevert("Invalid dev wallet");
        new WorldPool26(address(0), BASE_URI);
    }

    // ─────────────────────────────────────────────────────────────
    // URI
    // ─────────────────────────────────────────────────────────────

    function test_uri_decimal() public view {
        string memory expected = string(abi.encodePacked(BASE_URI, "1.json"));
        assertEq(pool.uri(1), expected);
    }

    function test_uri_tokenId48() public view {
        string memory expected = string(abi.encodePacked(BASE_URI, "48.json"));
        assertEq(pool.uri(48), expected);
    }

    // ─────────────────────────────────────────────────────────────
    // Ownable2Step (v8)
    // ─────────────────────────────────────────────────────────────

    function test_ownable2step_pendingOwner() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        pool.transferOwnership(newOwner);
        // Ownership has NOT transferred yet — pending acceptance
        assertEq(pool.owner(), owner);
        assertEq(pool.pendingOwner(), newOwner);
    }

    function test_ownable2step_acceptOwnership() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        pool.transferOwnership(newOwner);
        vm.prank(newOwner);
        pool.acceptOwnership();
        assertEq(pool.owner(), newOwner);
        assertEq(pool.pendingOwner(), address(0));
    }

    function test_ownable2step_onlyPendingCanAccept() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        pool.transferOwnership(newOwner);
        // Attacker tries to hijack ownership acceptance
        vm.prank(alice);
        vm.expectRevert();
        pool.acceptOwnership();
        assertEq(pool.owner(), owner); // unchanged
    }

    // ─────────────────────────────────────────────────────────────
    // Early-Bird Discount (v7/v8)
    // ─────────────────────────────────────────────────────────────

    function test_earlyBird_constants() public view {
        assertEq(pool.EARLY_BIRD_SUPPLY(), 100);
        assertEq(pool.EARLY_BIRD_DISCOUNT_BPS(), 2000);
    }

    function test_earlyBird_calcMintCost_singleDiscounted() public view {
        // totalNFTsMinted = 0 → single NFT gets discount
        assertEq(pool.calcMintCost(1), DISC_PRICE);
    }

    function test_earlyBird_calcMintCost_fiveDiscounted() public view {
        // totalNFTsMinted = 0 → max batch during early bird
        assertEq(pool.calcMintCost(5), DISC_PRICE * 5);
    }

    function test_earlyBird_calcMintCost_splitAtBoundary() public {
        // Set totalNFTsMinted = 99 → 1 discounted slot left
        stdstore.target(address(pool)).sig("totalNFTsMinted()").checked_write(99);

        // 5 NFTs: 1 discounted + 4 full price
        uint256 expected = DISC_PRICE * 1 + FULL_PRICE * 4;
        assertEq(pool.calcMintCost(5), expected);
    }

    function test_earlyBird_calcMintCost_allFullPriceAfter200() public {
        // Set totalNFTsMinted = 100 → early bird exhausted
        stdstore.target(address(pool)).sig("totalNFTsMinted()").checked_write(100);

        assertEq(pool.calcMintCost(1),  FULL_PRICE);
        assertEq(pool.calcMintCost(5),  FULL_PRICE * 5);
        assertEq(pool.calcMintCost(20), FULL_PRICE * 20);
    }

    function test_earlyBird_discountedMint_correctSplit() public {
        uint256 devBefore  = dev.balance;
        uint256 cost       = pool.calcMintCost(1);
        assertEq(cost, DISC_PRICE);

        vm.prank(alice);
        pool.mintCountryNFT{value: cost}(BRAZIL, 1);

        assertEq(pool.totalNFTsMinted(), 1);
        assertEq(pool.nationsCupPoolBalance(), DISC_PRICE * 8000 / 10000);
        assertEq(dev.balance - devBefore,      DISC_PRICE * 2000 / 10000);
        assertEq(pool.totalGlobalVolumeETH(),  DISC_PRICE);
    }

    function test_earlyBird_counterIncrements() public {
        assertEq(pool.totalNFTsMinted(), 0);
        _mintForAlice(BRAZIL,  3);
        assertEq(pool.totalNFTsMinted(), 3);
        _mintForAlice(FRANCE,  2);
        assertEq(pool.totalNFTsMinted(), 5);
    }

    /// @dev v8: per-tx whale limit removed — minting across the early-bird boundary
    ///      in a single tx is now allowed. calcMintCost returns the correct split price.
    function test_earlyBird_straddle_allowed() public {
        // Set totalNFTsMinted = 98 → 2 discounted slots left
        stdstore.target(address(pool)).sig("totalNFTsMinted()").checked_write(98);

        // Minting 5 straddles: 2 × disc + 3 × full
        uint256 cost = pool.calcMintCost(5);
        assertEq(cost, DISC_PRICE * 2 + FULL_PRICE * 3);

        vm.deal(alice, cost);
        vm.prank(alice);
        pool.mintCountryNFT{value: cost}(BRAZIL, 5);

        assertEq(pool.balanceOf(alice, BRAZIL), 5);
        assertEq(pool.totalNFTsMinted(), 103);
    }

    function test_earlyBird_straddle_dynamic() public {
        // Set totalNFTsMinted = 97 → 3 discounted slots left
        stdstore.target(address(pool)).sig("totalNFTsMinted()").checked_write(97);

        // Minting 7 straddles: 3 × disc + 4 × full
        uint256 cost = pool.calcMintCost(7);
        assertEq(cost, DISC_PRICE * 3 + FULL_PRICE * 4);

        vm.deal(bob, cost);
        vm.prank(bob);
        pool.mintCountryNFT{value: cost}(FRANCE, 7);
        assertEq(pool.balanceOf(bob, FRANCE), 7);
        assertEq(pool.totalNFTsMinted(), 104);
    }

    function test_postEarlyBird_noPerTxLimit() public {
        // After all early-bird slots are gone, large batches are allowed
        _exhaustEarlyBird();
        assertEq(pool.totalNFTsMinted(), pool.EARLY_BIRD_SUPPLY());

        uint256 bigBatch = 20;
        uint256 cost = pool.calcMintCost(bigBatch);  // all at FULL_PRICE
        assertEq(cost, FULL_PRICE * bigBatch);
        vm.deal(alice, cost);
        vm.prank(alice);
        pool.mintCountryNFT{value: cost}(BRAZIL, bigBatch);
        assertEq(pool.balanceOf(alice, BRAZIL), bigBatch);
        assertEq(pool.totalNFTsMinted(), pool.EARLY_BIRD_SUPPLY() + bigBatch);
    }

    function test_earlyBird_exhaustThenFullPrice() public {
        _exhaustEarlyBird();

        // Next mint pays full price
        uint256 cost = pool.calcMintCost(1);
        assertEq(cost, FULL_PRICE);

        uint256 devBefore = dev.balance;
        vm.prank(alice);
        pool.mintCountryNFT{value: cost}(BRAZIL, 1);

        assertEq(pool.nationsCupPoolBalance() - (DISC_PRICE * 8000 / 10000 * pool.EARLY_BIRD_SUPPLY()), FULL_PRICE * 8000 / 10000);
        assertEq(dev.balance - devBefore, FULL_PRICE * 2000 / 10000);
    }

    // ─────────────────────────────────────────────────────────────
    // mintCountryNFT — Happy Path
    // ─────────────────────────────────────────────────────────────

    function test_mint_singleNFT() public {
        uint256 devBefore = dev.balance;
        uint256 price     = pool.calcMintCost(1); // discounted: 0.00176 ETH

        vm.expectEmit(true, true, false, true);
        emit WorldPool26.CountryMinted(alice, BRAZIL, 1, block.timestamp);

        vm.prank(alice);
        pool.mintCountryNFT{value: price}(BRAZIL, 1);

        assertEq(pool.balanceOf(alice, BRAZIL), 1);
        assertEq(pool.countryTotalSupply(BRAZIL), 1);
        assertEq(pool.totalNFTsMinted(), 1);

        uint256 expectedPool = price * 8000 / 10000;
        assertEq(pool.nationsCupPoolBalance(), expectedPool);
        assertEq(pool.totalLockedPrizePool(),  expectedPool);

        uint256 expectedDev = price * 2000 / 10000;
        assertEq(dev.balance - devBefore, expectedDev);
        assertEq(pool.totalGlobalVolumeETH(), price);
    }

    function test_mint_multipleCountries_singlePool() public {
        // Alice mints 3 (totalNFTsMinted → 3)
        uint256 aliceCost = pool.calcMintCost(3);
        _mintForAlice(BRAZIL, 3);

        // Bob mints 2 (totalNFTsMinted → 5); still in early bird window
        uint256 bobCost = pool.calcMintCost(2);
        vm.prank(bob);
        pool.mintCountryNFT{value: bobCost}(FRANCE, 2);

        // All 5 NFTs at discounted price
        uint256 expectedPool = (aliceCost + bobCost) * 8000 / 10000;
        assertEq(pool.nationsCupPoolBalance(), expectedPool);
        assertEq(pool.balanceOf(alice, BRAZIL), 3);
        assertEq(pool.balanceOf(bob, FRANCE), 2);
        assertEq(pool.totalNFTsMinted(), 5);
    }

    function test_mint_revertsInvalidCountryId_zero() public {
        uint256 price = pool.calcMintCost(1);
        vm.prank(alice);
        vm.expectRevert("Invalid country ID");
        pool.mintCountryNFT{value: price}(0, 1);
    }

    function test_mint_revertsInvalidCountryId_over48() public {
        uint256 price = pool.calcMintCost(1);
        vm.prank(alice);
        vm.expectRevert("Invalid country ID");
        pool.mintCountryNFT{value: price}(49, 1);
    }

    function test_mint_revertsZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert("Amount must be > 0");
        pool.mintCountryNFT{value: 0}(BRAZIL, 0);
    }

    function test_mint_revertsWrongPayment() public {
        // Sending 1 wei less than the discounted price should revert
        uint256 wrongValue = pool.calcMintCost(1) - 1;
        vm.prank(alice);
        vm.expectRevert("Incorrect ETH payment");
        pool.mintCountryNFT{value: wrongValue}(BRAZIL, 1);
    }

    function test_mint_revertsAfterTournamentFinalized() public {
        _mintForAlice(BRAZIL, 1);
        _closeMintAndFinalize(BRAZIL);

        uint256 price = pool.MINT_PRICE();
        vm.prank(bob);
        vm.expectRevert("Mint is closed");
        pool.mintCountryNFT{value: price}(BRAZIL, 1);
    }

    // ─────────────────────────────────────────────────────────────
    // buyScorerTickets
    // ─────────────────────────────────────────────────────────────

    function test_buyTickets_happy() public {
        uint256 devBefore = dev.balance;
        _buyTickets(alice, 3);

        assertEq(pool.userUnusedTickets(alice), 3);

        uint256 expectedPool = pool.TICKET_PRICE() * 3 * 8000 / 10000;
        assertEq(pool.topScorerPoolBalance(), expectedPool);

        uint256 expectedDev = pool.TICKET_PRICE() * 3 * 2000 / 10000;
        assertEq(dev.balance - devBefore, expectedDev);
    }

    function test_buyTickets_revertsZeroQuantity() public {
        vm.prank(alice);
        vm.expectRevert("Quantity must be > 0");
        pool.buyScorerTickets{value: 0}(0);
    }

    function test_buyTickets_revertsWrongPayment() public {
        uint256 wrongValue = pool.TICKET_PRICE() - 1;
        vm.prank(alice);
        vm.expectRevert("Incorrect ETH payment");
        pool.buyScorerTickets{value: wrongValue}(1);
    }

    function test_buyTickets_revertsAfterVotingClosed() public {
        _buyTickets(alice, 1);
        _vote(alice, MBAPPE, 1);
        // v8: close voting separately before finalizing (front-run protection)
        vm.startPrank(owner);
        pool.setVotingClosed(true);
        pool.finalizeTopScorer(MBAPPE);
        vm.stopPrank();

        uint256 price = pool.TICKET_PRICE();
        vm.prank(bob);
        vm.expectRevert("Voting is closed");
        pool.buyScorerTickets{value: price}(1);
    }

    // ─────────────────────────────────────────────────────────────
    // voteTopScorer
    // ─────────────────────────────────────────────────────────────

    function test_vote_happy() public {
        _buyTickets(alice, 5);

        vm.expectEmit(true, false, false, true);
        emit WorldPool26.VoteCast(alice, MBAPPE, 3, block.timestamp);

        vm.prank(alice);
        pool.voteTopScorer(MBAPPE, 3);

        assertEq(pool.userUnusedTickets(alice), 2);
        assertEq(pool.getPlayerVotes(MBAPPE), 3);
        assertEq(pool.getUserVotesForPlayer(alice, MBAPPE), 3);
    }

    function test_vote_multiplePlayersMultipleUsers() public {
        _buyTickets(alice, 5);
        _buyTickets(bob, 4);

        _vote(alice, MBAPPE, 3);
        _vote(alice, HAALAND, 2);
        _vote(bob, MBAPPE, 4);

        assertEq(pool.getPlayerVotes(MBAPPE), 7);
        assertEq(pool.getPlayerVotes(HAALAND), 2);
    }

    function test_vote_revertsInsufficientTickets() public {
        _buyTickets(alice, 2);

        vm.prank(alice);
        vm.expectRevert("Insufficient tickets");
        pool.voteTopScorer(MBAPPE, 3);
    }

    function test_vote_revertsEmptyName() public {
        _buyTickets(alice, 1);

        vm.prank(alice);
        vm.expectRevert("Empty player name");
        pool.voteTopScorer("", 1);
    }

    function test_vote_revertsAfterVotingClosed() public {
        _buyTickets(alice, 2);
        _vote(alice, MBAPPE, 1);
        // v8: close voting separately before finalizing
        vm.startPrank(owner);
        pool.setVotingClosed(true);
        pool.finalizeTopScorer(MBAPPE);
        vm.stopPrank();

        vm.prank(alice);
        vm.expectRevert("Voting is closed");
        pool.voteTopScorer(MBAPPE, 1);
    }

    // ─────────────────────────────────────────────────────────────
    // eliminateCountries (v6 — no pool movement)
    // ─────────────────────────────────────────────────────────────

    function test_eliminate_marksSingleCountry() public {
        _mintForAlice(FRANCE, 2);
        _mintForAlice(BRAZIL, 3);

        uint256 poolBefore = pool.nationsCupPoolBalance();

        uint256[] memory losers = new uint256[](1);
        losers[0] = FRANCE;
        _eliminate(losers);

        assertTrue(pool.countryEliminated(FRANCE));
        assertFalse(pool.countryEliminated(BRAZIL));
        // Pool unchanged — no fund movement in v6
        assertEq(pool.nationsCupPoolBalance(), poolBefore);
    }

    function test_eliminate_batchMultipleCountries() public {
        _mintForAlice(FRANCE, 1);
        _mintForAlice(GERMANY, 1);

        uint256 poolBefore = pool.nationsCupPoolBalance();

        uint256[] memory losers = new uint256[](2);
        losers[0] = FRANCE;
        losers[1] = GERMANY;
        _eliminate(losers);

        assertTrue(pool.countryEliminated(FRANCE));
        assertTrue(pool.countryEliminated(GERMANY));
        assertEq(pool.nationsCupPoolBalance(), poolBefore); // pool untouched
    }

    function test_eliminate_revertsAlreadyEliminated() public {
        uint256[] memory losers = new uint256[](1);
        losers[0] = FRANCE;
        _eliminate(losers);

        vm.prank(owner);
        vm.expectRevert("Country already eliminated");
        pool.eliminateCountries(losers);
    }

    function test_eliminate_revertsNonOwner() public {
        uint256[] memory losers = new uint256[](1);
        losers[0] = FRANCE;

        vm.prank(alice);
        vm.expectRevert();
        pool.eliminateCountries(losers);
    }

    function test_eliminate_revertsAfterFinalized() public {
        _mintForAlice(BRAZIL, 1);
        _closeMintAndFinalize(BRAZIL);

        uint256[] memory losers = new uint256[](1);
        losers[0] = FRANCE;

        vm.prank(owner);
        vm.expectRevert("Tournament already finalized");
        pool.eliminateCountries(losers);
    }

    // ─────────────────────────────────────────────────────────────
    // finalizeNationsCup
    // ─────────────────────────────────────────────────────────────

    function test_finalizeNationsCup_happy() public {
        _mintForAlice(BRAZIL, 2);

        _closeMintAndFinalize(BRAZIL);

        assertTrue(pool.tournamentFinalized());
        assertEq(pool.winningCountryId(), BRAZIL);
        assertEq(pool.finalNationsCupPool(), pool.nationsCupPoolBalance());
    }

    function test_finalizeNationsCup_snapshotsMainPool() public {
        // Alice mints 3 (totalNFTsMinted → 3)
        _mintForAlice(BRAZIL, 3);

        // Bob mints 2 (totalNFTsMinted → 5), still in early bird window
        uint256 price2 = pool.calcMintCost(2);
        vm.prank(bob);
        pool.mintCountryNFT{value: price2}(FRANCE, 2);

        // Eliminate France — pool stays unchanged
        uint256[] memory losers = new uint256[](1);
        losers[0] = FRANCE;
        _eliminate(losers);

        uint256 expectedFinal = pool.nationsCupPoolBalance();

        _closeMintAndFinalize(BRAZIL);

        assertEq(pool.finalNationsCupPool(), expectedFinal);
    }

    function test_finalizeNationsCup_revertsDoubleFinalize() public {
        _mintForAlice(BRAZIL, 1);
        _closeMintAndFinalize(BRAZIL);

        vm.prank(owner);
        vm.expectRevert("Already finalized");
        pool.finalizeNationsCup(BRAZIL);
    }

    function test_finalizeNationsCup_revertsZeroSupply() public {
        // Must close mint first (satisfies mintClosed guard), then supply=0 triggers the real check
        vm.prank(owner);
        pool.setMintClosed(true);
        vm.prank(owner);
        vm.expectRevert("Winner has no supply");
        pool.finalizeNationsCup(BRAZIL);
    }

    function test_finalizeNationsCup_revertsMintStillOpen() public {
        _mintForAlice(BRAZIL, 1);
        // mintClosed is still false — contract must reject
        vm.prank(owner);
        vm.expectRevert("Close mint before finalizing");
        pool.finalizeNationsCup(BRAZIL);
    }

    // ─────────────────────────────────────────────────────────────
    // claimNationsCupRewards — Critical Fee Math
    // ─────────────────────────────────────────────────────────────

    function test_claim_nationsCup_singleHolder() public {
        _mintForAlice(BRAZIL, 4);

        _closeMintAndFinalize(BRAZIL);

        uint256 totalPool  = pool.nationsCupPoolBalance();
        uint256 userBefore = alice.balance;
        uint256 devBefore  = dev.balance;

        vm.prank(alice);
        pool.claimNationsCupRewards();

        assertEq(pool.nationsCupPoolBalance(), 0);

        uint256 expectedReward = totalPool * 9500 / 10000;
        uint256 expectedFee    = totalPool - expectedReward;

        assertApproxEqAbs(alice.balance - userBefore, expectedReward, 1);
        assertApproxEqAbs(dev.balance - devBefore, expectedFee, 1);
        assertEq(pool.balanceOf(alice, BRAZIL), 0);
    }

    function test_claim_nationsCup_twoHolders_proRata() public {
        // Alice: 3 tokens, Bob: 1 token → Alice gets 75%, Bob gets 25% of ENTIRE main pool
        // Exhaust early bird first so subsequent mints have no per-tx limit
        _exhaustEarlyBird();

        uint256 price = pool.calcMintCost(3); // full price after EB
        vm.deal(alice, price);
        vm.prank(alice);
        pool.mintCountryNFT{value: price}(BRAZIL, 3);

        uint256 bobPrice = pool.calcMintCost(1);
        vm.deal(bob, bobPrice);
        vm.prank(bob);
        pool.mintCountryNFT{value: bobPrice}(BRAZIL, 1);

        // Carol mints 2 France (full price, no EB limit)
        uint256 price2 = pool.calcMintCost(2);
        vm.deal(carol, price2);
        vm.prank(carol);
        pool.mintCountryNFT{value: price2}(FRANCE, 2);

        uint256[] memory losers = new uint256[](1);
        losers[0] = FRANCE;
        _eliminate(losers);

        _closeMintAndFinalize(BRAZIL);

        uint256 snapshot    = pool.finalNationsCupPool();
        uint256 totalSupply = pool.countryTotalSupply(BRAZIL); // 4

        uint256 aliceEntitlement = (3 * snapshot) / totalSupply;
        uint256 bobEntitlement   = (1 * snapshot) / totalSupply;
        uint256 bobExpected      = bobEntitlement * 9500 / 10000;

        vm.prank(alice);
        pool.claimNationsCupRewards();

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        pool.claimNationsCupRewards();

        assertApproxEqAbs(bob.balance - bobBefore, bobExpected, 2);

        // Pool nearly drained (max 2 wei integer division dust)
        assertLe(pool.nationsCupPoolBalance(), 2);

        uint256 aliceExpected = aliceEntitlement * 9500 / 10000;
        assertApproxEqAbs(aliceExpected, bobExpected * 3, 5);
    }

    function test_claim_nationsCup_losingCountryHolderGetsNothing() public {
        // Bob minted France (loses), Alice minted Brazil (wins)
        _mintForAlice(BRAZIL, 2);

        // Bob mints 1 after alice's 2 (still early bird)
        uint256 price = pool.calcMintCost(1);
        vm.prank(bob);
        pool.mintCountryNFT{value: price}(FRANCE, 1);

        uint256[] memory losers = new uint256[](1);
        losers[0] = FRANCE;
        _eliminate(losers);

        _closeMintAndFinalize(BRAZIL);

        // Bob has no Brazil tokens — cannot claim
        vm.prank(bob);
        vm.expectRevert("No winning tokens");
        pool.claimNationsCupRewards();
    }

    function test_claim_nationsCup_revertsNotFinalized() public {
        _mintForAlice(BRAZIL, 1);

        vm.prank(alice);
        vm.expectRevert("Tournament not finalized yet");
        pool.claimNationsCupRewards();
    }

    function test_claim_nationsCup_noDoubleClaim() public {
        _mintForAlice(BRAZIL, 2);
        _closeMintAndFinalize(BRAZIL);

        vm.prank(alice);
        pool.claimNationsCupRewards();

        // nationsCupHasClaimed[alice] = true after first claim;
        // second attempt hits the hasClaimed guard before the token balance check.
        vm.prank(alice);
        vm.expectRevert("Already claimed");
        pool.claimNationsCupRewards();
    }

    // ─────────────────────────────────────────────────────────────
    // finalizeTopScorer (v8 — requires votingClosed first)
    // ─────────────────────────────────────────────────────────────

    function test_finalizeTopScorer_happy() public {
        _buyTickets(alice, 3);
        _vote(alice, MBAPPE, 3);

        _closeVotingAndFinalizeTopScorer(MBAPPE);

        assertTrue(pool.topScorerFinalized());
        assertEq(pool.finalTopScorer(), MBAPPE);
    }

    /// @dev v8: finalizeTopScorer now requires votingClosed=true first.
    function test_finalizeTopScorer_requiresVotingClosed() public {
        _buyTickets(alice, 1);
        _vote(alice, MBAPPE, 1);
        // Attempt to finalize WITHOUT closing voting first — must revert
        vm.prank(owner);
        vm.expectRevert("Close voting before finalizing");
        pool.finalizeTopScorer(MBAPPE);
    }

    function test_finalizeTopScorer_allowsZeroVotes() public {
        // No tickets, no votes — still possible to finalize after closing voting
        _closeVotingAndFinalizeTopScorer(MBAPPE);
        assertTrue(pool.topScorerFinalized());
        assertEq(pool.finalTopScorerPool(), 0);
    }

    function test_finalizeTopScorer_revertsDoubleFinalize() public {
        _buyTickets(alice, 1);
        _vote(alice, MBAPPE, 1);
        _closeVotingAndFinalizeTopScorer(MBAPPE);

        vm.prank(owner);
        vm.expectRevert("Already finalized");
        pool.finalizeTopScorer(MBAPPE);
    }

    // ─────────────────────────────────────────────────────────────
    // claimTopScorerRewards
    // ─────────────────────────────────────────────────────────────

    function test_claim_topScorer_singleWinner() public {
        _buyTickets(alice, 3);
        _vote(alice, MBAPPE, 3);

        _closeVotingAndFinalizeTopScorer(MBAPPE);

        uint256 totalPool   = pool.topScorerPoolBalance();
        uint256 aliceBefore = alice.balance;
        uint256 devBefore   = dev.balance;

        vm.prank(alice);
        pool.claimTopScorerRewards();

        uint256 expectedReward = totalPool * 9500 / 10000;
        uint256 expectedFee    = totalPool - expectedReward;

        assertApproxEqAbs(alice.balance - aliceBefore, expectedReward, 1);
        assertApproxEqAbs(dev.balance - devBefore, expectedFee, 1);
        assertEq(pool.topScorerPoolBalance(), 0);
    }

    function test_claim_topScorer_twoWinners_proRata() public {
        _buyTickets(alice, 3);
        _buyTickets(bob, 1);
        _buyTickets(carol, 5);

        _vote(alice, MBAPPE, 3);
        _vote(bob, MBAPPE, 1);
        _vote(carol, HAALAND, 5); // wrong player

        _closeVotingAndFinalizeTopScorer(MBAPPE);

        uint256 snapshot      = pool.finalTopScorerPool();
        uint256 totalWinVotes = pool.getPlayerVotes(MBAPPE); // 4

        uint256 bobExpected = (1 * snapshot / totalWinVotes) * 9500 / 10000;

        vm.prank(alice);
        pool.claimTopScorerRewards();

        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        pool.claimTopScorerRewards();

        assertApproxEqAbs(bob.balance - bobBefore, bobExpected, 2);

        vm.prank(carol);
        vm.expectRevert("No winning votes");
        pool.claimTopScorerRewards();
    }

    function test_claim_topScorer_noDoubleClaim() public {
        _buyTickets(alice, 2);
        _vote(alice, MBAPPE, 2);
        _closeVotingAndFinalizeTopScorer(MBAPPE);

        vm.prank(alice);
        pool.claimTopScorerRewards();

        // userPlayerVotes zeroed out on first claim — second attempt hits "No winning votes"
        vm.prank(alice);
        vm.expectRevert("No winning votes");
        pool.claimTopScorerRewards();
    }

    // ─────────────────────────────────────────────────────────────
    // Full Tournament Simulation (v6 — single main pool)
    // ─────────────────────────────────────────────────────────────

    function test_fullTournamentFlow() public {
        // Three countries minted — ALL go to the same main pool (all in early bird window)
        _mintForAlice(BRAZIL, 5);  // totalNFTsMinted → 5

        uint256 price3 = pool.calcMintCost(3); // after 5 mints
        vm.prank(bob);
        pool.mintCountryNFT{value: price3}(FRANCE, 3);   // → 8

        uint256 price2 = pool.calcMintCost(2); // after 8 mints
        vm.prank(carol);
        pool.mintCountryNFT{value: price2}(GERMANY, 2);  // → 10

        uint256 mainPoolAfterMints = pool.nationsCupPoolBalance();
        // All 10 mints (5+3+2) are within EARLY_BIRD_SUPPLY=100, so all discounted
        assertEq(mainPoolAfterMints, DISC_PRICE * 10 * 8000 / 10000);

        // Eliminate France and Germany — pool stays the same
        uint256[] memory losers = new uint256[](2);
        losers[0] = FRANCE;
        losers[1] = GERMANY;
        _eliminate(losers);

        assertEq(pool.nationsCupPoolBalance(), mainPoolAfterMints); // unchanged

        // Brazil wins — entire main pool goes to Brazil NFT holders
        _closeMintAndFinalize(BRAZIL);

        // Alice (5 tokens, 100% of Brazil supply) claims the entire main pool
        uint256 expectedReward = mainPoolAfterMints * 9500 / 10000;
        uint256 aliceBefore = alice.balance;

        vm.prank(alice);
        pool.claimNationsCupRewards();

        assertApproxEqAbs(alice.balance - aliceBefore, expectedReward, 5);

        // Bob and Carol held non-winning countries, cannot claim
        vm.prank(bob);
        vm.expectRevert("No winning tokens");
        pool.claimNationsCupRewards();
    }

    // ─────────────────────────────────────────────────────────────
    // mintCountryNFT — Eliminated Country Guard
    // ─────────────────────────────────────────────────────────────

    function test_mint_revertsEliminated() public {
        uint256[] memory losers = new uint256[](1);
        losers[0] = FRANCE;
        _eliminate(losers);

        uint256 price = pool.calcMintCost(1);
        vm.prank(alice);
        vm.expectRevert("Country already eliminated");
        pool.mintCountryNFT{value: price}(FRANCE, 1);
    }

    // ─────────────────────────────────────────────────────────────
    // refundUnusedTickets
    // ─────────────────────────────────────────────────────────────

    function test_refundUnusedTickets_happy() public {
        _buyTickets(alice, 5);   // 5 tickets
        _vote(alice, MBAPPE, 2); // use 2, 3 unused

        _closeVotingAndFinalizeTopScorer(MBAPPE);

        uint256 refundPerTicket = (pool.TICKET_PRICE() * (10000 - pool.DEV_SHARE_BPS())) / 10000;
        uint256 expectedRefund  = 3 * refundPerTicket;

        uint256 aliceBefore = alice.balance;

        vm.expectEmit(true, false, false, true);
        emit WorldPool26.UnusedTicketsRefunded(alice, 3, expectedRefund, block.timestamp);

        vm.prank(alice);
        pool.refundUnusedTickets();

        assertEq(alice.balance - aliceBefore, expectedRefund);
        assertEq(pool.userUnusedTickets(alice), 0);
    }

    function test_refundUnusedTickets_revertsNoUnused() public {
        _buyTickets(alice, 2);
        _vote(alice, MBAPPE, 2); // all used

        _closeVotingAndFinalizeTopScorer(MBAPPE);

        vm.prank(alice);
        vm.expectRevert("No unused tickets");
        pool.refundUnusedTickets();
    }

    function test_refundUnusedTickets_revertsNotFinalized() public {
        _buyTickets(alice, 3);
        // no finalize yet

        vm.prank(alice);
        vm.expectRevert("Top scorer not finalized yet");
        pool.refundUnusedTickets();
    }

    function test_refundUnusedTickets_noDoubleClaim() public {
        _buyTickets(alice, 3);
        _closeVotingAndFinalizeTopScorer(MBAPPE);

        vm.prank(alice);
        pool.refundUnusedTickets();

        vm.prank(alice);
        vm.expectRevert("No unused tickets");
        pool.refundUnusedTickets();
    }

    // ─────────────────────────────────────────────────────────────
    // Withdraw Unclaimed (15-day window)
    // ─────────────────────────────────────────────────────────────

    function test_withdrawUnclaimedNationsCup_happy() public {
        _mintForAlice(BRAZIL, 2);
        _closeMintAndFinalize(BRAZIL);

        // Warp past 15 days
        vm.warp(block.timestamp + pool.UNCLAIMED_TIMEOUT() + 1);

        uint256 remaining = pool.nationsCupPoolBalance();
        uint256 devBefore = dev.balance;

        vm.prank(owner);
        pool.withdrawUnclaimedNationsCup();

        assertEq(pool.nationsCupPoolBalance(), 0);
        assertEq(dev.balance - devBefore, remaining);
    }

    function test_withdrawUnclaimedNationsCup_revertsTooEarly() public {
        _mintForAlice(BRAZIL, 1);
        _closeMintAndFinalize(BRAZIL);

        // Only 7 days passed, not 15
        vm.warp(block.timestamp + 7 days);

        vm.prank(owner);
        vm.expectRevert("Unclaimed window not passed");
        pool.withdrawUnclaimedNationsCup();
    }

    function test_withdrawUnclaimedTopScorer_happy() public {
        _buyTickets(alice, 3);
        _vote(alice, MBAPPE, 3);
        _closeVotingAndFinalizeTopScorer(MBAPPE);

        // Alice does NOT claim — owner recovers after 15 days
        vm.warp(block.timestamp + pool.UNCLAIMED_TIMEOUT() + 1);

        uint256 remaining = pool.topScorerPoolBalance();
        uint256 devBefore = dev.balance;

        vm.prank(owner);
        pool.withdrawUnclaimedTopScorer();

        assertEq(pool.topScorerPoolBalance(), 0);
        assertEq(dev.balance - devBefore, remaining);
    }

    // ─────────────────────────────────────────────────────────────
    // Pause controls
    // ─────────────────────────────────────────────────────────────

    function test_pause_blocks_mint() public {
        vm.prank(owner);
        pool.setPaused(true);

        uint256 price = pool.calcMintCost(1);
        vm.prank(alice);
        vm.expectRevert("Contract is paused");
        pool.mintCountryNFT{value: price}(BRAZIL, 1);
    }

    function test_pause_blocks_ticketBuy() public {
        vm.prank(owner);
        pool.setPaused(true);

        uint256 price = pool.TICKET_PRICE();
        vm.prank(alice);
        vm.expectRevert("Contract is paused");
        pool.buyScorerTickets{value: price}(1);
    }

    function test_pause_blocks_vote() public {
        // Buy before pausing
        _buyTickets(alice, 2);

        vm.prank(owner);
        pool.setPaused(true);

        vm.prank(alice);
        vm.expectRevert("Contract is paused");
        pool.voteTopScorer(MBAPPE, 1);
    }

    function test_pause_allows_claim() public {
        // Setup & finalize
        _mintForAlice(BRAZIL, 2);
        _closeMintAndFinalize(BRAZIL);

        // Pause after finalization
        vm.prank(owner);
        pool.setPaused(true);

        // Claim should still work (paused does NOT block claims)
        vm.prank(alice);
        pool.claimNationsCupRewards(); // must not revert
        assertEq(pool.balanceOf(alice, BRAZIL), 0);
    }

    // ─────────────────────────────────────────────────────────────
    // ERC-1155 Transfer then Claim
    // ─────────────────────────────────────────────────────────────

    function test_claim_afterTransfer_correctProRata() public {
        // Alice mints 4, transfers 1 to bob, then both claim
        _mintForAlice(BRAZIL, 4);
        vm.prank(alice);
        pool.safeTransferFrom(alice, bob, BRAZIL, 1, "");

        _closeMintAndFinalize(BRAZIL);

        uint256 snapshot = pool.finalNationsCupPool();
        uint256 supply   = pool.countryTotalSupply(BRAZIL); // still 4 (burn not tracked)

        uint256 aliceEntitlement = (3 * snapshot) / supply;
        uint256 bobEntitlement   = (1 * snapshot) / supply;

        uint256 aliceBefore = alice.balance;
        uint256 bobBefore   = bob.balance;

        vm.prank(alice);
        pool.claimNationsCupRewards();

        vm.prank(bob);
        pool.claimNationsCupRewards();

        assertApproxEqAbs(alice.balance - aliceBefore, aliceEntitlement * 9500 / 10000, 2);
        assertApproxEqAbs(bob.balance   - bobBefore,   bobEntitlement   * 9500 / 10000, 2);

        // Pool fully drained (max 2 wei dust)
        assertLe(pool.nationsCupPoolBalance(), 2);
    }

    // ─────────────────────────────────────────────────────────────
    // getAllEliminationStatus
    // ─────────────────────────────────────────────────────────────

    function test_getAllEliminationStatus() public {
        uint256[] memory losers = new uint256[](2);
        losers[0] = BRAZIL;
        losers[1] = FRANCE;
        _eliminate(losers);

        bool[49] memory status = pool.getAllEliminationStatus();
        assertTrue(status[BRAZIL]);
        assertTrue(status[FRANCE]);
        assertFalse(status[GERMANY]);
        assertFalse(status[0]); // index 0 always false
    }

    // ─────────────────────────────────────────────────────────────
    // Admin Config
    // ─────────────────────────────────────────────────────────────

    function test_setDevWallet() public {
        address newDev = makeAddr("newDev");
        vm.prank(owner);
        pool.setDevWallet(newDev);
        assertEq(pool.devWallet(), newDev);
    }

    function test_setDevWallet_revertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("Invalid address");
        pool.setDevWallet(address(0));
    }

    // ─────────────────────────────────────────────────────────────
    // Username Ban
    // ─────────────────────────────────────────────────────────────

    function test_banUsername_happy() public {
        assertFalse(pool.isUsernameBanned("badword"));
        vm.prank(owner);
        pool.banUsername("badword");
        assertTrue(pool.isUsernameBanned("badword"));
    }

    function test_banUsername_caseSensitive() public {
        vm.prank(owner);
        pool.banUsername("BadWord");
        assertTrue(pool.isUsernameBanned("BadWord"));
        assertFalse(pool.isUsernameBanned("badword")); // different hash
    }

    function test_banUsername_revertsEmptyName() public {
        vm.prank(owner);
        vm.expectRevert("Empty name");
        pool.banUsername("");
    }

    function test_banUsername_revertsTooLong() public {
        vm.prank(owner);
        vm.expectRevert("Name too long");
        pool.banUsername("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"); // 33 chars
    }

    function test_banUsername_revertsNonOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        pool.banUsername("badword");
    }

    function test_banUsername_emitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit WorldPool26.UsernameBanned("badword");
        pool.banUsername("badword");
    }

    function test_setBaseURI() public {
        string memory newURI = "https://new.example.com/";
        vm.prank(owner);
        pool.setBaseURI(newURI);
        assertEq(pool.baseURI(), newURI);
        assertTrue(bytes(pool.uri(1)).length > 0);
    }

    // ─────────────────────────────────────────────────────────────
    // Fuzz Tests
    // ─────────────────────────────────────────────────────────────

    function testFuzz_mint_correctSplit(uint256 amount) public {
        // Bound to a reasonable size — no per-tx limit in v8
        amount = bound(amount, 1, 20);
        uint256 totalCost = pool.calcMintCost(amount);
        vm.deal(alice, totalCost);

        uint256 devBefore = dev.balance;

        vm.prank(alice);
        pool.mintCountryNFT{value: totalCost}(BRAZIL, amount);

        uint256 expectedDev  = totalCost * pool.DEV_SHARE_BPS() / 10000;
        uint256 expectedPool = totalCost - expectedDev;

        assertEq(dev.balance - devBefore, expectedDev);
        assertEq(pool.nationsCupPoolBalance(), expectedPool);
        assertEq(address(pool).balance, expectedPool);
    }

    function testFuzz_claim_neverExceedsPool(uint256 aliceTokens, uint256 bobTokens) public {
        aliceTokens = bound(aliceTokens, 1, 5);
        bobTokens   = bound(bobTokens, 1, 5);

        // Exhaust early bird first
        _exhaustEarlyBird();

        // Alice and Bob mint full price
        uint256 aliceCost = FULL_PRICE * aliceTokens;
        vm.deal(alice, aliceCost);
        vm.prank(alice);
        pool.mintCountryNFT{value: aliceCost}(BRAZIL, aliceTokens);

        uint256 bobCost = FULL_PRICE * bobTokens;
        vm.deal(bob, bobCost);
        vm.prank(bob);
        pool.mintCountryNFT{value: bobCost}(BRAZIL, bobTokens);

        _closeMintAndFinalize(BRAZIL);

        uint256 contractBalanceBefore = address(pool).balance;

        vm.prank(alice);
        pool.claimNationsCupRewards();

        vm.prank(bob);
        pool.claimNationsCupRewards();

        assertLe(address(pool).balance, 2);
        assertLe(address(pool).balance, contractBalanceBefore);
    }

    // ─────────────────────────────────────────────────────────────
    // On-chain Usernames
    // ─────────────────────────────────────────────────────────────

    function test_setUsername_happy() public {
        vm.prank(alice);
        pool.setUsername("alice26");
        assertEq(pool.usernames(alice), "alice26");
        assertEq(pool.usernameHidden(alice), false);
        assertEq(pool.isUsernameTaken("alice26"), true);
    }

    function test_setUsername_revertsEmpty() public {
        vm.prank(alice);
        vm.expectRevert("Empty name");
        pool.setUsername("");
    }

    function test_setUsername_revertsTooLong() public {
        vm.prank(alice);
        vm.expectRevert("Name too long");
        pool.setUsername("123456789012345678901234567890123"); // 33 chars
    }

    function test_setUsername_revertsTaken() public {
        vm.prank(alice);
        pool.setUsername("coolname");
        vm.prank(bob);
        vm.expectRevert("Name taken");
        pool.setUsername("coolname");
    }

    function test_setUsername_sameOwnerCanReset() public {
        vm.prank(alice);
        pool.setUsername("alice26");
        vm.prank(alice);
        pool.setUsername("alice26");
        assertEq(pool.usernames(alice), "alice26");
    }

    function test_setUsername_releasesOldName() public {
        vm.prank(alice);
        pool.setUsername("alice26");
        vm.prank(alice);
        pool.setUsername("alice_new");
        // old name is now free
        vm.prank(bob);
        pool.setUsername("alice26");
        assertEq(pool.usernames(bob), "alice26");
    }

    function test_setUsername_revertsBanned() public {
        vm.prank(owner);
        pool.banUsername("badword");
        vm.prank(alice);
        vm.expectRevert("Banned");
        pool.setUsername("badword");
    }

    function test_setUsernameHidden_happy() public {
        vm.prank(alice);
        pool.setUsername("alice26");
        vm.prank(alice);
        pool.setUsernameHidden(true);
        assertEq(pool.usernameHidden(alice), true);
        vm.prank(alice);
        pool.setUsernameHidden(false);
        assertEq(pool.usernameHidden(alice), false);
    }

    function test_setUsernameHidden_revertsNoUsername() public {
        vm.prank(alice);
        vm.expectRevert("No username set");
        pool.setUsernameHidden(true);
    }

    function test_setUsername_autoUnhides() public {
        vm.prank(alice);
        pool.setUsername("alice26");
        vm.prank(alice);
        pool.setUsernameHidden(true);
        assertEq(pool.usernameHidden(alice), true);
        vm.prank(alice);
        pool.setUsername("alice_new");
        assertEq(pool.usernameHidden(alice), false);
    }

    function test_isUsernameTaken_falseWhenFree() public view {
        assertEq(pool.isUsernameTaken("freebird"), false);
    }
}
