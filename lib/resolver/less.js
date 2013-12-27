/**
 * LESS selector resolver: takes parsed section tree of LESS selectors 
 * and produces new tree with with resolved CSS selectors
 * @type {[type]}
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	var cssSections = require('../utils/cssSections.js');
	var utils = require('../utils/common.js');
	var stringStream = require('../assets/stringStream.js');

	var reValidSections = /^@(media|supports)/;
	var reMedia = /@media\s*/i;

	function copyItem(item, extend) {
		return _.extend({}, item, extend);
	}

	/**
	 * Replaces &-reference in selector with parent selector
	 * @param  {String} sel    Child selector with possible &-reference
	 * @param  {String} parent Parent selector to put instead of &-reference
	 * @return {String}        If reference wasn’t found, returns `sel` as-is
	 */
	function replaceReference(parent, child) {
		var stream = stringStream(child);
		var out = '', ch;
		while ((ch = stream.next())) {
			if (ch === '&') {
				out += parent;
			} else if (ch === '"' || ch === "'") {
				stream.start = stream.pos - 1;
				stream.skipString(ch);
				out += stream.current();
			} else {
				out += ch;
			}
		}

		return out;
	}

	function joinSelectors(parent, child) {
		var resolved = replaceReference(parent, child);
		if (resolved == child) {
			// no &-reference found, concat two selectors with space
			resolved = parent + ' ' + child;
		}

		return resolved;
	}

	/**
	 * Check if selector path contains media query
	 * @param  {Array} path List of CSS selectors
	 * @return {Boolean}
	 */
	function containsMediaQuery(path) {
		return !!_.find(path, function(p) {
			return reMedia.test(p);
		});
	}

	/**
	 * Fixes media queries in parsed selectors
	 * @param  {Array} list List of plain selectors
	 * @return {Array}      Transformed selectors list
	 */
	function resolveMediaQueries(list) {
		var out = [];
		_.each(list, function(item) {
			if (!containsMediaQuery(item.path)) {
				return out.push(item);
			}

			var mq;
			var selectors = _.filter(item.path, function(sel) {
				if (!reMedia.test(sel)) {
					return true;
				}

				if (!mq) {
					mq = sel;
				} else {
					mq += ' and ' + sel.replace(reMedia, '');
				}
			});

			selectors.unshift(mq);
			out.push(copyItem(item, {path: selectors}));
		});

		return out;
	}

	function toPlainList(node, out) {
		out = out || [];
		if (node.parent) { // not a root element
			var path = [node.name()];
			var ctx = node.parent;
			while (ctx.parent) {
				path.unshift(ctx.name());
				ctx = ctx.parent;
			}

			out.push({
				path: path,
				node: node
			});
		}

		for (var i = 0, il = node.children.length; i < il; i++) {
			toPlainList(node.children[i], out);
		}

		return out;
	}

	/**
	 * Creates lookup hash where each distict selector is a key
	 * and value contains reference to original `list` item
	 * and meta info about selector
	 * @param  {Array} list
	 * @return {Object}
	 */
	function createLookup(list) {
		var lookup = {};
		_.each(list, function(item) {
			_.each(item.path, function(sel, i) {
				var parts = cssSections.splitSelector(sel);
				_.each(parts, function(p, j) {
					if (!lookup[p]) {
						lookup[p] = [];
					}

					lookup[p].push({
						selIx: i,
						partIx: j,
						part: p,
						allParts: parts,
						ref: item
					});
				});
			});
		});

		return lookup;
	}

	/**
	 * Resolves selectors with `:extend()` modifier
	 * @param  {Array} list Plain list of selectors
	 * @return {Array}
	 */
	function resolveExtend(list) {
		var out = [], extended = [];
		var reExtend = /:extend\s*\((.+?)\)/g;
		var reAll = /\s+all$/;

		// use two-pass filtering: first, find selectors that should 
		// be extended and remove those with `:extend()`, then actually 
		// extend filtered selectors
		_.each(list, function(item) {
			var path = _.map(item.path, function(sel) {
				var toExtend = [];
				sel = sel.replace(reExtend, function(m, p1) {
					toExtend.push(utils.trim(p1));
					return '';
				});

				sel = utils.trim(sel);
				_.each(toExtend, function(ex) {
					extended.push({
						sel: ex,
						extendWith: sel
					});
				});

				return sel;
			});

			if (path.length) {
				out.push(copyItem(item, {path: path}));
			}
		});

		if (!extended.length) {
			// nothing to extend
			return out;
		}

		// extend selectors
		var lookup = createLookup(out);
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
				var targets = _.filter(_.keys(lookup), function(key) {
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

			return copyItem(item, {path: path});
		});

		return _.compact(list);
	}

	function resolveNesting(list) {
		var out = [];
		_.each(list, function(item) {
			var sel = [], cur;
			var path = _.clone(item.path);
			var parent = path.shift();

			if (reValidSections.test(parent)) {
				// do not use selectors like `@media` or `@supports`
				// to resolve name
				sel.push(parent);
				parent = path.shift();
			}

			if (!parent) {
				return;
			}

			parent = cssSections.splitSelector(parent);

			var resolved;
			while (path.length) {
				resolved = []
				cur = cssSections.splitSelector(path.shift());

				// for performance, use loops instead of iterators
				for (var i = 0, il = parent.length; i < il; i++) {
					for (var j = 0, jl = cur.length; j < jl; j++) {
						resolved.push(joinSelectors(parent[i], cur[j]));
					}
				}

				parent = resolved;
			}

			sel.push(parent.join(', '));
			out.push(copyItem(item, {path: sel}));
		});
		return out;
	}

	return {
		resolve: function(tree) {
			var list = toPlainList(tree);
			list = resolveMediaQueries(list);
			list = resolveNesting(list);
			list = resolveExtend(list);
			list = removeMixins(list);
			return list;
		}
	};
});