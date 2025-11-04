// ==UserScript==
// @name Quality of RWTH
// @description Makes RWTH websites more enjoyable
// @author RcCookie and Contributors
// @version 1.12.4
// @inject-info content
// @match *://*.rwth-aachen.de/*
// @match *://*.rwth.video/*
// @grant GM.getValue
// @grant GM.setValue
// @grant GM.deleteValue
// @grant GM.listValues
// ==/UserScript==

//#region userscript-webext-adapter.js
const browser = (() => {
    const storageArea = {
        get: async keys => {
            if(keys === undefined)
                keys = await GM.listValues();
            if(Array.isArray(keys))
                keys = Object.fromEntries(keys.map(k => [k,undefined]));
            else if(typeof keys !== 'object')
                keys = { [keys]: undefined };
            return Object.fromEntries(await Promise.all(
                Object.entries(keys).map(([k,v]) => GM.getValue(k,v).then(val => [k, val]))
            ));
        },
        set: entries => Promise.all(Object.entries(entries).map(([k,v]) => GM.setValue(k,v))),
        getKeys: GM.listValues,
        remove: async keys => {
            if(!Array.isArray(keys))
                keys = [keys]
            return Promise.all(keys.map(GM.deleteValue));
        },
        clear: async () => await Promise.all((await GM.listValues()).map(GM.deleteValue))
    };
    return {
        storage: {
            local: storageArea,
            managed: storageArea,
            session: storageArea,
            sync: storageArea
        },
        runtime: {
            sendMessage: async () => console.log("browser.sendMessage() not supported in UserScript, ignoring")
        }
    }
})();
//#endregion userscript-webext-adapter.js

//#region totp.js
(() => {
/*
MIT License

Copyright (c) 2017 Allan Jiang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * @preserve A JavaScript implementation of the SHA family of hashes, as
 * defined in FIPS PUB 180-2 as well as the corresponding HMAC implementation
 * as defined in FIPS PUB 198a
 *
 * Copyright Brian Turek 2008-2015
 * Distributed under the BSD License
 * See http://caligatio.github.com/jsSHA/ for more information
 *
 * Several functions taken from Paul Johnston
 */

 /**
  * SUPPORTED_ALGS is the stub for a compile flag that will cause pruning of
  * functions that are not needed when a limited number of SHA families are
  * selected
  *
  * @define {number} ORed value of SHA variants to be supported
  *   1 = SHA-1, 2 = SHA-224/SHA-256, 4 = SHA-384/SHA-512
  */
 var SUPPORTED_ALGS = 4 | 2 | 1;

 (function (global)
 {
     "use strict";
     /**
      * Int_64 is a object for 2 32-bit numbers emulating a 64-bit number
      *
      * @private
      * @constructor
      * @this {Int_64}
      * @param {number} msint_32 The most significant 32-bits of a 64-bit number
      * @param {number} lsint_32 The least significant 32-bits of a 64-bit number
      */
     function Int_64(msint_32, lsint_32)
     {
         this.highOrder = msint_32;
         this.lowOrder = lsint_32;
     }

     /**
      * Convert a string to an array of big-endian words
      *
      * There is a known bug with an odd number of existing bytes and using a
      * UTF-16 encoding.  However, this function is used such that the existing
      * bytes are always a result of a previous UTF-16 str2binb call and
      * therefore there should never be an odd number of existing bytes
      *
      * @private
      * @param {string} str String to be converted to binary representation
      * @param {string} utfType The Unicode type, UTF8 or UTF16BE, UTF16LE, to
      *   use to encode the source string
      * @param {Array.<number>} existingBin A packed int array of bytes to
      *   append the results to
      * @param {number} existingBinLen The number of bits in the existingBin
      *   array
      * @return {{value : Array.<number>, binLen : number}} Hash list where
      *   "value" contains the output number array and "binLen" is the binary
      *   length of "value"
      */
     function str2binb(str, utfType, existingBin, existingBinLen)
     {
         var bin = [], codePnt, binArr = [], byteCnt = 0, i, j, existingByteLen,
             intOffset, byteOffset;

         bin = existingBin || [0];
         existingBinLen = existingBinLen || 0;
         existingByteLen = existingBinLen >>> 3;

         if ("UTF8" === utfType)
         {
             for (i = 0; i < str.length; i += 1)
             {
                 codePnt = str.charCodeAt(i);
                 binArr = [];

                 if (0x80 > codePnt)
                 {
                     binArr.push(codePnt);
                 }
                 else if (0x800 > codePnt)
                 {
                     binArr.push(0xC0 | (codePnt >>> 6));
                     binArr.push(0x80 | (codePnt & 0x3F));
                 }
                 else if ((0xd800 > codePnt) || (0xe000 <= codePnt)) {
                     binArr.push(
                         0xe0 | (codePnt >>> 12),
                         0x80 | ((codePnt >>> 6) & 0x3f),
                         0x80 | (codePnt & 0x3f)
                     );
                 }
                 else
                 {
                     i += 1;
                     codePnt = 0x10000 + (((codePnt & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
                     binArr.push(
                         0xf0 | (codePnt >>> 18),
                         0x80 | ((codePnt >>> 12) & 0x3f),
                         0x80 | ((codePnt >>> 6) & 0x3f),
                         0x80 | (codePnt & 0x3f)
                     );
                 }

                 for (j = 0; j < binArr.length; j += 1)
                 {
                     byteOffset = byteCnt + existingByteLen;
                     intOffset = byteOffset >>> 2;
                     while (bin.length <= intOffset)
                     {
                         bin.push(0);
                     }
                     /* Known bug kicks in here */
                     bin[intOffset] |= binArr[j] << (8 * (3 - (byteOffset % 4)));
                     byteCnt += 1;
                 }
             }
         }
         else if (("UTF16BE" === utfType) || "UTF16LE" === utfType)
         {
             for (i = 0; i < str.length; i += 1)
             {
                 codePnt = str.charCodeAt(i);
                 /* Internally strings are UTF-16BE so only change if UTF-16LE */
                 if ("UTF16LE" === utfType)
                 {
                     j = codePnt & 0xFF;
                     codePnt = (j << 8) | (codePnt >>> 8);
                 }

                 byteOffset = byteCnt + existingByteLen;
                 intOffset = byteOffset >>> 2;
                 while (bin.length <= intOffset)
                 {
                     bin.push(0);
                 }
                 bin[intOffset] |= codePnt << (8 * (2 - (byteOffset % 4)));
                 byteCnt += 2;
             }
         }
         return {"value" : bin, "binLen" : byteCnt * 8 + existingBinLen};
     }

     /**
      * Convert a hex string to an array of big-endian words
      *
      * @private
      * @param {string} str String to be converted to binary representation
      * @param {Array.<number>} existingBin A packed int array of bytes to
      *   append the results to
      * @param {number} existingBinLen The number of bits in the existingBin
      *   array
      * @return {{value : Array.<number>, binLen : number}} Hash list where
      *   "value" contains the output number array and "binLen" is the binary
      *   length of "value"
      */
     function hex2binb(str, existingBin, existingBinLen)
     {
         var bin, length = str.length, i, num, intOffset, byteOffset,
             existingByteLen;

         bin = existingBin || [0];
         existingBinLen = existingBinLen || 0;
         existingByteLen = existingBinLen >>> 3;

         if (0 !== (length % 2))
         {
             throw new Error("String of HEX type must be in byte increments");
         }

         for (i = 0; i < length; i += 2)
         {
             num = parseInt(str.substr(i, 2), 16);
             if (!isNaN(num))
             {
                 byteOffset = (i >>> 1) + existingByteLen;
                 intOffset = byteOffset >>> 2;
                 while (bin.length <= intOffset)
                 {
                     bin.push(0);
                 }
                 bin[intOffset] |= num << 8 * (3 - (byteOffset % 4));
             }
             else
             {
                 throw new Error("String of HEX type contains invalid characters");
             }
         }

         return {"value" : bin, "binLen" : length * 4 + existingBinLen};
     }

     /**
      * Convert a string of raw bytes to an array of big-endian words
      *
      * @private
      * @param {string} str String of raw bytes to be converted to binary representation
      * @param {Array.<number>} existingBin A packed int array of bytes to
      *   append the results to
      * @param {number} existingBinLen The number of bits in the existingBin
      *   array
      * @return {{value : Array.<number>, binLen : number}} Hash list where
      *   "value" contains the output number array and "binLen" is the binary
      *   length of "value"
      */
     function bytes2binb(str, existingBin, existingBinLen)
     {
         var bin = [], codePnt, i, existingByteLen, intOffset,
             byteOffset;

         bin = existingBin || [0];
         existingBinLen = existingBinLen || 0;
         existingByteLen = existingBinLen >>> 3;

         for (i = 0; i < str.length; i += 1)
         {
             codePnt = str.charCodeAt(i);

             byteOffset = i + existingByteLen;
             intOffset = byteOffset >>> 2;
             if (bin.length <= intOffset)
             {
                 bin.push(0);
             }
             bin[intOffset] |= codePnt << 8 * (3 - (byteOffset % 4));
         }

         return {"value" : bin, "binLen" : str.length * 8 + existingBinLen};
     }

     /**
      * Convert a base-64 string to an array of big-endian words
      *
      * @private
      * @param {string} str String to be converted to binary representation
      * @param {Array.<number>} existingBin A packed int array of bytes to
      *   append the results to
      * @param {number} existingBinLen The number of bits in the existingBin
      *   array
      * @return {{value : Array.<number>, binLen : number}} Hash list where
      *   "value" contains the output number array and "binLen" is the binary
      *   length of "value"
      */
     function b642binb(str, existingBin, existingBinLen)
     {
         var bin = [], byteCnt = 0, index, i, j, tmpInt, strPart, firstEqual,
             b64Tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
             existingByteLen, intOffset, byteOffset;

         bin = existingBin || [0];
         existingBinLen = existingBinLen || 0;
         existingByteLen = existingBinLen >>> 3;

         if (-1 === str.search(/^[a-zA-Z0-9=+\/]+$/))
         {
             throw new Error("Invalid character in base-64 string");
         }
         firstEqual = str.indexOf('=');
         str = str.replace(/\=/g, '');
         if ((-1 !== firstEqual) && (firstEqual < str.length))
         {
             throw new Error("Invalid '=' found in base-64 string");
         }

         for (i = 0; i < str.length; i += 4)
         {
             strPart = str.substr(i, 4);
             tmpInt = 0;

             for (j = 0; j < strPart.length; j += 1)
             {
                 index = b64Tab.indexOf(strPart[j]);
                 tmpInt |= index << (18 - (6 * j));
             }

             for (j = 0; j < strPart.length - 1; j += 1)
             {
                 byteOffset = byteCnt + existingByteLen;
                 intOffset = byteOffset >>> 2;
                 while (bin.length <= intOffset)
                 {
                     bin.push(0);
                 }
                 bin[intOffset] |= ((tmpInt >>> (16 - (j * 8))) & 0xFF) <<
                     8 * (3 - (byteOffset % 4));
                 byteCnt += 1;
             }
         }

         return {"value" : bin, "binLen" : byteCnt * 8 + existingBinLen};
     }

     /**
      * Convert an array of big-endian words to a hex string.
      *
      * @private
      * @param {Array.<number>} binarray Array of integers to be converted to
      *   hexidecimal representation
      * @param {{outputUpper : boolean, b64Pad : string}} formatOpts Hash list
      *   containing validated output formatting options
      * @return {string} Hexidecimal representation of the parameter in string
      *   form
      */
     function binb2hex(binarray, formatOpts)
     {
         var hex_tab = "0123456789abcdef", str = "",
             length = binarray.length * 4, i, srcByte;

         for (i = 0; i < length; i += 1)
         {
             /* The below is more than a byte but it gets taken care of later */
             srcByte = binarray[i >>> 2] >>> ((3 - (i % 4)) * 8);
             str += hex_tab.charAt((srcByte >>> 4) & 0xF) +
                 hex_tab.charAt(srcByte & 0xF);
         }

         return (formatOpts["outputUpper"]) ? str.toUpperCase() : str;
     }

     /**
      * Convert an array of big-endian words to a base-64 string
      *
      * @private
      * @param {Array.<number>} binarray Array of integers to be converted to
      *   base-64 representation
      * @param {{outputUpper : boolean, b64Pad : string}} formatOpts Hash list
      *   containing validated output formatting options
      * @return {string} Base-64 encoded representation of the parameter in
      *   string form
      */
     function binb2b64(binarray, formatOpts)
     {
         var str = "", length = binarray.length * 4, i, j, triplet, offset, int1, int2,
             b64Tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

         for (i = 0; i < length; i += 3)
         {
             offset = (i + 1) >>> 2;
             int1 = (binarray.length <= offset) ? 0 : binarray[offset];
             offset = (i + 2) >>> 2;
             int2 = (binarray.length <= offset) ? 0 : binarray[offset];
             triplet = (((binarray[i >>> 2] >>> 8 * (3 - i % 4)) & 0xFF) << 16) |
                 (((int1 >>> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) |
                 ((int2 >>> 8 * (3 - (i + 2) % 4)) & 0xFF);
             for (j = 0; j < 4; j += 1)
             {
                 if (i * 8 + j * 6 <= binarray.length * 32)
                 {
                     str += b64Tab.charAt((triplet >>> 6 * (3 - j)) & 0x3F);
                 }
                 else
                 {
                     str += formatOpts["b64Pad"];
                 }
             }
         }
         return str;
     }

     /**
      * Convert an array of big-endian words to raw bytes string
      *
      * @private
      * @param {Array.<number>} binarray Array of integers to be converted to
      *   a raw bytes string representation
      * @return {string} Raw bytes representation of the parameter in string
      *   form
      */
     function binb2bytes(binarray)
     {
         var str = "", length = binarray.length * 4, i, srcByte;

         for (i = 0; i < length; i += 1)
         {
             srcByte = (binarray[i >>> 2] >>> ((3 - (i % 4)) * 8)) & 0xFF;
             str += String.fromCharCode(srcByte);
         }

         return str;
     }

     /**
      * Validate hash list containing output formatting options, ensuring
      * presence of every option or adding the default value
      *
      * @private
      * @param {{outputUpper : (boolean|undefined), b64Pad : (string|undefined)}=}
      *   options Hash list of output formatting options
      * @return {{outputUpper : boolean, b64Pad : string}} Validated hash list
      *   containing output formatting options
      */
     function getOutputOpts(options)
     {
         var retVal = {"outputUpper" : false, "b64Pad" : "="}, outputOptions;
         outputOptions = options || {};

         retVal["outputUpper"] = outputOptions["outputUpper"] || false;
         retVal["b64Pad"] = outputOptions["b64Pad"] || "=";

         if ("boolean" !== typeof(retVal["outputUpper"]))
         {
             throw new Error("Invalid outputUpper formatting option");
         }

         if ("string" !== typeof(retVal["b64Pad"]))
         {
             throw new Error("Invalid b64Pad formatting option");
         }

         return retVal;
     }

     /**
      * Function that takes an input format and UTF encoding and returns the
      * appropriate function used to convert the input.
      *
      * @private
      * @param {string} format The format of the string to be converted
      * @param {string} utfType The string encoding to use (UTF8, UTF16BE,
      *	UTF16LE)
      * @return {function(string, Array.<number>=, number=): {value :
      *   Array.<number>, binLen : number}} Function that will convert an input
      *   string to a packed int array
      */
     function getStrConverter(format, utfType)
     {
         var retVal;

         /* Validate encoding */
         switch (utfType)
         {
         case "UTF8":
             /* Fallthrough */
         case "UTF16BE":
             /* Fallthrough */
         case "UTF16LE":
             /* Fallthrough */
             break;
         default:
             throw new Error("encoding must be UTF8, UTF16BE, or UTF16LE");
         }

         /* Map inputFormat to the appropriate converter */
         switch (format)
         {
         case "HEX":
             retVal = hex2binb;
             break;
         case "TEXT":
             retVal = function(str, existingBin, existingBinLen)
                 {
                     return str2binb(str, utfType, existingBin, existingBinLen);
                 };
             break;
         case "B64":
             retVal = b642binb;
             break;
         case "BYTES":
             retVal = bytes2binb;
             break;
         default:
             throw new Error("format must be HEX, TEXT, B64, or BYTES");
         }

         return retVal;
     }

     /**
      * The 32-bit implementation of circular rotate left
      *
      * @private
      * @param {number} x The 32-bit integer argument
      * @param {number} n The number of bits to shift
      * @return {number} The x shifted circularly by n bits
      */
     function rotl_32(x, n)
     {
         return (x << n) | (x >>> (32 - n));
     }

     /**
      * The 32-bit implementation of circular rotate right
      *
      * @private
      * @param {number} x The 32-bit integer argument
      * @param {number} n The number of bits to shift
      * @return {number} The x shifted circularly by n bits
      */
     function rotr_32(x, n)
     {
         return (x >>> n) | (x << (32 - n));
     }

     /**
      * The 64-bit implementation of circular rotate right
      *
      * @private
      * @param {Int_64} x The 64-bit integer argument
      * @param {number} n The number of bits to shift
      * @return {Int_64} The x shifted circularly by n bits
      */
     function rotr_64(x, n)
     {
         var retVal = null, tmp = new Int_64(x.highOrder, x.lowOrder);

         if (32 >= n)
         {
             retVal = new Int_64(
                     (tmp.highOrder >>> n) | ((tmp.lowOrder << (32 - n)) & 0xFFFFFFFF),
                     (tmp.lowOrder >>> n) | ((tmp.highOrder << (32 - n)) & 0xFFFFFFFF)
                 );
         }
         else
         {
             retVal = new Int_64(
                     (tmp.lowOrder >>> (n - 32)) | ((tmp.highOrder << (64 - n)) & 0xFFFFFFFF),
                     (tmp.highOrder >>> (n - 32)) | ((tmp.lowOrder << (64 - n)) & 0xFFFFFFFF)
                 );
         }

         return retVal;
     }

     /**
      * The 32-bit implementation of shift right
      *
      * @private
      * @param {number} x The 32-bit integer argument
      * @param {number} n The number of bits to shift
      * @return {number} The x shifted by n bits
      */
     function shr_32(x, n)
     {
         return x >>> n;
     }

     /**
      * The 64-bit implementation of shift right
      *
      * @private
      * @param {Int_64} x The 64-bit integer argument
      * @param {number} n The number of bits to shift
      * @return {Int_64} The x shifted by n bits
      */
     function shr_64(x, n)
     {
         var retVal = null;

         if (32 >= n)
         {
             retVal = new Int_64(
                     x.highOrder >>> n,
                     x.lowOrder >>> n | ((x.highOrder << (32 - n)) & 0xFFFFFFFF)
                 );
         }
         else
         {
             retVal = new Int_64(
                     0,
                     x.highOrder >>> (n - 32)
                 );
         }

         return retVal;
     }

     /**
      * The 32-bit implementation of the NIST specified Parity function
      *
      * @private
      * @param {number} x The first 32-bit integer argument
      * @param {number} y The second 32-bit integer argument
      * @param {number} z The third 32-bit integer argument
      * @return {number} The NIST specified output of the function
      */
     function parity_32(x, y, z)
     {
         return x ^ y ^ z;
     }

     /**
      * The 32-bit implementation of the NIST specified Ch function
      *
      * @private
      * @param {number} x The first 32-bit integer argument
      * @param {number} y The second 32-bit integer argument
      * @param {number} z The third 32-bit integer argument
      * @return {number} The NIST specified output of the function
      */
     function ch_32(x, y, z)
     {
         return (x & y) ^ (~x & z);
     }

     /**
      * The 64-bit implementation of the NIST specified Ch function
      *
      * @private
      * @param {Int_64} x The first 64-bit integer argument
      * @param {Int_64} y The second 64-bit integer argument
      * @param {Int_64} z The third 64-bit integer argument
      * @return {Int_64} The NIST specified output of the function
      */
     function ch_64(x, y, z)
     {
         return new Int_64(
                 (x.highOrder & y.highOrder) ^ (~x.highOrder & z.highOrder),
                 (x.lowOrder & y.lowOrder) ^ (~x.lowOrder & z.lowOrder)
             );
     }

     /**
      * The 32-bit implementation of the NIST specified Maj function
      *
      * @private
      * @param {number} x The first 32-bit integer argument
      * @param {number} y The second 32-bit integer argument
      * @param {number} z The third 32-bit integer argument
      * @return {number} The NIST specified output of the function
      */
     function maj_32(x, y, z)
     {
         return (x & y) ^ (x & z) ^ (y & z);
     }

     /**
      * The 64-bit implementation of the NIST specified Maj function
      *
      * @private
      * @param {Int_64} x The first 64-bit integer argument
      * @param {Int_64} y The second 64-bit integer argument
      * @param {Int_64} z The third 64-bit integer argument
      * @return {Int_64} The NIST specified output of the function
      */
     function maj_64(x, y, z)
     {
         return new Int_64(
                 (x.highOrder & y.highOrder) ^
                 (x.highOrder & z.highOrder) ^
                 (y.highOrder & z.highOrder),
                 (x.lowOrder & y.lowOrder) ^
                 (x.lowOrder & z.lowOrder) ^
                 (y.lowOrder & z.lowOrder)
             );
     }

     /**
      * The 32-bit implementation of the NIST specified Sigma0 function
      *
      * @private
      * @param {number} x The 32-bit integer argument
      * @return {number} The NIST specified output of the function
      */
     function sigma0_32(x)
     {
         return rotr_32(x, 2) ^ rotr_32(x, 13) ^ rotr_32(x, 22);
     }

     /**
      * The 64-bit implementation of the NIST specified Sigma0 function
      *
      * @private
      * @param {Int_64} x The 64-bit integer argument
      * @return {Int_64} The NIST specified output of the function
      */
     function sigma0_64(x)
     {
         var rotr28 = rotr_64(x, 28), rotr34 = rotr_64(x, 34),
             rotr39 = rotr_64(x, 39);

         return new Int_64(
                 rotr28.highOrder ^ rotr34.highOrder ^ rotr39.highOrder,
                 rotr28.lowOrder ^ rotr34.lowOrder ^ rotr39.lowOrder);
     }

     /**
      * The 32-bit implementation of the NIST specified Sigma1 function
      *
      * @private
      * @param {number} x The 32-bit integer argument
      * @return {number} The NIST specified output of the function
      */
     function sigma1_32(x)
     {
         return rotr_32(x, 6) ^ rotr_32(x, 11) ^ rotr_32(x, 25);
     }

     /**
      * The 64-bit implementation of the NIST specified Sigma1 function
      *
      * @private
      * @param {Int_64} x The 64-bit integer argument
      * @return {Int_64} The NIST specified output of the function
      */
     function sigma1_64(x)
     {
         var rotr14 = rotr_64(x, 14), rotr18 = rotr_64(x, 18),
             rotr41 = rotr_64(x, 41);

         return new Int_64(
                 rotr14.highOrder ^ rotr18.highOrder ^ rotr41.highOrder,
                 rotr14.lowOrder ^ rotr18.lowOrder ^ rotr41.lowOrder);
     }

     /**
      * The 32-bit implementation of the NIST specified Gamma0 function
      *
      * @private
      * @param {number} x The 32-bit integer argument
      * @return {number} The NIST specified output of the function
      */
     function gamma0_32(x)
     {
         return rotr_32(x, 7) ^ rotr_32(x, 18) ^ shr_32(x, 3);
     }

     /**
      * The 64-bit implementation of the NIST specified Gamma0 function
      *
      * @private
      * @param {Int_64} x The 64-bit integer argument
      * @return {Int_64} The NIST specified output of the function
      */
     function gamma0_64(x)
     {
         var rotr1 = rotr_64(x, 1), rotr8 = rotr_64(x, 8), shr7 = shr_64(x, 7);

         return new Int_64(
                 rotr1.highOrder ^ rotr8.highOrder ^ shr7.highOrder,
                 rotr1.lowOrder ^ rotr8.lowOrder ^ shr7.lowOrder
             );
     }

     /**
      * The 32-bit implementation of the NIST specified Gamma1 function
      *
      * @private
      * @param {number} x The 32-bit integer argument
      * @return {number} The NIST specified output of the function
      */
     function gamma1_32(x)
     {
         return rotr_32(x, 17) ^ rotr_32(x, 19) ^ shr_32(x, 10);
     }

     /**
      * The 64-bit implementation of the NIST specified Gamma1 function
      *
      * @private
      * @param {Int_64} x The 64-bit integer argument
      * @return {Int_64} The NIST specified output of the function
      */
     function gamma1_64(x)
     {
         var rotr19 = rotr_64(x, 19), rotr61 = rotr_64(x, 61),
             shr6 = shr_64(x, 6);

         return new Int_64(
                 rotr19.highOrder ^ rotr61.highOrder ^ shr6.highOrder,
                 rotr19.lowOrder ^ rotr61.lowOrder ^ shr6.lowOrder
             );
     }

     /**
      * Add two 32-bit integers, wrapping at 2^32. This uses 16-bit operations
      * internally to work around bugs in some JS interpreters.
      *
      * @private
      * @param {number} a The first 32-bit integer argument to be added
      * @param {number} b The second 32-bit integer argument to be added
      * @return {number} The sum of a + b
      */
     function safeAdd_32_2(a, b)
     {
         var lsw = (a & 0xFFFF) + (b & 0xFFFF),
             msw = (a >>> 16) + (b >>> 16) + (lsw >>> 16);

         return ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
     }

     /**
      * Add four 32-bit integers, wrapping at 2^32. This uses 16-bit operations
      * internally to work around bugs in some JS interpreters.
      *
      * @private
      * @param {number} a The first 32-bit integer argument to be added
      * @param {number} b The second 32-bit integer argument to be added
      * @param {number} c The third 32-bit integer argument to be added
      * @param {number} d The fourth 32-bit integer argument to be added
      * @return {number} The sum of a + b + c + d
      */
     function safeAdd_32_4(a, b, c, d)
     {
         var lsw = (a & 0xFFFF) + (b & 0xFFFF) + (c & 0xFFFF) + (d & 0xFFFF),
             msw = (a >>> 16) + (b >>> 16) + (c >>> 16) + (d >>> 16) +
                 (lsw >>> 16);

         return ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
     }

     /**
      * Add five 32-bit integers, wrapping at 2^32. This uses 16-bit operations
      * internally to work around bugs in some JS interpreters.
      *
      * @private
      * @param {number} a The first 32-bit integer argument to be added
      * @param {number} b The second 32-bit integer argument to be added
      * @param {number} c The third 32-bit integer argument to be added
      * @param {number} d The fourth 32-bit integer argument to be added
      * @param {number} e The fifth 32-bit integer argument to be added
      * @return {number} The sum of a + b + c + d + e
      */
     function safeAdd_32_5(a, b, c, d, e)
     {
         var lsw = (a & 0xFFFF) + (b & 0xFFFF) + (c & 0xFFFF) + (d & 0xFFFF) +
                 (e & 0xFFFF),
             msw = (a >>> 16) + (b >>> 16) + (c >>> 16) + (d >>> 16) +
                 (e >>> 16) + (lsw >>> 16);

         return ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);
     }

     /**
      * Add two 64-bit integers, wrapping at 2^64. This uses 16-bit operations
      * internally to work around bugs in some JS interpreters.
      *
      * @private
      * @param {Int_64} x The first 64-bit integer argument to be added
      * @param {Int_64} y The second 64-bit integer argument to be added
      * @return {Int_64} The sum of x + y
      */
     function safeAdd_64_2(x, y)
     {
         var lsw, msw, lowOrder, highOrder;

         lsw = (x.lowOrder & 0xFFFF) + (y.lowOrder & 0xFFFF);
         msw = (x.lowOrder >>> 16) + (y.lowOrder >>> 16) + (lsw >>> 16);
         lowOrder = ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);

         lsw = (x.highOrder & 0xFFFF) + (y.highOrder & 0xFFFF) + (msw >>> 16);
         msw = (x.highOrder >>> 16) + (y.highOrder >>> 16) + (lsw >>> 16);
         highOrder = ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);

         return new Int_64(highOrder, lowOrder);
     }

     /**
      * Add four 64-bit integers, wrapping at 2^64. This uses 16-bit operations
      * internally to work around bugs in some JS interpreters.
      *
      * @private
      * @param {Int_64} a The first 64-bit integer argument to be added
      * @param {Int_64} b The second 64-bit integer argument to be added
      * @param {Int_64} c The third 64-bit integer argument to be added
      * @param {Int_64} d The fouth 64-bit integer argument to be added
      * @return {Int_64} The sum of a + b + c + d
      */
     function safeAdd_64_4(a, b, c, d)
     {
         var lsw, msw, lowOrder, highOrder;

         lsw = (a.lowOrder & 0xFFFF) + (b.lowOrder & 0xFFFF) +
             (c.lowOrder & 0xFFFF) + (d.lowOrder & 0xFFFF);
         msw = (a.lowOrder >>> 16) + (b.lowOrder >>> 16) +
             (c.lowOrder >>> 16) + (d.lowOrder >>> 16) + (lsw >>> 16);
         lowOrder = ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);

         lsw = (a.highOrder & 0xFFFF) + (b.highOrder & 0xFFFF) +
             (c.highOrder & 0xFFFF) + (d.highOrder & 0xFFFF) + (msw >>> 16);
         msw = (a.highOrder >>> 16) + (b.highOrder >>> 16) +
             (c.highOrder >>> 16) + (d.highOrder >>> 16) + (lsw >>> 16);
         highOrder = ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);

         return new Int_64(highOrder, lowOrder);
     }

     /**
      * Add five 64-bit integers, wrapping at 2^64. This uses 16-bit operations
      * internally to work around bugs in some JS interpreters.
      *
      * @private
      * @param {Int_64} a The first 64-bit integer argument to be added
      * @param {Int_64} b The second 64-bit integer argument to be added
      * @param {Int_64} c The third 64-bit integer argument to be added
      * @param {Int_64} d The fouth 64-bit integer argument to be added
      * @param {Int_64} e The fouth 64-bit integer argument to be added
      * @return {Int_64} The sum of a + b + c + d + e
      */
     function safeAdd_64_5(a, b, c, d, e)
     {
         var lsw, msw, lowOrder, highOrder;

         lsw = (a.lowOrder & 0xFFFF) + (b.lowOrder & 0xFFFF) +
             (c.lowOrder & 0xFFFF) + (d.lowOrder & 0xFFFF) +
             (e.lowOrder & 0xFFFF);
         msw = (a.lowOrder >>> 16) + (b.lowOrder >>> 16) +
             (c.lowOrder >>> 16) + (d.lowOrder >>> 16) + (e.lowOrder >>> 16) +
             (lsw >>> 16);
         lowOrder = ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);

         lsw = (a.highOrder & 0xFFFF) + (b.highOrder & 0xFFFF) +
             (c.highOrder & 0xFFFF) + (d.highOrder & 0xFFFF) +
             (e.highOrder & 0xFFFF) + (msw >>> 16);
         msw = (a.highOrder >>> 16) + (b.highOrder >>> 16) +
             (c.highOrder >>> 16) + (d.highOrder >>> 16) +
             (e.highOrder >>> 16) + (lsw >>> 16);
         highOrder = ((msw & 0xFFFF) << 16) | (lsw & 0xFFFF);

         return new Int_64(highOrder, lowOrder);
     }

     /**
      * Gets the H values for the specified SHA variant
      *
      * @param {string} variant The SHA variant
      * @return {Array.<number|Int_64>} The initial H values
      */
     function getH(variant)
     {
         var retVal, H_trunc, H_full;

         if (("SHA-1" === variant) && (1 & SUPPORTED_ALGS))
         {
             retVal = [
                 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0
             ];
         }
         else if (6 & SUPPORTED_ALGS)
         {
             H_trunc = [
                 0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
                 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4
             ];
             H_full = [
                 0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
                 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19
             ];

             switch (variant)
             {
             case "SHA-224":
                 retVal = H_trunc;
                 break;
             case "SHA-256":
                 retVal = H_full;
                 break;
             case "SHA-384":
                 retVal = [
                     new Int_64(0xcbbb9d5d, H_trunc[0]),
                     new Int_64(0x0629a292a, H_trunc[1]),
                     new Int_64(0x9159015a, H_trunc[2]),
                     new Int_64(0x0152fecd8, H_trunc[3]),
                     new Int_64(0x67332667, H_trunc[4]),
                     new Int_64(0x98eb44a87, H_trunc[5]),
                     new Int_64(0xdb0c2e0d, H_trunc[6]),
                     new Int_64(0x047b5481d, H_trunc[7])
                 ];
                 break;
             case "SHA-512":
                 retVal = [
                     new Int_64(H_full[0], 0xf3bcc908),
                     new Int_64(H_full[1], 0x84caa73b),
                     new Int_64(H_full[2], 0xfe94f82b),
                     new Int_64(H_full[3], 0x5f1d36f1),
                     new Int_64(H_full[4], 0xade682d1),
                     new Int_64(H_full[5], 0x2b3e6c1f),
                     new Int_64(H_full[6], 0xfb41bd6b),
                     new Int_64(H_full[7], 0x137e2179)
                 ];
                 break;
             default:
                 throw new Error("Unknown SHA variant");
             }
         }
         else
         {
             throw new Error("No SHA variants supported");
         }

         return retVal;
     }

     /**
      * Performs a round of SHA-1 hashing over a 512-byte block
      *
      * @private
      * @param {Array.<number>} block The binary array representation of the
      *   block to hash
      * @param {Array.<number>} H The intermediate H values from a previous
      *   round
      * @return {Array.<number>} The resulting H values
      */
     function roundSHA1(block, H)
     {
         var W = [], a, b, c, d, e, T, ch = ch_32, parity = parity_32,
             maj = maj_32, rotl = rotl_32, safeAdd_2 = safeAdd_32_2, t,
             safeAdd_5 = safeAdd_32_5;

         a = H[0];
         b = H[1];
         c = H[2];
         d = H[3];
         e = H[4];

         for (t = 0; t < 80; t += 1)
         {
             if (t < 16)
             {
                 W[t] = block[t];
             }
             else
             {
                 W[t] = rotl(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
             }

             if (t < 20)
             {
                 T = safeAdd_5(rotl(a, 5), ch(b, c, d), e, 0x5a827999, W[t]);
             }
             else if (t < 40)
             {
                 T = safeAdd_5(rotl(a, 5), parity(b, c, d), e, 0x6ed9eba1, W[t]);
             }
             else if (t < 60)
             {
                 T = safeAdd_5(rotl(a, 5), maj(b, c, d), e, 0x8f1bbcdc, W[t]);
             } else {
                 T = safeAdd_5(rotl(a, 5), parity(b, c, d), e, 0xca62c1d6, W[t]);
             }

             e = d;
             d = c;
             c = rotl(b, 30);
             b = a;
             a = T;
         }

         H[0] = safeAdd_2(a, H[0]);
         H[1] = safeAdd_2(b, H[1]);
         H[2] = safeAdd_2(c, H[2]);
         H[3] = safeAdd_2(d, H[3]);
         H[4] = safeAdd_2(e, H[4]);

         return H;
     }

     /**
      * Finalizes the SHA-1 hash
      *
      * @private
      * @param {Array.<number>} remainder Any leftover unprocessed packed ints
      *   that still need to be processed
      * @param {number} remainderBinLen The number of bits in remainder
      * @param {number} processedBinLen The number of bits already
      *   processed
      * @param {Array.<number>} H The intermediate H values from a previous
      *   round
      * @return {Array.<number>} The array of integers representing the SHA-1
      *   hash of message
      */
     function finalizeSHA1(remainder, remainderBinLen, processedBinLen, H)
     {
         var i, appendedMessageLength, offset;

         /* The 65 addition is a hack but it works.  The correct number is
            actually 72 (64 + 8) but the below math fails if
            remainderBinLen + 72 % 512 = 0. Since remainderBinLen % 8 = 0,
            "shorting" the addition is OK. */
         offset = (((remainderBinLen + 65) >>> 9) << 4) + 15;
         while (remainder.length <= offset)
         {
             remainder.push(0);
         }
         /* Append '1' at the end of the binary string */
         remainder[remainderBinLen >>> 5] |= 0x80 << (24 - (remainderBinLen % 32));
         /* Append length of binary string in the position such that the new
         length is a multiple of 512.  Logic does not work for even multiples
         of 512 but there can never be even multiples of 512 */
         remainder[offset] = remainderBinLen + processedBinLen;

         appendedMessageLength = remainder.length;

         /* This will always be at least 1 full chunk */
         for (i = 0; i < appendedMessageLength; i += 16)
         {
             H = roundSHA1(remainder.slice(i, i + 16), H);
         }

         return H;
     }

     /* Put this here so the K arrays aren't put on the stack for every block */
     var K_sha2, K_sha512;
     if (6 & SUPPORTED_ALGS)
     {
         K_sha2 = [
             0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
             0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
             0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
             0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
             0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
             0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
             0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
             0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
             0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
             0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
             0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
             0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
             0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
             0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
             0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
             0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
         ];

         if (4 & SUPPORTED_ALGS)
         {
              K_sha512 = [
                 new Int_64(K_sha2[ 0], 0xd728ae22), new Int_64(K_sha2[ 1], 0x23ef65cd),
                 new Int_64(K_sha2[ 2], 0xec4d3b2f), new Int_64(K_sha2[ 3], 0x8189dbbc),
                 new Int_64(K_sha2[ 4], 0xf348b538), new Int_64(K_sha2[ 5], 0xb605d019),
                 new Int_64(K_sha2[ 6], 0xaf194f9b), new Int_64(K_sha2[ 7], 0xda6d8118),
                 new Int_64(K_sha2[ 8], 0xa3030242), new Int_64(K_sha2[ 9], 0x45706fbe),
                 new Int_64(K_sha2[10], 0x4ee4b28c), new Int_64(K_sha2[11], 0xd5ffb4e2),
                 new Int_64(K_sha2[12], 0xf27b896f), new Int_64(K_sha2[13], 0x3b1696b1),
                 new Int_64(K_sha2[14], 0x25c71235), new Int_64(K_sha2[15], 0xcf692694),
                 new Int_64(K_sha2[16], 0x9ef14ad2), new Int_64(K_sha2[17], 0x384f25e3),
                 new Int_64(K_sha2[18], 0x8b8cd5b5), new Int_64(K_sha2[19], 0x77ac9c65),
                 new Int_64(K_sha2[20], 0x592b0275), new Int_64(K_sha2[21], 0x6ea6e483),
                 new Int_64(K_sha2[22], 0xbd41fbd4), new Int_64(K_sha2[23], 0x831153b5),
                 new Int_64(K_sha2[24], 0xee66dfab), new Int_64(K_sha2[25], 0x2db43210),
                 new Int_64(K_sha2[26], 0x98fb213f), new Int_64(K_sha2[27], 0xbeef0ee4),
                 new Int_64(K_sha2[28], 0x3da88fc2), new Int_64(K_sha2[29], 0x930aa725),
                 new Int_64(K_sha2[30], 0xe003826f), new Int_64(K_sha2[31], 0x0a0e6e70),
                 new Int_64(K_sha2[32], 0x46d22ffc), new Int_64(K_sha2[33], 0x5c26c926),
                 new Int_64(K_sha2[34], 0x5ac42aed), new Int_64(K_sha2[35], 0x9d95b3df),
                 new Int_64(K_sha2[36], 0x8baf63de), new Int_64(K_sha2[37], 0x3c77b2a8),
                 new Int_64(K_sha2[38], 0x47edaee6), new Int_64(K_sha2[39], 0x1482353b),
                 new Int_64(K_sha2[40], 0x4cf10364), new Int_64(K_sha2[41], 0xbc423001),
                 new Int_64(K_sha2[42], 0xd0f89791), new Int_64(K_sha2[43], 0x0654be30),
                 new Int_64(K_sha2[44], 0xd6ef5218), new Int_64(K_sha2[45], 0x5565a910),
                 new Int_64(K_sha2[46], 0x5771202a), new Int_64(K_sha2[47], 0x32bbd1b8),
                 new Int_64(K_sha2[48], 0xb8d2d0c8), new Int_64(K_sha2[49], 0x5141ab53),
                 new Int_64(K_sha2[50], 0xdf8eeb99), new Int_64(K_sha2[51], 0xe19b48a8),
                 new Int_64(K_sha2[52], 0xc5c95a63), new Int_64(K_sha2[53], 0xe3418acb),
                 new Int_64(K_sha2[54], 0x7763e373), new Int_64(K_sha2[55], 0xd6b2b8a3),
                 new Int_64(K_sha2[56], 0x5defb2fc), new Int_64(K_sha2[57], 0x43172f60),
                 new Int_64(K_sha2[58], 0xa1f0ab72), new Int_64(K_sha2[59], 0x1a6439ec),
                 new Int_64(K_sha2[60], 0x23631e28), new Int_64(K_sha2[61], 0xde82bde9),
                 new Int_64(K_sha2[62], 0xb2c67915), new Int_64(K_sha2[63], 0xe372532b),
                 new Int_64(0xca273ece, 0xea26619c), new Int_64(0xd186b8c7, 0x21c0c207),
                 new Int_64(0xeada7dd6, 0xcde0eb1e), new Int_64(0xf57d4f7f, 0xee6ed178),
                 new Int_64(0x06f067aa, 0x72176fba), new Int_64(0x0a637dc5, 0xa2c898a6),
                 new Int_64(0x113f9804, 0xbef90dae), new Int_64(0x1b710b35, 0x131c471b),
                 new Int_64(0x28db77f5, 0x23047d84), new Int_64(0x32caab7b, 0x40c72493),
                 new Int_64(0x3c9ebe0a, 0x15c9bebc), new Int_64(0x431d67c4, 0x9c100d4c),
                 new Int_64(0x4cc5d4be, 0xcb3e42b6), new Int_64(0x597f299c, 0xfc657e2a),
                 new Int_64(0x5fcb6fab, 0x3ad6faec), new Int_64(0x6c44198c, 0x4a475817)
             ];
         }
     }

     /**
      * Performs a round of SHA-2 hashing over a block
      *
      * @private
      * @param {Array.<number>} block The binary array representation of the
      *   block to hash
      * @param {Array.<number|Int_64>} H The intermediate H values from a previous
      *   round
      * @param {string} variant The desired SHA-2 variant
      * @return {Array.<number|Int_64>} The resulting H values
      */
     function roundSHA2(block, H, variant)
     {
         var a, b, c, d, e, f, g, h, T1, T2, numRounds, t, binaryStringMult,
             safeAdd_2, safeAdd_4, safeAdd_5, gamma0, gamma1, sigma0, sigma1,
             ch, maj, Int, W = [], int1, int2, offset, K;

         /* Set up the various function handles and variable for the specific
          * variant */
         if ((variant === "SHA-224" || variant === "SHA-256") &&
             (2 & SUPPORTED_ALGS))
         {
             /* 32-bit variant */
             numRounds = 64;
             binaryStringMult = 1;
             Int = Number;
             safeAdd_2 = safeAdd_32_2;
             safeAdd_4 = safeAdd_32_4;
             safeAdd_5 = safeAdd_32_5;
             gamma0 = gamma0_32;
             gamma1 = gamma1_32;
             sigma0 = sigma0_32;
             sigma1 = sigma1_32;
             maj = maj_32;
             ch = ch_32;
             K = K_sha2;
         }
         else if ((variant === "SHA-384" || variant === "SHA-512") &&
             (4 & SUPPORTED_ALGS))
         {
             /* 64-bit variant */
             numRounds = 80;
             binaryStringMult = 2;
             Int = Int_64;
             safeAdd_2 = safeAdd_64_2;
             safeAdd_4 = safeAdd_64_4;
             safeAdd_5 = safeAdd_64_5;
             gamma0 = gamma0_64;
             gamma1 = gamma1_64;
             sigma0 = sigma0_64;
             sigma1 = sigma1_64;
             maj = maj_64;
             ch = ch_64;
             K = K_sha512;
         }
         else
         {
             throw new Error("Unexpected error in SHA-2 implementation");
         }

         a = H[0];
         b = H[1];
         c = H[2];
         d = H[3];
         e = H[4];
         f = H[5];
         g = H[6];
         h = H[7];

         for (t = 0; t < numRounds; t += 1)
         {
             if (t < 16)
             {
                 offset = t * binaryStringMult;
                 int1 = (block.length <= offset) ? 0 : block[offset];
                 int2 = (block.length <= offset + 1) ? 0 : block[offset + 1];
                 /* Bit of a hack - for 32-bit, the second term is ignored */
                 W[t] = new Int(int1, int2);
             }
             else
             {
                 W[t] = safeAdd_4(
                         gamma1(W[t - 2]), W[t - 7],
                         gamma0(W[t - 15]), W[t - 16]
                     );
             }

             T1 = safeAdd_5(h, sigma1(e), ch(e, f, g), K[t], W[t]);
             T2 = safeAdd_2(sigma0(a), maj(a, b, c));
             h = g;
             g = f;
             f = e;
             e = safeAdd_2(d, T1);
             d = c;
             c = b;
             b = a;
             a = safeAdd_2(T1, T2);
         }

         H[0] = safeAdd_2(a, H[0]);
         H[1] = safeAdd_2(b, H[1]);
         H[2] = safeAdd_2(c, H[2]);
         H[3] = safeAdd_2(d, H[3]);
         H[4] = safeAdd_2(e, H[4]);
         H[5] = safeAdd_2(f, H[5]);
         H[6] = safeAdd_2(g, H[6]);
         H[7] = safeAdd_2(h, H[7]);

         return H;
     }

     /**
      * Finalizes the SHA-2 hash
      *
      * @private
      * @param {Array.<number>} remainder Any leftover unprocessed packed ints
      *   that still need to be processed
      * @param {number} remainderBinLen The number of bits in remainder
      * @param {number} processedBinLen The number of bits already
      *   processed
      * @param {Array.<number|Int_64>} H The intermediate H values from a previous
      *   round
      * @param {string} variant The desired SHA-2 variant
      * @return {Array.<number>} The array of integers representing the SHA-2
      *   hash of message
      */
     function finalizeSHA2(remainder, remainderBinLen, processedBinLen, H, variant)
     {
         var i, appendedMessageLength, offset, retVal, binaryStringInc;

         if ((variant === "SHA-224" || variant === "SHA-256") &&
             (2 & SUPPORTED_ALGS))
         {
             /* 32-bit variant */
             /* The 65 addition is a hack but it works.  The correct number is
                actually 72 (64 + 8) but the below math fails if
                remainderBinLen + 72 % 512 = 0. Since remainderBinLen % 8 = 0,
                "shorting" the addition is OK. */
             offset = (((remainderBinLen + 65) >>> 9) << 4) + 15;;
             binaryStringInc = 16;
         }
         else if ((variant === "SHA-384" || variant === "SHA-512") &&
             (4 & SUPPORTED_ALGS))
         {
             /* 64-bit variant */
             /* The 129 addition is a hack but it works.  The correct number is
                actually 136 (128 + 8) but the below math fails if
                remainderBinLen + 136 % 1024 = 0. Since remainderBinLen % 8 = 0,
                "shorting" the addition is OK. */
             offset = (((remainderBinLen + 129) >>> 10) << 5) + 31;
             binaryStringInc = 32;
         }
         else
         {
             throw new Error("Unexpected error in SHA-2 implementation");
         }

         while (remainder.length <= offset)
         {
             remainder.push(0);
         }
         /* Append '1' at the end of the binary string */
         remainder[remainderBinLen >>> 5] |= 0x80 << (24 - remainderBinLen % 32);
         /* Append length of binary string in the position such that the new
          * length is correct */
         remainder[offset] = remainderBinLen + processedBinLen;

         appendedMessageLength = remainder.length;

         /* This will always be at least 1 full chunk */
         for (i = 0; i < appendedMessageLength; i += binaryStringInc)
         {
             H = roundSHA2(remainder.slice(i, i + binaryStringInc), H, variant);
         }

         if (("SHA-224" === variant) && (2 & SUPPORTED_ALGS))
         {
             retVal = [
                 H[0], H[1], H[2], H[3],
                 H[4], H[5], H[6]
             ];
         }
         else if (("SHA-256" === variant) && (2 & SUPPORTED_ALGS))
         {
             retVal = H;
         }
         else if (("SHA-384" === variant) && (4 & SUPPORTED_ALGS))
         {
             retVal = [
                 H[0].highOrder, H[0].lowOrder,
                 H[1].highOrder, H[1].lowOrder,
                 H[2].highOrder, H[2].lowOrder,
                 H[3].highOrder, H[3].lowOrder,
                 H[4].highOrder, H[4].lowOrder,
                 H[5].highOrder, H[5].lowOrder
             ];
         }
         else if (("SHA-512" === variant) && (4 & SUPPORTED_ALGS))
         {
             retVal = [
                 H[0].highOrder, H[0].lowOrder,
                 H[1].highOrder, H[1].lowOrder,
                 H[2].highOrder, H[2].lowOrder,
                 H[3].highOrder, H[3].lowOrder,
                 H[4].highOrder, H[4].lowOrder,
                 H[5].highOrder, H[5].lowOrder,
                 H[6].highOrder, H[6].lowOrder,
                 H[7].highOrder, H[7].lowOrder
             ];
         }
         else /* This should never be reached */
         {
             throw new Error("Unexpected error in SHA-2 implementation");
         }

         return retVal;
     }

     /**
      * jsSHA is the workhorse of the library.  Instantiate it with the string to
      * be hashed as the parameter
      *
      * @constructor
      * @this {jsSHA}
      * @param {string} variant The desired SHA variant (SHA-1, SHA-224, SHA-256,
      *   SHA-384, or SHA-512)
      * @param {string} inputFormat The format of srcString: HEX, TEXT, B64, or BYTES
      * @param {{encoding: (string|undefined), numRounds: (string|undefined)}=}
      *   options Optional values
      */
     var jsSHA = function(variant, inputFormat, options)
     {
         var processedLen = 0, remainder = [], remainderLen = 0, utfType,
             intermediateH, converterFunc, shaVariant = variant, outputBinLen,
             variantBlockSize, roundFunc, finalizeFunc, finalized = false,
             hmacKeySet = false, keyWithIPad = [], keyWithOPad = [], numRounds,
             updatedCalled = false, inputOptions;

         inputOptions = options || {};
         utfType = inputOptions["encoding"] || "UTF8";
         numRounds = inputOptions["numRounds"] || 1;

         converterFunc = getStrConverter(inputFormat, utfType);

         if ((numRounds !== parseInt(numRounds, 10)) || (1 > numRounds))
         {
             throw new Error("numRounds must a integer >= 1");
         }

         if (("SHA-1" === shaVariant) && (1 & SUPPORTED_ALGS))
         {
             variantBlockSize = 512;
             roundFunc = roundSHA1;
             finalizeFunc = finalizeSHA1;
             outputBinLen = 160;
         }
         else
         {
             if (6 & SUPPORTED_ALGS)
             {
                 roundFunc = function (block, H) {
                     return roundSHA2(block, H, shaVariant);
                 };
                 finalizeFunc = function (remainder, remainderBinLen, processedBinLen, H)
                 {
                     return finalizeSHA2(remainder, remainderBinLen, processedBinLen, H, shaVariant);
                 };
             }

             if (("SHA-224" === shaVariant) && (2 & SUPPORTED_ALGS))
             {
                 variantBlockSize = 512;
                 outputBinLen = 224;
             }
             else if (("SHA-256" === shaVariant) && (2 & SUPPORTED_ALGS))
             {
                 variantBlockSize = 512;
                 outputBinLen = 256;
             }
             else if (("SHA-384" === shaVariant) && (4 & SUPPORTED_ALGS))
             {
                 variantBlockSize = 1024;
                 outputBinLen = 384;
             }
             else if (("SHA-512" === shaVariant) && (4 & SUPPORTED_ALGS))
             {
                 variantBlockSize = 1024;
                 outputBinLen = 512;
             }
             else
             {
                 throw new Error("Chosen SHA variant is not supported");
             }
         }

         intermediateH = getH(shaVariant);

         /**
          * Sets the HMAC key for an eventual getHMAC call.  Must be called
          * immediately after jsSHA object instantiation
          *
          * @expose
          * @param {string} key The key used to calculate the HMAC
          * @param {string} inputFormat The format of key, HEX, TEXT, B64, or BYTES
          * @param {{encoding : (string|undefined)}=} options Associative array
          *   of input format options
          */
         this.setHMACKey = function(key, inputFormat, options)
         {
             var keyConverterFunc, convertRet, keyBinLen, keyToUse, blockByteSize,
                 i, lastArrayIndex, keyOptions;

             if (true === hmacKeySet)
             {
                 throw new Error("HMAC key already set");
             }

             if (true === finalized)
             {
                 throw new Error("Cannot set HMAC key after finalizing hash");
             }

             if (true === updatedCalled)
             {
                 throw new Error("Cannot set HMAC key after calling update");
             }

             keyOptions = options || {};
             utfType = keyOptions["encoding"] || "UTF8";

             keyConverterFunc = getStrConverter(inputFormat, utfType);

             convertRet = keyConverterFunc(key);
             keyBinLen = convertRet["binLen"];
             keyToUse = convertRet["value"];

             blockByteSize = variantBlockSize >>> 3;

             /* These are used multiple times, calculate and store them */
             lastArrayIndex = (blockByteSize / 4) - 1;

             /* Figure out what to do with the key based on its size relative to
              * the hash's block size */
             if (blockByteSize < (keyBinLen / 8))
             {
                 keyToUse = finalizeFunc(keyToUse, keyBinLen, 0, getH(shaVariant));
                 /* For all variants, the block size is bigger than the output
                  * size so there will never be a useful byte at the end of the
                  * string */
                 while (keyToUse.length <= lastArrayIndex)
                 {
                     keyToUse.push(0);
                 }
                 keyToUse[lastArrayIndex] &= 0xFFFFFF00;
             }
             else if (blockByteSize > (keyBinLen / 8))
             {
                 /* If the blockByteSize is greater than the key length, there
                  * will always be at LEAST one "useless" byte at the end of the
                  * string */
                 while (keyToUse.length <= lastArrayIndex)
                 {
                     keyToUse.push(0);
                 }
                 keyToUse[lastArrayIndex] &= 0xFFFFFF00;
             }

             /* Create ipad and opad */
             for (i = 0; i <= lastArrayIndex; i += 1)
             {
                 keyWithIPad[i] = keyToUse[i] ^ 0x36363636;
                 keyWithOPad[i] = keyToUse[i] ^ 0x5C5C5C5C;
             }

             intermediateH = roundFunc(keyWithIPad, intermediateH);
             processedLen = variantBlockSize;

             hmacKeySet = true;
         };

         /**
          * Takes strString and hashes as many blocks as possible.  Stores the
          * rest for either a future update or getHash call.
          *
          * @expose
          * @param {string} srcString The string to be hashed
          */
         this.update = function(srcString)
         {
             var convertRet, chunkBinLen, chunkIntLen, chunk, i, updateProcessedLen = 0,
                 variantBlockIntInc = variantBlockSize >>> 5;

             convertRet = converterFunc(srcString, remainder, remainderLen);
             chunkBinLen = convertRet["binLen"];
             chunk = convertRet["value"];

             chunkIntLen = chunkBinLen >>> 5;
             for (i = 0; i < chunkIntLen; i += variantBlockIntInc)
             {
                 if (updateProcessedLen + variantBlockSize <= chunkBinLen)
                 {
                     intermediateH = roundFunc(
                         chunk.slice(i, i + variantBlockIntInc),
                         intermediateH
                     );
                     updateProcessedLen += variantBlockSize;
                 }
             }
             processedLen += updateProcessedLen;
             remainder = chunk.slice(updateProcessedLen >>> 5);
             remainderLen = chunkBinLen % variantBlockSize;
             updatedCalled = true;
         };

         /**
          * Returns the desired SHA hash of the string specified at instantiation
          * using the specified parameters
          *
          * @expose
          * @param {string} format The desired output formatting (B64, HEX, or BYTES)
          * @param {{outputUpper : (boolean|undefined), b64Pad : (string|undefined)}=}
          *   options Hash list of output formatting options
          * @return {string} The string representation of the hash in the format
          *   specified
          */
         this.getHash = function(format, options)
         {
             var formatFunc, i, outputOptions;

             if (true === hmacKeySet)
             {
                 throw new Error("Cannot call getHash after setting HMAC key");
             }

             outputOptions = getOutputOpts(options);

             /* Validate the output format selection */
             switch (format)
             {
             case "HEX":
                 formatFunc = function(binarray) {return binb2hex(binarray, outputOptions);};
                 break;
             case "B64":
                 formatFunc = function(binarray) {return binb2b64(binarray, outputOptions);};
                 break;
             case "BYTES":
                 formatFunc = binb2bytes;
                 break;
             default:
                 throw new Error("format must be HEX, B64, or BYTES");
             }

             if (false === finalized)
             {
                 intermediateH = finalizeFunc(remainder, remainderLen, processedLen, intermediateH);
                 for (i = 1; i < numRounds; i += 1)
                 {
                     intermediateH = finalizeFunc(intermediateH, outputBinLen, 0, getH(shaVariant));
                 }
             }

             finalized = true;
             return formatFunc(intermediateH);
         };

         /**
          * Returns the the HMAC in the specified format using the key given by
          * a previous setHMACKey call.
          *
          * @expose
          * @param {string} format The desired output formatting
          *   (B64, HEX, or BYTES)
          * @param {{outputUpper : (boolean|undefined), b64Pad : (string|undefined)}=}
          *   options associative array of output formatting options
          * @return {string} The string representation of the hash in the format
          *   specified
          */
         this.getHMAC = function(format, options)
         {
             var formatFunc,	firstHash, outputOptions;

             if (false === hmacKeySet)
             {
                 throw new Error("Cannot call getHMAC without first setting HMAC key");
             }

             outputOptions = getOutputOpts(options);

             /* Validate the output format selection */
             switch (format)
             {
             case "HEX":
                 formatFunc = function(binarray) {return binb2hex(binarray, outputOptions);};
                 break;
             case "B64":
                 formatFunc = function(binarray) {return binb2b64(binarray, outputOptions);};
                 break;
             case "BYTES":
                 formatFunc = binb2bytes;
                 break;
             default:
                 throw new Error("outputFormat must be HEX, B64, or BYTES");
             }

             if (false === finalized)
             {
                 firstHash = finalizeFunc(remainder, remainderLen, processedLen, intermediateH);
                 intermediateH = roundFunc(keyWithOPad, getH(shaVariant));
                 intermediateH = finalizeFunc(firstHash, outputBinLen, variantBlockSize, intermediateH);
             }

             finalized = true;
             return formatFunc(intermediateH);
         };
     };

     if (("function" === typeof define) && (define["amd"])) /* AMD Support */
     {
         define(function()
         {
             return jsSHA;
         });
     } else if ("undefined" !== typeof exports) /* Node Support */
     {
         if (("undefined" !== typeof module) && module["exports"])
         {
           module["exports"] = exports = jsSHA;
         }
         else {
             exports = jsSHA;
         }
     } else { /* Browsers and Web Workers*/
         global["jsSHA"] = jsSHA;
     }
 }(this));


 (function() {
    var Hotp, Totp;

    Totp = class Totp {
      // pass in the secret, code dom element, ticker dom element
      constructor(expiry = 30, length = 6) {
        this.expiry = expiry;
        this.length = length;
        // validate input
        if (this.length > 8 || this.length < 6) {
          throw "Error: invalid code length";
        }
      }

      dec2hex(s) {
        return (s < 15.5 ? "0" : "") + Math.round(s).toString(16);
      }

      hex2dec(s) {
        return parseInt(s, 16);
      }

      base32tohex(base32) {
        var base32chars, bits, chunk, hex, i, val;
        base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        bits = "";
        hex = "";
        i = 0;
        while (i < base32.length) {
          val = base32chars.indexOf(base32.charAt(i).toUpperCase());
          bits += this.leftpad(val.toString(2), 5, "0");
          i++;
        }
        i = 0;
        while (i + 4 <= bits.length) {
          chunk = bits.substr(i, 4);
          hex = hex + parseInt(chunk, 2).toString(16);
          i += 4;
        }
        return hex;
      }

      leftpad(str, len, pad) {
        if (len + 1 >= str.length) {
          str = Array(len + 1 - str.length).join(pad) + str;
        }
        return str;
      }

      getOtp(secret, now = new Date().getTime()) {
        var epoch, hmac, key, offset, otp, shaObj, time;
        key = this.base32tohex(secret);
        epoch = Math.round(now / 1000.0);
        time = this.leftpad(this.dec2hex(Math.floor(epoch / this.expiry)), 16, "0");
        shaObj = new jsSHA("SHA-1", "HEX");
        shaObj.setHMACKey(key, "HEX");
        shaObj.update(time);
        hmac = shaObj.getHMAC("HEX");
        // hmacObj = new jsSHA(time, "HEX")  # Dependency on sha.js
        // hmac = hmacObj.getHMAC(key, "HEX", "SHA-1", "HEX")
        if (hmac === "KEY MUST BE IN BYTE INCREMENTS") {
          throw "Error: hex key must be in byte increments";
        } else {
          // return null
          offset = this.hex2dec(hmac.substring(hmac.length - 1));
        }
        otp = (this.hex2dec(hmac.substr(offset * 2, 8)) & this.hex2dec("7fffffff")) + "";
        if (otp.length > this.length) {
          otp = otp.substr(otp.length - this.length, this.length);
        } else {
          otp = this.leftpad(otp, this.length, "0");
        }
        return otp;
      }

    };

    Hotp = class Hotp {
      constructor(length = 6) {
        this.length = length;
        // validate input
        if (this.length > 8 || this.length < 6) {
          throw "Error: invalid code length";
        }
      }

      // stuck on this for a long time. Use JSON.stringify to inspect uintToString output!!
      uintToString(uintArray) {
        var decodedString, encodedString;
        encodedString = String.fromCharCode.apply(null, uintArray);
        decodedString = decodeURIComponent(escape(encodedString));
        return decodedString;
      }

      getOtp(key, counter) {
        var digest, h, offset, shaObj, v;
        shaObj = new jsSHA("SHA-1", "TEXT");
        shaObj.setHMACKey(key, "TEXT");
        shaObj.update(this.uintToString(new Uint8Array(this.intToBytes(counter))));
        digest = shaObj.getHMAC("HEX");
        // Get byte array
        h = this.hexToBytes(digest);

        // Truncate
        offset = h[19] & 0xf;
        v = (h[offset] & 0x7f) << 24 | (h[offset + 1] & 0xff) << 16 | (h[offset + 2] & 0xff) << 8 | h[offset + 3] & 0xff;
        v = v + '';
        return v.substr(v.length - this.length, this.length);
      }

      intToBytes(num) {
        var bytes, i;
        bytes = [];
        i = 7;
        while (i >= 0) {
          bytes[i] = num & 255;
          num = num >> 8;
          --i;
        }
        return bytes;
      }

      hexToBytes(hex) {
        var C, bytes, c;
        bytes = [];
        c = 0;
        C = hex.length;
        while (c < C) {
          bytes.push(parseInt(hex.substr(c, 2), 16));
          c += 2;
        }
        return bytes;
      }

    };

    window.jsOTP = {};

    jsOTP.totp = Totp;

    jsOTP.hotp = Hotp;

  }).call(this);
})();
//#endregion totp.js

//#region rwthTools.js
(() => {
const functions = {
    // Registers this tab as the active tab and add listeners for lossing and gaining focus
    // for when it is needed (e.g. for whether to show the video download link - only show when on that tab)
    registerActiveTab: {
        regex: /.*/,
        action: registerActiveTab,
        allowSubsequent: true
    },
    // Remembers the last chosen token from the MFA page
    registerMFAOption: {
        regex: /^sso.rwth-aachen.de\/idp\/profile\/SAML2\/(Redirect|POST)\/SSO/,
        action: registerMFAOption,
        allowSubsequent: true
    },
    // Selects the last chosen MFA token and continues, if a last token is remembered and the user didn't
    // choose the restart option (actively trying to select a different token).
    autoSelectMFAOption: {
        regex: /^sso.rwth-aachen.de\/idp\/profile\/SAML2\/(Redirect|POST)\/SSO/,
        action: autoSelectMFAOption,
        allowSubsequent: true
    },
    // Renames the MFA restart button to something more clear, and explain what the token type is
    improveMFANamings: {
        regex: /^sso.rwth-aachen.de\/idp\/profile\/SAML2\/(Redirect|POST)\/SSO/,
        action: improveMFANamings,
        allowSubsequent: true
    },
    // Automatically submit the token when autofilled by the browser
    autoMFASubmit: {
        regex: /^sso.rwth-aachen.de\/idp\/profile\/SAML2\/(Redirect|POST)\/SSO/,
        action: autoMFASubmit,
        allowSubsequent: true
    },
    // Fills in tokens managed by the extension either automatically or after a button click, depending
    // on the settings and whether it is a login retry or not. This action itself should always be on.
    fillManagedTOTPTokens: {
        regex: /^sso.rwth-aachen.de\/idp\/profile\/SAML2\/(Redirect|POST)\/SSO/,
        action: fillManagedTOTPTokens,
        allowSubsequent: true
    },
    // Click "login" on moodle welcome page
    moodleStartAutoForward: {
        regex: /^moodle\.rwth-aachen\.de$/,
        action: moodleLogin
    },
    // Forward to the login page if attempted to open the dashboard without being logged in, which is possibly
    // but doesn't show any relevant information
    moodleGuestDashboardLogin: {
        regex: /^moodle\.rwth-aachen\.de\/my\/?/,
        action: onGuestDashboard,
        allowSubsequent: true
    },
    // Click "to login" on the RWTHOnline main page when not logged in
    rwthOnlineLoginAutoForward: {
        regex: /^online\.rwth-aachen\.de\/RWTHonline([?#].*)?$/,
        action: onRWTHOnlineLoginPage
    },
    // Click "Login" when logged in as guest on RWTHOnline (more realistically, you got logged out)
    rwthOnlineGuessAutoLogin: {
        regex: /^online\.rwth-aachen\.de\/RWTHonline\/ee\/ui\/ca2\/app\/desktop\/?([?#].*)?/,
        action: onRWTHGuestLogin,
        allowSubsequent: true
    },
    // Open the login page if a video page from the video AG requires login
    videoAGAutoLoginForward: {
        regex: /^(video\.fsmpi\.rwth-aachen\.de|rwth\.video)\/[^\/]+\/\d+$/,
        action: onVideoAG,
        allowSubsequent: true
    },
    // Click "login" if opening a moodle course page while not logged in, which requires login. Moodle just shows
    // that you need to be logged in, but does not actually forward to the login page
    autoLoginOnCoursePreview: {
        regex: /^moodle\.rwth-aachen\.de\/enrol\/index.php/,
        action: moodleLogin
    },
    // Click the "Login" button on the psp page
    autoLoginOnPSP: {
        regex: /^psp(-website-dev)?\.embedded\.rwth-aachen\.de\/login/,
        action: onPSPLogin,
        allowSubsequent: true
    },
    // Select "Remember me" and click "login" on the git.rwth-aachen page
    autoGitLoginForward: {
        regex: /^git(-ce)?\.rwth-aachen\.de\/users\/sign_in\/?$/,
        action: onGitLoginPage
    },
    // Automatically select a specific institution if you are asked to
    autoSelectInstitution: {
        regex: /^oauth\.campus\.rwth-aachen\.de\/login\/shibboleth\/?(\?.*)?$/,
        action: onSelectInstitution
    },
    // Automatically select a specific institution if you are asked to, for the git page version
    autoSelectGitInstitution: {
        regex: /^git(-ce)?\.rwth-aachen\.de\/shibboleth-ds\/?(\?.*)?$/,
        action: onSelectGitInstitution,
        setting: "autoSelectInstitution"
    },
    // Automatically click "Authorize" if you have to, if you already authorized the same app before
    autoSSOAuthorize: {
        // ^oauth\.campus\.rwth-aachen\.de\/manage\/?\?q=verify
        regex: /^sso\.rwth-aachen\.de\/idp\/profile\/SAML2\/(Redirect|POST)\/SSO/,
        action: onAutoSSOAuthorize,
        allowSubsequent: true,
        setting: "" // Always run to store the known apps
    },
    // Same as above, but different page looks (RWTH, why???)
    autoOAuthAuthorize: {
        regex: /^oauth\.campus\.rwth-aachen\.de\/manage\/?\?q=verify/,
        action: onAutoOAuthAuthorize,
        allowSubsequent: true,
        setting: "" // Always run to store the known apps
    },
    // Automatically close an authorization tab after being done
    autoCloseAfterAuthorize: {
        regex: /^oauth\.campus\.rwth-aachen\.de\/manage\/?\?.*q=authorized/,
        action: onAuthorizeDone
    },
    // Automatically press "Login" on SSO if the browser filled in username and password
    ssoAutoSubmit: {
        regex: /^sso\.rwth-aachen\.de\/idp\/profile\/SAML2\/(Redirect|POST)\/SSO/,
        action: onSSO,
        allowSubsequent: true
    },
    // Automatically press "Login" on the main.rwth-aachen page if the browseer filled in username and password
    autoMailLoginSubmit: {
        regex: /^mail\.rwth-aachen\.de\/owa\/auth\/logon\.aspx/,
        action: onMailLogin,
        allowSubsequent: true
    },
    // Internal event to find the current session key for moodle to use in requests for the dropdown menu
    searchSessionKey: {
        regex: /^moodle\.rwth-aachen\.de/,
        action: searchSessionKey,
        allowSubsequent: true
    },
    // Download and open the PDF directly when opening the PDF annotator
    skipPDFAnnotator: {
        regex: /^moodle\.rwth-aachen\.de\/mod\/pdfannotator\/view\.php/,
        action: onPDFAnnotator
    },
    // Open the link shown on moodle pages which only present that link
    clickURLResources: {
        regex: /^moodle\.rwth-aachen.de\/mod\/url\/view\.php\?(?!stay=true)/,
        action: onURLResource
    },
    // Internal event to find the video id on an opencast video page
    searchOpencastVideo: {
        regex: /^moodle/,
        action: searchOpencastVideo,
        allowSubsequent: true
    },
    // Close the "Chat" popup
    removeChatPopup: {
        regex: /^moodle/,
        action: removeChatPopup,
        allowSubsequent: true
    },
    // Close the "Accept cookies" banner
    acceptCookies: {
        regex: /^moodle/,
        action: acceptCookies,
        allowSubsequent: true
    },
    // Fix the broken login box on the internal embedded management websites and possible auto-submit the credentials
    autoEmbeddedHiwiLogin: {
        regex: /^(portal|checkliste|kaffeekasse|hiwi|periodictasks|terminverwaltung|reisen)\.embedded\.rwth-aachen\.de/,
        action: onEmbeddedHiwiLogin,
        allowSubsequent: true
    },
    // Select dark or light mode on the psp website
    PSPDarkMode: {
        regex: /^psp(-website-dev)?\.embedded\.rwth-aachen\.de/,
        action: onPSPDarkMode,
        allowSubsequent: true,
        setting: "autoDarkMode"
    },
    // Submit the text input when pressing ctrl + enter
    PSPHiwiCtrlEnterSubmit: {
        regex: /^hiwi\.embedded\.rwth-aachen\.de\/?(\?.*)?/,
        action: addPSPCtrlEnterSubmit,
    },
    // Adds information about a checkbox of the checkboard when hovered over it
    PSPAddCheckboardHoverInfo: {
        regex: /^psp(-website-dev)?\.embedded\.rwth-aachen\.de\/checkboard/,
        action: addPSPCheckboardHoverInfo,
        allowSubsequent: true
    },
    // Forward to the admin login page when opening the client embedded ticket system
    embeddedTicketAutoAdminForward: {
        regex: /^ticket\.embedded\.rwth-aachen\.de(\/login\.php)?/,
        action: onEmbeddedTicketAdminForward,
        default: false,
        allowSubsequent: true
    },
    // Automatically submit login credentials on the embedded ticket login pages
    embeddedTicketAutoLogin: {
        regex: /^ticket\.embedded\.rwth-aachen\.de\/scp\/login\.php/,
        action: onEmbeddedTicketLogin
    },

    createTOTPTokenOverviewPage: {
        regex: /^idm\.rwth-aachen\.de\/selfservice\/MFATokenManager\?2$/,
        action: createTOTPTokenOverviewPage,
        allowSubsequent: true
    },
    createTOTPTokenSelectTypePage: {
        regex: /^idm\.rwth-aachen\.de\/selfservice\/MFATokenManager\?3$/,
        action: createTOTPTokenSelectTypePage,
        allowSubsequent: true
    },
    createTOTPTokenDescriptionPage: {
        regex: /^idm\.rwth-aachen\.de\/selfservice\/MFATokenManager\?4$/,
        action: createTOTPTokenDescriptionPage,
        allowSubsequent: true
    },
    createTOTPTokenFinishPage: {
        regex: /^idm\.rwth-aachen\.de\/selfservice\/MFATokenManager\?5$/,
        action: createTOTPTokenFinishPage,
        allowSubsequent: true
    }
    // loadVideoData: {
    //     regex: /^moodle\.rwth-aachen\.de\/mod\/lti\/view\.php/,
    //     action: onVideo
    // }
}

const ignoreURLChange = [
    /^https:\/\/sso\.rwth-aachen\.de\/idp\/profile\/SAML2\/(Redirect|POST)\/SSO\?execution=....(#.*)?$/
];

main();

async function main() {
    while(true) {
        let url = location.href.replace(/https?:\/\//, "");
        if(url.endsWith("/"))
            url = url.substring(0, url.length - 1);

        // Check if website is ignored, in that case exit
        const ignored = (await browser.storage.sync.get("ignoredSites")).ignoredSites || [];
        for(const site of ignored)
            if(url.match("([^/?#]\\.)?" + escapeRegExp(site) + "([/?#].*)?"))
                return console.log("Ignored site:", site);

        for(const [name, info] of Object.entries(functions)) {
            if(!url.match(info.regex)) {
                console.log("No match:", name);
                continue;
            }
            const settingsName = info.setting ?? name;
            browser.storage.sync.get(settingsName).then(settings => {
                if((settings[settingsName] === undefined && info.default !== false) || settings[settingsName] === true) try {
                    console.log(name);
                    info.action();
                } catch(error) {
                    console.error(error);
                }
                else console.log("Disabled:", name);
            });
            if(!info.allowSubsequent) break;
        }

        let href;
        outer: do {
            href = location.href;
            await when(() => location.href !== href);
            for(const pat of ignoreURLChange)
                if(pat.test(location.href))
                    continue outer;
            break;
        } while(true);
        console.log("One-Page side change detected:", href, "->", location.href);
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function searchSessionKey() {
    const node = document.getElementsByName("sesskey")[0];
    if(!node) return console.log("No session key found");
    const sesskey = node.value;
    console.log("Session key:", sesskey);
    // Don't access browser.storage.local directly, when running in containers or similar this won't be visible
    // from the popup storage. Instead, send the data to the background script which should always be running
    // in the same context as the popup window as neither really belongs to any tab
    browser.runtime.sendMessage({ command: "setStorage", storage: "local", data: { sesskey: sesskey } });
    // Also, sometimes (?) cookies are required for the course info request. When running in coutainers, the
    // popup script does not have access to those cookies, and here we don't have access to the cookies API to
    // read them. Thus, we request the courses now and cache them for later use. The popup window will still show
    // 'Not logged in' because it can't re-request the courses, but it can at least display the last cached value.
    cacheCourses(sesskey);
}

async function cacheCourses(sesskey) {
    const byTime = (await browser.storage.sync.get("courseOrder")).courseOrder !== "name"; // Default to true
    const resp = await fetch("https://moodle.rwth-aachen.de/lib/ajax/service.php?sesskey="+sesskey, {
        method: "post",
        body: JSON.stringify([{
            index: 0,
            methodname: "core_course_get_enrolled_courses_by_timeline_classification",
            args: {
                offset: 0,
                limit: (await browser.storage.sync.get("maxCourses")).maxCourses || 10,
                classification: byTime ? "all" : "inprogress",
                sort: byTime ? "ul.timeaccess desc" : "fullname"
            }
        }])
    }).then(r => r.json());
    if(resp[0].error)
        return console.error("Failed to load courses", resp[0].exception);

    await browser.runtime.sendMessage({ command: "setStorage", storage: "local", data: { courseCache: resp[0].data.courses } });
}

function registerActiveTab() {
    function setActive() {
        browser.runtime.sendMessage({ command: "setActiveTab", data: { url: location.href } });
    }
    function unsetActive() {
        browser.runtime.sendMessage({ command: "unsetActiveTab", data: { url: location.href } });
    }
    function onChange() {
        if(document.visibilityState === "visible") setActive();
        else unsetActive();
    }
    onChange();
    document.onvisibilitychange = onChange;
    window.onfocus = setActive;
    window.onblur = unsetActive;
}

async function registerMFAOption() {
    const select = await when(() => document.getElementById("fudis_selected_token_ids_input"));
    const submit = await when(() => document.querySelector("button[type=submit]"));

    const options = { };
    for(const o of select.options)
        options[o.value] = o.innerText.replace(/^.*-.*-\s*/, "");
    browser.storage.sync.set({ MFAOptionDescriptions: options })
    console.log("Options:", options);

    submit.addEventListener("click", () => browser.storage.sync.set({ selectedMFAOption: select.value }));
}

async function autoSelectMFAOption() {
    const select = await when(() => document.getElementById("fudis_selected_token_ids_input"));
    const option = (await browser.storage.sync.get("selectedMFAOption")).selectedMFAOption;
    const execution = new URLSearchParams(location.search).get("execution");
    if(!option || !execution || !execution.match(/\D[1-3]$/)) {
        select.addEventListener("change", () => document.querySelector("button[type=submit]").click());
        return;
    }
    select.value = option;
    (await when(() => document.querySelector("button[type=submit]"))).click();
}

function improveMFANamings() {
    improveMFAForAutofill();
    renameMFARestartButton();
    renameTokenTypeLabel();
}

async function improveMFAForAutofill() {
    const input = await when(() => document.getElementById("fudis_otp_input"));
    const form = document.getElementById("fudiscr-form");
    // Hint to browser / extension that this is a one-time password
    form.autocomplete = input.autocomplete = "one-time-code";
    if(!input.value.match(/^\d{6}(\d\d)?$/))
        // If the browser filled in something that doesn't look like a one-time code, clear it
        input.value = "";
    // // This is necessary for BitWarden to detect the field as OTP
    // input.type = "text";
    if(!location.hash)
        // Append '#mfa' to the URL. May help extensions to distinguish between the different
        // stages of the login and use the correct password
        location.hash = "#mfa";

    // Set type to 'text', necessary for BitWarden to detect the input as OTP. Togglable
    // in case an extension autofills the password, which would be visible in plaintext.
    const setType = (await browser.storage.sync.get("setMFAInputType")).setMFAInputType !== false;
    if(setType)
        input.type = "text";

    const creatingToken = await creatingTOTPToken();
    if(creatingToken)
        document.querySelector("button[type=submit]").addEventListener("click", startCreatingTOTPToken);

    const el = document.createElement("span");
    el.innerHTML = `
        <p style="margin-top: 10px">
            ${!creatingToken ? `You can also <a id="qor-generate-token" href="#">generate a token</a> managed by the Quality of RWTH extension
            or <a id="qor-add-token" href="#" onclick="document.getElementById('qor-add-token-area').hidden = false">add the current token</a> to be autofilled by extension.
            This token will be entered by the extension automatically.
            <i>Note that this effectively bypasses the 2FA mechanism on browsers with the extension.
            Use it at your own risk!</i>` : `<i>To create a token, you need to login to SelfService first.</i>`}
        </p>
        <form id="qor-add-token-area" hidden>
            Fill in the client secret for the current token. This is <i>not</i> visible in RWTH SelfService, you can only do this if you saved it somewhere or your current 2FA app can show it to you. Otherwise, you may have to create another token.
            <input id="qor-add-token-input" class="form-control" type="text" title="Private key" placeholder="Private key">
            <a id="qor-add-token-submit" class="btn btn-primary btn-block">Save and fill in</a>
        </form>
        <table style="border: none"><tr style="border: none">
            <td style="border: none"><input type="checkbox" id="qor-set-mfa-type"></td>
            <td style="border: none"><label for="qor-set-mfa-type" style="font-weight: normal">
                Show token in plaintext. This helps some password managers to autofill the token, but if your password manager autofills your regular password, you may want to disable this to avoid showing your password in plaintext. (Quality of RWTH)
            </label></td>
        </tr></table>`;
    form.appendChild(el);
    const box = form.querySelector("#qor-set-mfa-type");
    box.checked = setType;
    box.onchange = () => {
        browser.storage.sync.set({ setMFAInputType: !!box.checked });
        input.type = box.checked ? "text" : "password";
    };

    if(!creatingToken) {
        const createToken = form.querySelector("#qor-generate-token");
        createToken.onclick = async () => {
            startCreatingTOTPToken();
            location.href = "https://idm.rwth-aachen.de/selfservice/MFATokenManager";
        };
    }

    const keyInput = form.querySelector("#qor-add-token-input");
    const addSubmit = form.querySelector("#qor-add-token-submit");
    async function save() {
        const tokens = (await browser.storage.sync.get("managedTOTPTokens")).managedTOTPTokens || { };
        const { id, name } = getTokenInfos(form.querySelector("label"));
        tokens[id] = {
            key: keyInput.value,
            name: name
        };
        await browser.storage.sync.set({ managedTOTPTokens: tokens });
        input.value = getTOTP(keyInput.value);
        input.dispatchEvent(new Event("change"));
    }
    addSubmit.onclick = save;
    keyInput.onsubmit = save;
    keyInput.onkeydown = e => {
        if(e.keyIdentifier === 'U+000A' || e.keyIdentifier === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            save();
        }
    };
}

async function renameMFARestartButton() {
    const btn = await when(() => document.querySelector("button[name=_eventId_FudisCrRestart]"));
    const texts = [...btn.childNodes].filter(n => n.nodeName === "#text");
    if(!texts.length) return;
    let text = texts[0];
    for(const t of texts)
        if(t.length > text.length)
            text = t;
    if(text.data.includes("Starte Tokenverfahren neu"))
        text.data = " Anderes Token oder Recovery-Code nutzen";

    btn.addEventListener("click", () => btn.innerText = "Wird neugestartet...");
}

async function renameTokenTypeLabel() {
    const label = await when(() => document.getElementById("fudiscr-form")?.querySelector("label"));
    const { id, type, name } = getTokenInfos(label);

    let niceType;
    if(type === "hotp" || type === "WebAuthn/FIDO2")
        niceType = "Hardware-Token";
    else if(type === "totp")
        niceType = "Authenticator-App";
    else if(type === "mail")
        niceType = "Email-Code";
    else if(type === "tan")
        niceType = "Recovery-Code";
    else niceType = type;

    label.innerText = `${niceType} ${name} (${id})`;
}

function getTokenInfos(label) {
    let infos = label.mfaInfos;
    if(!infos) {
        const [_, type, id, name] = label.innerText.match(/(\S+)\s*-\s*(\S+)(?:\s*-\s*(.*))?$/);
        infos = { id, type, name: name || id };
        label.mfaInfos = infos;
    }
    return infos;
}

async function autoMFASubmit() {
    const form = document.getElementById("fudiscr-form");
    if(!form) return;

    addAutofillListener(
        [],
        document.getElementById("fudis_otp_input"),
        form.querySelector("button[name=_eventId_proceed]"),
        p => p.match(/^\d{6}(\d{2})?$/)
    );
}

async function fillManagedTOTPTokens() {

    const form = document.getElementById("fudiscr-form");
    if(!form) return;

    const { id: totpId } = getTokenInfos(form.querySelector("label"));
    const tokens = (await browser.storage.sync.get("managedTOTPTokens")).managedTOTPTokens || { };
    if(!tokens[totpId]) return;

    const token = tokens[totpId];

    function fillTOTP(e) {
        e?.preventDefault();
        const input = document.getElementById("fudis_otp_input");
        input.value = getTOTP(token.key);
        // Potentially auto-submit with different script
        input.dispatchEvent(new Event("change"));
    }

    const autofill = (await browser.storage.sync.get("autofillManagedMFA")).autofillManagedMFA !== false;
    if(autofill && location.href.match(/s3(#.*)?$/)) {
        fillTOTP();
        return;
    }

    document.getElementById("qor-auto-totp.submit")?.remove();
    const submit = form.querySelector("button[name=_eventId_proceed]");
    const fillBtn = submit.cloneNode(true);
    fillBtn.id = "qor-auto-totp-submit";
    fillBtn.innerText = fillBtn.innerText.includes("Weiter") ? "Ausfüllen mit Quality-of-RWTH" : "Fill with Quality-of-RWTH";
    fillBtn.onclick = fillTOTP;
    submit.parentElement.insertBefore(fillBtn, submit);

    if(document.querySelectorAll("div.alert[role=alert]")) {
        const el = document.createElement("span");
        el.innerHTML = `<i>
            Every one-time-code can only be used once for login, after that you have to wait up to 30 seconds until it has changed...
        </i>`;
        submit.parentElement.insertBefore(el, submit);
    }
}

function onGuestDashboard() {
    const h = document.getElementsByTagName("h1")[0];
    if(h && h.innerText.match(/\((?:Gast|Guest)\)/)) // When logging in, its first an <h2>. If you access the dashboard when already logged in its an <h1> for whatever reason
        moodleLogin();
}

async function onRWTHOnlineLoginPage() {
    location.href = (await when(() => document.getElementById("social-rwth-sso"))).href;
}

async function onRWTHGuestLogin() {
    location.href = (await when(() => document.querySelector(".co-navbar-menu-login>a"))).href;
}

function onVideoAG() {
    const a = document.getElementsByClassName("reloadonclose")[0];
    if(a) browser.runtime.sendMessage({ command: "browser.tabs.create", data: { url: a.href } });
}

function onPSPLogin() {
    const query = new URLSearchParams(location.search);
    if(query.has("fail")) return;
    location.href = location.origin+"/api/auth/login?redirect="+encodeURIComponent(query.get("redirect") || "/");
}

async function onGitLoginPage() {
    if((await browser.storage.sync.get("rememberMe")).rememberMe !== false) {
        const box = document.getElementById("remember_me_omniauth") || document.getElementById("js-remember-me-omniauth");
        if(box) box.checked = true;
        else console.error("Remember me button not found");
    }
    const btn = document.getElementById("oauth-login-saml") || document.querySelector("button[data-testid=saml-login-button]");
    if(btn) btn.click();
    else console.error("Login button not found");
}

async function onSelectInstitution() {
    const index = (await browser.storage.sync.get("intitution")).institution === "jülich" ? 1 : 0;
    document.getElementsByClassName("row")[0].children[index].getElementsByTagName("a")[0].click();
}

async function onSelectGitInstitution() {
    const select = document.getElementById("idpSelectSelector");
    if(!select) return;

    let institution = (await browser.storage.sync.get("intitution")).institution;
    if(!institution) institution = "rwth";

    for(let i=0; i<select.options.length; i++) {
        if(select.options[i].text.toLowerCase().includes(institution)) {
            select.value = select.options[i].value;
            break;
        }
    }

    const durations = document.getElementsByClassName("IdPSelectautoDispatchTile");
    if(durations)
        durations[durations.length-1].children[0].click();

    document.getElementById("idpSelectListButton").click();
}

async function onAutoSSOAuthorize() {
    const rememberBtn = document.getElementById("_shib_idp_rememberConsent");
    if(!rememberBtn) return;

    const form = document.getElementsByTagName("form")[0];
    const app = form.getElementsByTagName("strong")[0].innerText;
    const known = (await browser.storage.sync.get("authorizedApps")).authorizedApps || [];
    const button = form.getElementsByClassName("btn-primary")[0];

    const setting = (await browser.storage.sync.get("autoAuthorize")).autoAuthorize;

    if(setting === "always") {
        // Don't save as actively consented
        button.click();
        return;
    }

    if(setting === undefined || setting === "confirmOnce") {
        if(known.includes(app)) {
            button.click();
            return;
        }

        for(const text of [...rememberBtn.parentElement.childNodes].filter(n => n instanceof Text)) {
            const strikethrough = document.createElement("s");
            strikethrough.innerText = text.textContent.trim();
            text.parentElement.replaceChild(strikethrough, text);
        }
        rememberBtn.parentElement.appendChild(document.createElement("br"));
        rememberBtn.parentElement.appendChild(document.createTextNode("You will not be asked to confirm permissions for this App again, even if the permissions change. (Quality of RWTH)"));
    }

    button.addEventListener("click", () => {
        if(!rememberBtn.checked) {
            // Shouldn't remember
            if(known.includes(app)) {
                known.splice(known.indexOf(app), 1);
                browser.storage.sync.set({ authorizedApps: known });
            }
            return;
        }
        if(known.includes(app)) return;
        known.push(app);
        browser.storage.sync.set({ authorizedApps: known });
    });

    // Reject button
    form.getElementsByClassName("btn-danger")[0].addEventListener("click", () => {
        // Shouldn't remember
        if(known.includes(app)) {
            known.splice(known.indexOf(app), 1);
            browser.storage.sync.set({ authorizedApps: known });
        }
    });
}

async function onAutoOAuthAuthorize() {
    const app = document.getElementsByClassName("text-info")[0].innerText;
    const known = (await browser.storage.sync.get("authorizedApps")).authorizedApps || [];
    const button = document.getElementsByTagName("form")[0].getElementsByClassName("btn-primary")[0];

    const setting = (await browser.storage.sync.get("autoAuthorize")).autoAuthorize;

    if(setting === "always") {
        // Don't save as actively consented
        button.click();
        return;
    }

    if(known.includes(app)) {
        if(setting === undefined || setting === "confirmOnce")
            button.click();
        return;
    }

    button.addEventListener("click", () => {
        if(known.includes(app)) return; // If clicked multiple times somehow
        known.push(app);
        browser.storage.sync.set({ authorizedApps: known });
    })
}

function onAuthorizeDone() {
    browser.runtime.sendMessage({ command: "closeThisTabAndReload"});
}

function onPDFAnnotator() {
    let url = document.getElementById("myprinturl");
    if(!url) return;
    url = url.innerText.replace(/\??forcedownload=1/, "");
    history.replaceState(null, "", url);
    location.href = url;
}

function onSSO() {
    addAutofillListener(
        [ document.getElementById("username") ],
        document.getElementById("password"),
        document.getElementById("login")
    );
}

function onMailLogin() {
    addAutofillListener(
        [ document.getElementById("username") ],
        document.getElementById("password"),
        document.getElementsByClassName("signinbutton")[0]
    );
}

function addAutofillListener(usernames, password, submit, passwordFilter = undefined) {
    for(const username of usernames)
        if(!username) return;
    if(!(password && submit)) return;

    let allUsernames = true;
    for(const username of usernames)
        allUsernames &= username.value !== "";
    if(allUsernames && password.value !== "" && (!passwordFilter || passwordFilter(password.value))) {
        console.log("Password already entered");
        return submit.click();
    }

    const fields = [...usernames, password];
    const oldVals = [];
    for(const field of fields)
        oldVals.push(field.value);

    let listener = () => {
        let allPresent = true;
        let anySuddenChange = false;
        for(const i in fields) {
            const field = fields[i];
            allPresent &&= field.value.length >= 4 && (field !== password || !passwordFilter || passwordFilter(field.value));
            anySuddenChange ||= Math.abs(field.value.length - oldVals[i].length) > 2;
            oldVals[i] = field.value;
        }
        if(allPresent && anySuddenChange)
            submit.click();
    };

    for(const field of fields) {
        field.addEventListener("keyup", listener);
        field.addEventListener("input", listener);
        field.addEventListener("change", listener);
    }

    submit.addEventListener("click", () => setTimeout(() => submit.disabled = true));
}

function onURLResource() {
    const div = document.querySelector("[role=main]");
    if(!div) return;
    const a = div.getElementsByTagName("a")[0];
    if(!a) return;
    history.replaceState(null, "", location.href.replace("?", "?stay=true&"));
    a.click();
}

async function searchOpencastVideo() {
    let videoInfos = [];
    for(const iframe of document.getElementsByTagName("iframe")) {
        if(!iframe) continue;
        if(iframe.className === "ocplayer") {
            videoInfos.push(await getVideoInfo(iframe.getAttribute("data-framesrc").match(/play\/(.{36})/)[1]));
        }
        else if(iframe.id === "contentframe" && location.href.includes("mod/lti/view.php")) {
            const id = location.search.match(/id=(\d+)/)[1];
            console.log("Video ID:", id);

            const uuid = (await fetch("https://moodle.rwth-aachen.de/mod/lti/launch.php?id="+id).then(r => r.text())).match(/name\s*=\s*"custom_id"\s*value\s*=\s*"(.{36})"/)[1];

            videoInfos.push(await getVideoInfo(uuid));
        }
    }
    if(videoInfos.length === 0) return;

    let allVideoInfos = (await browser.runtime.sendMessage({ command: "getStorage", storage: "local", name: "videoInfos" })).videoInfos || {};
    allVideoInfos[location.href] = videoInfos;

    // Migrate from old version where only one video per page was possible
    for(const key in allVideoInfos)
        if(!(allVideoInfos[key] instanceof Array))
            allVideoInfos[key] = [allVideoInfos[key]];

    // Remove any empty entries which were written in a previous version where there was no check whether they were empty before written
    for(const key of Object.keys(allVideoInfos))
        if(allVideoInfos[key].length === 0)
            delete allVideoInfos[key];

    if(Object.keys(allVideoInfos).length > 10) {
        allVideoInfos = Object.entries(allVideoInfos).sort(([_1,a],[_2,b]) => b[0].time - a[0].time);
        allVideoInfos.length = 10;
        allVideoInfos = allVideoInfos.reduce((obj, [k,v]) => ({ ...obj, [k]: v }), {});
    }
    await browser.runtime.sendMessage({ command: "setStorage", storage: "local", data: { videoInfos: allVideoInfos } })
}

async function loadVideoData(uuid) {
    const info = await getVideoInfo(uuid);

    let videoInfos = (await browser.runtime.sendMessage({ command: "getStorage", storage: "local", name: "videoInfos" })).videoInfos || {};
    videoInfos[location.href] = info;
    if(Object.keys(videoInfos).length > 10) {
        videoInfos = Object.entries(videoInfos).sort(([_1,a],[_2,b]) => b.time - a.time);
        videoInfos.length = 10;
        videoInfos = videoInfos.reduce((obj, [k,v]) => ({ ...obj, [k]: v }), {});
    }
    await browser.runtime.sendMessage({ command: "setStorage", storage: "local", data: { videoInfos: videoInfos } })
}

async function getVideoInfo(uuid) {
    console.log("Video UUID:", uuid);
    let data = (await fetch("https://engage.streaming.rwth-aachen.de/search/episode.json?id="+uuid, { credentials: "include" }).then(r => r.json()))["search-results"];

    while(data.total === 0) {
        // For whatever reason this happens sometimes, but refreshing fixes it... maybe the _=... query parameter is not irrelevant, but it works fine like this so whatever
        console.log("Video data not received, trying again in 500ms...");
        await new Promise(r => setTimeout(r, 500));
        data = (await fetch("https://engage.streaming.rwth-aachen.de/search/episode.json?id="+uuid, { credentials: "include" }).then(r => r.json()))["search-results"];
    }

    console.log("Video data:", data);
    const tracks = data.result.mediapackage.media.track;
    return {
        tracks: tracks.filter(t => t.mimetype === "video/mp4" && t.video.resolution.length >= 8 /* at least 720p */)
                      .map(t => ({ url: t.url, resolution: t.video.resolution })),
        stream: (tracks.find(t => t.mimetype === "application/x-mpegURL") || {}).url,
        time: Date.now()
    };
}

function removeChatPopup() {
    let page = document.getElementById("page");
    if(!page) return;

    function hide() {
        for(const e of page.getElementsByClassName("chat-support-vert"))
            e.hidden = true;
    }
    hide();
    new MutationObserver(hide).observe(page, { childList: true });
}

async function acceptCookies() {
    (await when(() => document.getElementById("cookie-confirm-btn"))).click();
}

async function onEmbeddedHiwiLogin() {

    let password = document.getElementsByName("password")[0];
    let username = document.getElementsByName("username")[0];
    if(!(password && password)) return; // This should never happen

    const parent = username.parentElement;
    const usernameIndex = Array.prototype.indexOf.call(parent.childNodes, username);
    const passwordIndex = Array.prototype.indexOf.call(parent.childNodes, password);

    username.remove();
    password.remove();

    username = document.createElement("input");
    password = document.createElement("input");
    username.classList = password.classList = "pretext";
    username.id = username.name = username.type = username.autocomplete = "username";
    password.id = password.name = password.type = password.autocomplete = "password";

    parent.insertBefore(username, parent.childNodes[usernameIndex]);
    parent.insertBefore(password, parent.childNodes[passwordIndex]);

    // If we are already logged in, the page still loads as login page at first and later removes the login fields.
    // At least on firefox this leads to the saved passwords panel always being visible, and not being hidden even
    // though the respective input field has already been removed. Thus, wait a bit and hope that by now the proper
    // website has been loaded
    await new Promise(r => setTimeout(r, 250));
    if(document.getElementById("logout")) return;

    username.focus();

    addAutofillListener([ username ], password, document.getElementById("login_submit"));
}

async function onPSPDarkMode() {
    const btn = await when(() => [...document.getElementsByClassName("mb-2 v-btn v-btn--block v-btn--is-elevated v-btn--has-bg v-size--small")].filter(b => b.innerText.toLowerCase().includes("theme"))[0]);
    const mode = (await browser.storage.sync.get("lightMode")).lightMode ? "theme--light" : "theme--dark";
    while(!btn.className.includes(mode)) {
        btn.click();
        await new Promise(r => setTimeout(r));
    }
}

async function addPSPCtrlEnterSubmit() {
    const textarea = await when(() => document.querySelector("textarea"));
    const submit = await when(() => document.querySelector("input[type=submit]"));
    textarea.addEventListener("keyup", e => {
        if(e.key === "Enter" && e.ctrlKey)
            submit.click();
    });
}

async function addPSPCheckboardHoverInfo() {

    function titleResolver(el, team, route) {
        return async () => {
            const info = await fetch(`${location.origin}/api/checkboard/desk/${team}/${route}`).then(r => r.json());
            if(!info.changed_by) return; // Never modified
            const changeTimeDiff = Math.round((Date.now() - info.last_change) / (1000 * 60))
            el.title = `Letzte Änderung durch ${info.changed_by.name} vor ${changeTimeDiff !== 1 ? changeTimeDiff+" Minuten" : "einer Minute"}`;
        }
    }

    // Checkbox hover
    await when(() => document.querySelector("input[type=checkbox]"));
    for(const input of document.querySelectorAll("input[type=checkbox]")) {
        let td = input.parentElement;
        while(td && td.tagName !== "TD") td = td.parentElement;
        if(!td) return;

        const team = td.parentElement.children[0].innerText.trim();

        let tbody = td.parentElement;
        while(tbody.tagName !== "TBODY") tbody = tbody.parentElement;
        const thead = tbody.previousElementSibling;
        const task = thead.children[0].children[[...td.parentElement.children].indexOf(td)].innerText.trim();
        const route = task === "Nachbefragung" ? "questioning" : "task/"+task;
        input.onmouseover = titleResolver(td, team, route);
    }

    // Queue hover
    const queue = await when(() => document.querySelector(".v-table.v-table--has-top.v-table--has-bottom")?.nextElementSibling);
    queue.onmouseover = () => {
        [...queue.children].filter(c => c.tagName === "SPAN").forEach(async c => await titleResolver(c, c.innerText, "questioning")())
    }
}



function moodleLogin() {
    location.href = "https://moodle.rwth-aachen.de/auth/shibboleth/index.php";
}

async function startCreatingTOTPToken() {
    console.log("Starting to create TOTP token");
    await browser.runtime.sendMessage({ command: "setStorage", storage: "local", data: { "creatingTOTPToken": new Date().getTime() } });
}

async function creatingTOTPToken() {
    const start = (await browser.runtime.sendMessage({ command: "getStorage", storage: "local", name: "creatingTOTPToken" }) || {}).creatingTOTPToken;
    return !!start && new Date().getTime() - start < 60000;
}

async function createTOTPTokenOverviewPage() {
    if(!await creatingTOTPToken()) return;
    clickIDMSubmit();
}

async function createTOTPTokenSelectTypePage() {
    if(!await creatingTOTPToken()) return;
    (await when(() => [...document.querySelectorAll("input[type=radio]")].map(i => i.parentElement).filter(el => el.innerText.includes("TOTP"))[0])).click();
    clickIDMSubmit();
}

async function createTOTPTokenDescriptionPage() {
    if(!await creatingTOTPToken()) return;
    (await when(() => document.querySelector("input[type=text]"))).value = "Quality of RWTH";
    clickIDMSubmit();
}

async function createTOTPTokenFinishPage() {
    if(!await creatingTOTPToken()) return;
    const id = (await when(() => document.querySelector("main"))).innerText.match("TOTP[0-9A-Fa-f]+")[0];
    const key = document.querySelector("a[href^=otpauth]").href.match(/secret=([0-9A-Za-z]+)&/)[1];

    const tokens = (await browser.storage.sync.get("managedTOTPTokens")).managedTOTPTokens || { };
    tokens[id] = { key, name: "Quality of RWTH", generated: new Date().getTime() };
    await browser.storage.sync.set({ managedTOTPTokens: tokens });

    document.querySelector("input[type=text][required]").value = getTOTP(key);

    await browser.runtime.sendMessage({ command: "setStorage", storage: "local", data: { creatingTOTPToken: 0 } });
    await browser.storage.sync.set({ selectedMFAOption: id });
    clickIDMSubmit();
}

async function clickIDMSubmit() {
    const btn = (await when(() => document.querySelector("input.btn.btn-primary[type=submit]")));
    btn.click();
    btn.disabled = true;
}

async function onEmbeddedTicketAdminForward() {
    location.href = "/scp/login.php";
}

async function onEmbeddedTicketLogin() {
    console.log("a")
    const username = await when(() => document.querySelector("#name,#username"));
    console.log("b")
    const password = await when(() => document.querySelector("#pass,#passwd"));
    console.log("c")
    const submit = await when(() => document.querySelector("[type=submit]"));
    console.log(username, password, submit)
    username.type = "username";
    addAutofillListener([ username ], password, submit);
}

function getTOTP(key) {
    return new jsOTP.totp().getOtp(key);
}

function when(condition, pollingInterval = 100) {
    const poll = resolve => {
        value = condition();
        if(value) resolve(value);
        else setTimeout(() => poll(resolve), pollingInterval);
    }
    return new Promise(poll);
}
})();
//#endregion rwthTools.js
