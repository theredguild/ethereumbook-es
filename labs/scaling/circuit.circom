// SPDX-License-Identifier: GPL-3.0-or-later
pragma circom 2.2.2;
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";

// Toy units only. No EVM, signatures, fees, nonces or Ethereum consensus.
template Batch() {
    signal input before[2];
    signal input after[2];
    signal input commitment;
    signal input amountAB;
    signal input amountBA;
    signal input salt;
    signal middle[2];
    middle[0] <== before[0] - amountAB;
    middle[1] <== before[1] + amountAB;
    after[0] === middle[0] + amountBA;
    after[1] === middle[1] - amountBA;
    signal values[8];
    values[0] <== before[0];
    values[1] <== before[1];
    values[2] <== middle[0];
    values[3] <== middle[1];
    values[4] <== after[0];
    values[5] <== after[1];
    values[6] <== amountAB;
    values[7] <== amountBA;
    component ranges[8];
    for (var i = 0; i < 8; i++) {
        ranges[i] = Num2Bits(32);
        ranges[i].in <== values[i];
    }
    component saltBits = Num2Bits(128);
    saltBits.in <== salt;
    component hash = Poseidon(4);
    hash.inputs[0] <== 16;
    hash.inputs[1] <== amountAB;
    hash.inputs[2] <== amountBA;
    hash.inputs[3] <== salt;
    hash.out === commitment;
}

component main {public [before, after, commitment]} = Batch();
