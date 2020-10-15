'use strict';

const fs = require('fs');
const path = require('path');

function findInDir(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const fileStat = fs.lstatSync(filePath);

    if (fileStat.isDirectory()) {
      findInDir(filePath, filter, fileList);
    } else if (filter.test(filePath)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function count_object_arrays(obj) {
  return Object.keys(obj).reduce((r, k) => r += obj[k].length, 0);
}

// ----------------------------------------------------------------------------


function botVolume(from_ts, to_ts) {

  console.log("Loading October trades...");

  const TRADES_FILES = findInDir('./history', /2020-10-.*trades\.json$/);

  const TRADES = TRADES_FILES.reduce((r, f) => {
    const pair = f.split(path.sep)[2];
    if (!(pair in r)) r[pair] = [];
    r[pair] = r[pair].concat(require('./' + f));
    return r;
  }, {});

  console.log("... %d trades loaded", count_object_arrays(TRADES));


  console.log("Filtering trades to leaderboard timeslot...");
  for (const pair in TRADES) {
    TRADES[pair] = TRADES[pair].filter(t => t['create_time'] >= from_ts && t['create_time'] < to_ts);
  }

  console.log("... %d trades remaining", count_object_arrays(TRADES));

  console.log("Removing non-API trades...");

  const NON_API_TRADES = {};
  for (const pair in TRADES) {
    const ORDERS = require(`./history/${pair}-orders`);
    NON_API_TRADES[pair] = TRADES[pair].filter(t => {
      const idx = ORDERS.findIndex(o => o['order_id'] === t['order_id']);
      if (idx === -1) {
        console.warn("WARN: order_id %s NOT found in %s!", t['order_id'], pair);
        return true;
      }
      return ORDERS[idx]['client_oid'].indexOf('API') === -1;
    });
  }

  for (const pair in TRADES) {
    TRADES[pair] = TRADES[pair].filter(t => NON_API_TRADES[pair].findIndex(x => x['trade_id'] === t['trade_id']) === -1);
  }

  console.log("... %d trades remaining\n  (%d trades removed)", count_object_arrays(TRADES), count_object_arrays(NON_API_TRADES));

  console.log("Removing self trades...");

  const SELF_TRADES = {};
  for (const pair in TRADES) {
    SELF_TRADES[pair] = TRADES[pair].filter((e, i, self) => self.findIndex(x => x['trade_id'] === e['trade_id'], i) !== i);
  }

  for (const pair in TRADES) {
    TRADES[pair] = TRADES[pair].filter(t => SELF_TRADES[pair].findIndex(x => x['trade_id'] === t['trade_id']) === -1);
  }

  console.log("... %d trades remaining\n  (%d trades removed)", count_object_arrays(TRADES), count_object_arrays(SELF_TRADES));

  // ----------------------------------------------------------------------------

  const CANDLES = require("./history/2020-10-candles-5m");

  const tradeVol = t => t['traded_price'] * t['traded_quantity'];

  const baseVol = e => e.v * ((e.o + e.c + e.h + e.l) / 4);

  const usdtEq = (ts, amount, coin) => {
    const pair = coin + '_USDT';
    const idx = CANDLES[pair].findIndex(e => e.t >= ts);
    const e = Object.assign({}, CANDLES[pair][idx], { 'v': amount });
    return baseVol(e);
  };


  console.log("Computing bot volume from filtered trades...");

  let usdt_vol = 0;
  for (const pair in TRADES) {
    const [coin, base] = pair.split('_');
    usdt_vol += TRADES[pair].reduce((r, e) => r += (base === 'USDT' || base === 'USDC') ? tradeVol(e) : usdtEq(e['create_time'], tradeVol(e), base), 0);
  }

  console.log("Total USD volume from bot: %s", usdt_vol.toFixed(0));

  return usdt_vol;
}


// --------------------------------------------------------------------------

module.exports = botVolume;
