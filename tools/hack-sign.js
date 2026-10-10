// Prints a signed hack message to paste into YouTube (or any) chat:
//   node tools/hack-sign.js give 1000000
// Needs the private key at ~/.cookie-clicker-hack.pem (or HACK_KEY=/path/to/key.pem). Never commit that key.
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const keyPath = process.env.HACK_KEY || path.join(os.homedir(), '.cookie-clicker-hack.pem');
const command = process.argv.slice(2).join(' ').trim();
if (!command) {
    console.error('usage: node tools/hack-sign.js <command>   e.g. give 1000000, spawn pubnub, maxupgrades');
    process.exit(1);
}
const ts = Math.floor(Date.now() / 1000).toString(36);
const signature = crypto.sign('sha256', Buffer.from(`${ts}|${command}`), {
    key: fs.readFileSync(keyPath),
    dsaEncoding: 'ieee-p1363', // raw r||s, which is what WebCrypto verifies
}).toString('base64url');
console.log(`!hack ${ts} ${signature} ${command}`);
