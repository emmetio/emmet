/**
 * Module for working with file. Shall implement
 * IEmmetFile interface.
 *
 * Since implementation of this module depends
 * greatly on current runtime, this module must be
 * initialized with actual implementation first
 * before use. E.g. 
 * require('./plugin/file')({
 * 	read: function() {...}
 * })
 */

if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	return function fn(obj) {
		if (obj) {
			_.extend(fn, obj);
		}
	};
});