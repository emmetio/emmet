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
	var stringStream = require('../assets/stringStream.js');
	var cssParser = require('../parser/css.js');

	var reValidSections = /^@(media|supports)/;
	var reMedia = /@media\s*/i;

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
	function fixMediaQueries(list) {
		var out = [];
		var reMedia = /@media\s*/i;
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
			out.push({
				path: selectors,
				node: item.node
			});
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

	function removeMixins(list) {
		list = _.map(list, function(item) {
			var path = _.filter(item.path, function(p) {
				return reValidSections.test(p) || p.charAt(p.length - 1) !== ')';
			});
			
			if (!path.length) {
				return null;
			}

			return {
				path: path,
				node: item.node
			};
		});

		return _.compact(list);
	}

	function resolveList(list) {
		list = fixMediaQueries(list);
		list = removeMixins(list);

		// resolve selectors
		var out = [];
		_.each(list, function(item) {
			var sel = [], cur;
			var path = item.path;
			var parent = path.shift();
			if (reValidSections.test(parent)) {
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

			// add all resolved selectors with the reference to the same node
			_.each(parent, function(s) {
				var finalSel = [].concat(sel);
				finalSel.push(s);
				out.push({
					selector: finalSel,
					selectorString: finalSel.join(', '),
					ref: item.node
				})
			});
		});

		return out;
	}

	return {
		resolve: function(tree) {
			return resolveList(toPlainList(tree));
		}
	};
});