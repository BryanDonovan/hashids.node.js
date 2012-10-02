/*jshint bitwise:false*/
/*
hashids
http://www.hashids.org/node-js/
(c) 2012 Ivan Akimov

https://github.com/ivanakimov/hashids.node.js
hashids may be freely distributed under the MIT license.
*/

function Hashids(salt, minHashLength, alphabet) {
    var i;

    this.version = "0.1.3";

    this.salt = salt !== null ? salt : "";
    this.alphabet = "xcS4F6h89aUbideAI7tkynuopqrXCgTE5GBKHLMjfRsz";

    this.primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43];
    this.minHashLength = parseInt(minHashLength, 10) > 0 ? minHashLength : 0;

    this.seps = [];
    this.guards = [];

    if (alphabet !== null && typeof alphabet == "string") {
        this.alphabet = alphabet;
    }

    i = 0;
    for (var uniqueAlphabet = "", len = this.alphabet.length; i != len; i++) {
        if (uniqueAlphabet.indexOf(this.alphabet[i]) == -1) {
            uniqueAlphabet += this.alphabet[i];
        }
    }
    this.alphabet = uniqueAlphabet;

    if (this.alphabet.length < 4) {
        throw new Error("Alphabet must contain at least 4 unique characters.");
    }

    for (i = 0, len = this.primes.length; i != len; i++) {
        var prime = this.primes[i];
        if (this.alphabet[prime - 1] !== undefined) {
            var ch = this.alphabet[prime - 1];

            this.seps.push(ch);
            this.alphabet = this.alphabet.replace(new RegExp(ch, "g"), " ");
        } else {
            break;
        }
    }

    var sepsIndices = [0, 4, 8, 12];
    for (i = 0, len = sepsIndices.length; i != len; i++) {
        var index = sepsIndices[i];
        if (this.seps[index] !== undefined) {
            this.guards.push(this.seps[index]);
            this.seps.splice(index, 1);
        }
    }

    this.alphabet = this.alphabet.replace(/\s/g, "");
    this.alphabet = this.consistentShuffle(this.alphabet, this.salt);

}

Hashids.prototype.encrypt = function() {
    var ret = "";
    var numbers = [];
    var i;
    var len;

    for (i = 0, len = arguments.length; i < len; i++) {
        numbers.push(arguments[i]);
    }

    if (!numbers.length) {
        return ret;
    }

    for (i = 0, len = numbers.length; i != len; i++) {
        if (typeof numbers[i] !== "number" || numbers[i] % 1 !== 0 || numbers[i] < 0) {
            return ret;
        }
    }

    return this.encode(numbers, this.alphabet, this.salt, this.minHashLength);

};

Hashids.prototype.decrypt = function(hash) {
    var ret = [];

    if (!hash.length || typeof hash != "string") {
        return ret;
    }

    return this.decode(hash);
};

Hashids.prototype.encode = function(numbers, alphabet, salt, minHashLength) {
    var ret = "";
    var seps = this.consistentShuffle(this.seps, numbers).split("");
    var lotteryChar = "";
    var i;
    var number;
    var len;

    for (i = 0, len = numbers.length; i != len; i++) {
        number = numbers[i];

        if (!i) {
            var lotterySalt = numbers.join("-");
            for (var j = 0; j != len; j++) {
                lotterySalt += "-" + (numbers[j] + 1) * 2;
            }

            var lottery = this.consistentShuffle(alphabet, lotterySalt);
            ret += lotteryChar = lottery[0];

            alphabet = lotteryChar + alphabet.replace(new RegExp(lotteryChar, "g"), "");
        }

        alphabet = this.consistentShuffle(alphabet, (lotteryChar.charCodeAt(0) & 12345) + "" + salt);
        ret += this.hash(number, alphabet);

        if ((i + 1) < numbers.length) {
            var sepsIndex = (number + i) % seps.length;
            ret += seps[sepsIndex];
        }
    }

    if (ret.length < minHashLength) {
        var firstIndex = 0;
        for (i = 0, len = numbers.length; i != len; i++) {
            number = numbers[i];
            firstIndex += (i + 1) * number;
        }

        var guardIndex = firstIndex % this.guards.length,
        guard = this.guards[guardIndex];

        ret = guard + ret;
        if (ret.length < minHashLength) {

            guardIndex = (guardIndex + ret.length) % this.guards.length;
            guard = this.guards[guardIndex];

            ret += guard;
        }
    }

    while (ret.length < minHashLength) {
        var padArray = [alphabet[1].charCodeAt(0), alphabet[0].charCodeAt(0)];
        var padLeft = this.encode(padArray, alphabet, salt);
        var padRight = this.encode(padArray, alphabet, padArray.join(""));

        ret = padLeft + ret + padRight;
        var excess = ret.length - minHashLength;

        if (excess > 0) {
            ret = ret.substr(excess / 2, minHashLength);
        }

        alphabet = this.consistentShuffle(alphabet, salt + ret);
    }

    return ret;
};

Hashids.prototype.decode = function(hash) {
    var ret = [];
    var i;

    if (hash.length) {
        var originalHash = hash;
        var alphabet = "";
        var lotteryChar = "";
        var len;

        for (i = 0, len = this.guards.length; i != len; i++) {
            hash = hash.replace(new RegExp(this.guards[i], "g"), " ");
        }

        var hashSplit = hash.split(" ");

        i = 0;
        if (hashSplit.length == 3 || hashSplit.length == 2) {
            i = 1;
        }

        hash = hashSplit[i];

        for (i = 0, len = this.seps.length; i != len; i++) {
            hash = hash.replace(new RegExp(this.seps[i], "g"), " ");
        }

        var hashArray = hash.split(" ");

        for (i = 0, len = hashArray.length; i != len; i++) {
            var subHash = hashArray[i];
            if (subHash.length) {
                if (!i) {
                    lotteryChar = hash[0];
                    subHash = subHash.substr(1);
                    alphabet = lotteryChar + this.alphabet.replace(lotteryChar, "");
                }

                if (alphabet.length && lotteryChar.length) {
                    alphabet = this.consistentShuffle(alphabet, (lotteryChar.charCodeAt(0) & 12345) + "" + this.salt);
                    ret.push(this.unhash(subHash, alphabet));
                }
            }
        }

        if (this.encrypt.apply(this, ret) != originalHash) {
            ret = [];
        }
    }

    return ret;
};

Hashids.prototype.consistentShuffle = function(alphabet, salt) {
    var ret = "";
    var i;

    if (typeof alphabet == "object") {
        alphabet = alphabet.join("");
    }

    if (typeof salt == "object") {
        salt = salt.join("");
    }

    if (alphabet.length) {
        var alphabetArray = alphabet.split(""),
        saltArray = salt.split(""),
        sortingArray = [];

        if (!saltArray.length) {
            saltArray.push("");
        }

        var len;
        for (i = 0, len = saltArray.length; i != len; i++) {
            sortingArray.push(saltArray[i].charCodeAt(0) || 0);
        }

        for (i = 0, len = sortingArray.length; i != len; i++) {
            var add = true;
            for (var k = i, j = len + i - 1; k != j; k++) {
                var nextIndex = (k + 1) % sortingArray.length;

                if (add) {
                    sortingArray[i] += sortingArray[nextIndex] + (k * i);
                } else {
                    sortingArray[i] -= sortingArray[nextIndex];
                }

                add = !add;
            }
            sortingArray[i] = Math.abs(sortingArray[i]);
        }

        i = 0;
        while (alphabetArray.length) {
            var alphabetSize = alphabetArray.length;
            var pos = sortingArray[i];

            if (pos >= alphabetSize) {
                pos %= alphabetSize;
            }

            ret += alphabetArray[pos];
            alphabetArray.splice(pos, 1);

            i = ++i % sortingArray.length;
        }
    }
    return ret;
};

Hashids.prototype.hash = function(number, alphabet) {
    var hash = "";
    var alphabetLength = alphabet.length;

    do {
        hash = alphabet[number % alphabetLength] + hash;
        number = parseInt(number / alphabetLength, 10);
    } while (number);

    return hash;
};

Hashids.prototype.unhash = function(hash, alphabet) {
    var number = 0;
    var pos;

    for (var i = 0; i < hash.length; i++) {
        pos = alphabet.indexOf(hash[i]);
        number += pos * Math.pow(alphabet.length, hash.length - i - 1);
    }

    return number;
};

module.exports = Hashids;
