const fs = require('node:fs');
const Module = require('node:module');
const originalRead = fs.readFileSync;
fs.readFileSync = function patchedRead(file, encoding, ...rest) {
  const value = originalRead.call(this, file, encoding, ...rest);
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n') : value;
};
Module._load('./patch-kaia.cjs', module, false);
