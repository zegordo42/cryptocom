'use strict';

const CANDLES = require("./history/2020-10-candles-5m");


function exchangeVolume(from_ts, to_ts) {

  const baseVol = e => e.v * ((e.o + e.c + e.h + e.l) / 4);

  const usdtEq = (ts, amount, coin) => {
    const pair = coin + '_USDT';
    const idx = CANDLES[pair].findIndex(e => e.t >= ts);
    const e = Object.assign({}, CANDLES[pair][idx], { 'v': amount });
    return baseVol(e);
  };


  const VOLUME = {};
  let usdt_vol = 0;
  for (const pair in CANDLES) {
    const [coin, base] = pair.split('_');
    if (!(base in VOLUME)) VOLUME[base] = 0;
    VOLUME[base] += CANDLES[pair].reduce((r, e) => {
      if (e.t >= from_ts && e.t < to_ts) {
        const v = baseVol(e);
        r += v;
        usdt_vol += (base === 'USDT' || base === 'USDC') ? v : usdtEq(e.t, v, base);
      }
      return r;
    }, 0);
  }

  console.log("Total Exchange Volume:");
  for (const x in VOLUME) {
    console.log("  %s: %s", x, VOLUME[x].toFixed(4));
  }
  console.log("In USD: %d", usdt_vol.toFixed(0));

  return usdt_vol;
}


// ---------------------------------------------------------------------

module.exports = exchangeVolume;
