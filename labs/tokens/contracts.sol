// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract WholeUnitsToken is ERC20 {
    constructor(address alice) ERC20("Unidades educativas", "UNI") {
        _mint(alice, 1000);
    }

    // Unidades enteras para este ejercicio, sin fracciones ocultas.
    function decimals() public pure override returns (uint8) {
        return 0;
    }
}

contract IdentifiedTokens is ERC721 {
    constructor(address alice) ERC721("Identificadores educativos", "ID") {
        _mint(alice, 1);
        _mint(alice, 2);
    }
}
