'use strict';

const TRADING_RACE_START = +new Date("2020-10-07T12:30:00.000Z");
const TRADING_RACE_END = +new Date("2020-10-14T00:00:00.000Z");

const botVolume = require('./bot-volume');
const exchangeVolume = require('./exchange-volume');

const exchange = exchangeVolume(TRADING_RACE_START, TRADING_RACE_END);
const bot = botVolume(TRADING_RACE_START, TRADING_RACE_END);

console.log("\nYour bot made a volume of %sM over a total volume of %sM\n  Ratio = %s%%",
  (bot / 1000 / 1000).toFixed(3),
  (exchange / 1000 / 1000).toFixed(3),
  (bot * 100 / exchange).toFixed(3));