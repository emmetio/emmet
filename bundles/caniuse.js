/**
 * Bundler, used in builder script to statically
 * include optimized caniuse.json into bundle
 */
var db = require('caniuse-db/data.json');
var ciu = require('../lib/assets/caniuse');
ciu.load(db, true);
