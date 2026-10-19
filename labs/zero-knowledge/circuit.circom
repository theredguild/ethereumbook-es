// SPDX-License-Identifier: GPL-3.0-or-later
pragma circom 2.2.2;
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";

template Knowledge() {
    signal input commitment;
    signal input secret;
    signal input salt;
    component secretBits = Num2Bits(128);
    component saltBits = Num2Bits(128);
    secretBits.in <== secret;
    saltBits.in <== salt;
    component hash = Poseidon(3);
    hash.inputs[0] <== 17;
    hash.inputs[1] <== secret;
    hash.inputs[2] <== salt;
    hash.out === commitment;
}

component main {public [commitment]} = Knowledge();
