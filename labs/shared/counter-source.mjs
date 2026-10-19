export const SOLIDITY_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract LabCounter {
    uint256 public value;
    address public immutable owner;
    event ValueChanged(address indexed sender, uint256 value);

    constructor() { owner = msg.sender; }

    function set_value(uint256 next) external {
        require(msg.sender == owner, "Solo propietario");
        require(next <= 1000, "Maximo 1000");
        value = next;
        emit ValueChanged(msg.sender, next);
    }

    function fail() external {
        value = 999;
        revert("Cambio revertido");
    }
}
`

export const VYPER_SOURCE = `#pragma version 0.4.3

event ValueChanged:
    sender: indexed(address)
    value: uint256

value: public(uint256)
owner: public(address)

@deploy
def __init__():
    self.owner = msg.sender

@external
def set_value(next: uint256):
    assert msg.sender == self.owner, "Solo propietario"
    assert next <= 1000, "Maximo 1000"
    self.value = next
    log ValueChanged(sender=msg.sender, value=next)

@external
def fail():
    self.value = 999
    raise "Cambio revertido"
`
