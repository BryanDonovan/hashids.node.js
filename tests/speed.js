/* Test for speed */
var assert = require('assert');

var number_of_ints_to_encrypt_at_once = 3;
var start_at = 0;
var end_at = 100;

/* This script will encrypt AND decrypt (when it decrypts it checks that hash is legit) */

var Hashid = require("../index");
var hashes = new Hashid("this is my salt");

function microtime() {
    return new Date().getTime() / 1000;
}

var total = 0;
var time_start = microtime();
var time_stop = 0;

var numbers;
var hash;

for (var i = start_at; i <= end_at; i++, total++) {
    numbers = [];
    for (var j = 0; j < number_of_ints_to_encrypt_at_once; j++) {
        numbers[j] = i;
    }

    hash = hashes.encrypt.apply(hashes, numbers);
    var decrypted_numbers = hashes.decrypt(hash);
    assert.deepEqual(decrypted_numbers, numbers);
}

time_stop = microtime();
console.log("Total hashes created: " + total);
console.log("Total time: " + (time_stop - time_start));
