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
	var cssSections = require('../utils/cssSections');
	var utils = require('../utils/common');
	var stringStream = require('../assets/stringStream');

	var reValidSections = /^@(media|supports)/;
	var reMedia = /@media\s*/i;
	var reHasRef = /&/;

	function copy(target, source) {
		for (var p in source) if (source.hasOwnProperty(p)) {
			if (!(p in target)) {
				target[p] = source[p];
			}
		}

		return target;
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
		if (!reHasRef.test(child)) {
			return parent + ' ' + child;
		}

		var resolved = replaceReference(parent, child);
		if (resolved === child) {
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
		for (var i = path.length - 1; i >= 0; i--) {
			if (reMedia.test(path[i])) {
				return true;
			}
		}
		return false;
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
			out.push(copy({path: selectors}, item));
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
	 * Creates lookup hash where each distinct selector is a key
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
				out.push(copy({path: path}, item));
			}
		}

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

			return copy({path: path}, item);
		});

		return _.compact(list);
	}

	function resolveNesting(list) {
		// this function must be highly optimized for performance
		var out = [];
		var selCache = {};

		var splitSel = function(sel) {
			if (!(sel in selCache)) {
				selCache[sel] = cssSections.splitSelector(sel);
			}

			return selCache[sel];
		};


		var sel, parent, resolved, cur, pathRef;
		for (var k = 0, kl = list.length, item; k < kl; k++) {
			item = list[k];
			sel = [];
			pathRef = 0;
			parent = item.path[pathRef++];

			if (reValidSections.test(parent)) {
				// do not use selectors like `@media` or `@supports`
				// to resolve name
				sel.push(parent);
				parent = item.path[pathRef++];
			}

			if (!parent) {
				continue;
			}

			parent = splitSel(parent);

			while (pathRef < item.path.length) {
				resolved = [];
				cur = splitSel(item.path[pathRef++]);

				// for performance, use loops instead of iterators
				for (var i = 0, il = parent.length; i < il; i++) {
					for (var j = 0, jl = cur.length; j < jl; j++) {
						resolved.push(joinSelectors(parent[i], cur[j]));
					}
				}

				parent = resolved;
			}

			sel.push(parent.join(', '));
			out.push(copy({path: sel}, item));
		}

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