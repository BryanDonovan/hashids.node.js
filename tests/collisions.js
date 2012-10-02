/* Test for collisions with 3 integers */
var assert = require('assert');

var start_at = 0;
var end_at = 15;

/* this script will create hashes and check against each other to make sure there are no collisions */

var Hashid = require("../index");
var hashes = new Hashid("this is my salt");

var hash_obj = {};
var total = 0;
var hash = "";

for (var i = start_at; i <= end_at; i++) {
    for (var j = start_at; j <= end_at; j++) {
        for (var k = start_at; k <= end_at; k++, total++) {
            hash = hashes.encrypt(i, j, k);
            //console.log(hash + " - " + i + ", " + j + ", " + k);

            var msg = "Collision for " + hash + ": " + i + ", " + j + ", " + k + " and " + hash_obj[hash];
            assert.ok(!(hash in hash_obj), msg);
            hash_obj[hash] = i + ", " + j + ", " + k;
        }
    }
}

console.log("Ran through " + total + " hashes.");
