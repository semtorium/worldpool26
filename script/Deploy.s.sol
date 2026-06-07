// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ABSWorldPool} from "../src/ABSWorldPool.sol";

contract Deploy is Script {
    function run() external {
        address devWallet = vm.envAddress("DEV_WALLET");
        string memory baseURI = vm.envString("BASE_URI");
        uint256 privateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        ABSWorldPool pool = new ABSWorldPool(devWallet, baseURI);
        vm.stopBroadcast();

        console.log("Deployed to:", address(pool));
        console.log("Dev wallet :", devWallet);
        console.log("Base URI   :", baseURI);
    }
}
