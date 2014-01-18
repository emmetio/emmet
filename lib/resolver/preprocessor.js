/**
 * A common resolver for propercoessors: resolves nesting,
 * &-references, etc. in given parsed tree
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	var cssSections = require('../utils/cssSections');
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
	 * Resolves nesting of sections: each nested section receives
	 * its semi-evaluated CSS selector (e.g. the one that will be in 
	 * in final CSS output)
	 * @param  {Array} list Nodes array
	 * @return {Array}
	 */
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
		/**
		 * Makes initial resolving of parsed preprocessor
		 * source tree: nesting, &-references
		 * @param  {CSSNode} tree 
		 * @return {Array}      Plain list of tree resolved nodes
		 */
		resolve: function(tree) {
			var list = toPlainList(tree);
			list = resolveMediaQueries(list);
			list = resolveNesting(list);
			return list;
		},
		/**
		 * Creates lookup hash where each distinct selector is a key
		 * and value contains reference to original `list` item
		 * and meta info about selector
		 * @param  {Array} list
		 * @return {Object}
		 */
		createLookup: function(list) {
			var lookup = {};

			_.each(list, function(item) {
				var parts, p;
				for (var i = 0, il = item.path.length; i < il; i++) {
					parts = cssSections.splitSelector(item.path[i]);
					for (var j = 0, jl = parts.length; j < jl; j++) {
						p = parts[j];
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
					}
				}
			});

			return lookup;
		},
		copy: copy
	};
});