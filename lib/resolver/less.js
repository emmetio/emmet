/**
 * LESS selector resolver: takes parsed section tree of LESS selectors 
 * and produces new tree with resolved CSS selectors
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	var cssSections = require('../utils/cssSections');
	var utils = require('../utils/common');
	var preprocessor = require('./preprocessor');

	var reValidSections = /^@(media|supports)/;

	/**
	 * Resolves selectors with `:extend()` modifier
	 * @param  {Array} list Plain list of selectors
	 * @return {Array}
	 */
	function resolveExtend(list) {
		var reExtend = /:extend\s*\((.+?)\)/g;
		var reAll = /\s+all$/;

		// fast test: do we have `:extend` at all?
		var hasExtend = _.find(list, function(item) {
			return reExtend.test(item.path[item.path.length - 1]);
		});

		if (!hasExtend) {
			return list;
		}

		var out = [], extended = [];
		
		// use two-pass filtering: first, find selectors that should 
		// be extended and remove those with `:extend()`, then actually 
		// extend filtered selectors
		var path, toExtend, sel;
		for (var i = 0, il = list.length, item; i < il; i++) {
			item = list[i];
			path = [];
			for (var j = 0, jl = item.path.length; j < jl; j++) {
				sel = item.path[j];
				toExtend = [];
				sel = sel.replace(reExtend, function(m, p1) {
					toExtend.push(utils.trim(p1));
					return '';
				});

				sel = utils.trim(sel);
				for (var k = 0, kl = toExtend.length; k < kl; k++) {
					extended.push({
						sel: toExtend[k],
						extendWith: sel
					});
				};

				path.push(sel);
			}

			if (path.length) {
				out.push(preprocessor.copy({path: path}, item));
			}
		}

		if (!extended.length) {
			// nothing to extend
			return out;
		}

		// extend selectors
		var lookup = preprocessor.createLookup(out);
		var lookupKeys = _.keys(lookup);
		_.each(extended, function(ex, i) {
			var targetSelector = ex.sel.replace(reAll, '');
			if (targetSelector === ex.sel) {
				// no “all“ modifier: extend exact selectors only
				if (lookup[targetSelector]) {
					_.each(lookup[targetSelector], function(val) {
						val.ref.path[val.selIx] += ', ' + ex.extendWith;
					});
				}
			} else {
				// using “all“ modifier: extend all selectors that 
				// includes current one
				var re = new RegExp('(^|\\b)' + utils.escapeForRegexp(targetSelector) + '(\\b|$)');
				var targets = _.filter(lookupKeys, function(key) {
					return re.test(key);
				});

				_.each(targets, function(sel) {
					var val = lookup[sel];
					_.each(lookup[sel], function(val) {
						val.ref.path[val.selIx] += ', ' + val.part.replace(re, ex.extendWith);
					});
				});
			}
		});

		return out;
	}

	/**
	 * Remove mixins that have no representation in 
	 * final CSS, e.g. ones with arguments
	 * @param  {Array} list
	 * @return {Array}
	 */
	function removeMixins(list) {
		list = _.map(list, function(item) {
			var path = _.filter(item.path, function(p) {
				return reValidSections.test(p) || p.charAt(p.length - 1) !== ')';
			});
			
			if (!path.length) {
				return null;
			}

			return preprocessor.copy({path: path}, item);
		});

		return _.compact(list);
	}

	return {
		resolve: function(tree) {
			var list = preprocessor.resolve(tree);
			list = resolveExtend(list);
			list = removeMixins(list);
			return list;
		}
	};
});