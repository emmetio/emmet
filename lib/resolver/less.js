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

	/**
	 * Replaces &-reference in selector with parent selector
	 * @param  {String} sel    Child selector with possible &-reference
	 * @param  {String} parent Parent selector to put instead of &-reference
	 * @return {String}        If reference wasn’t found, returns `sel` as-is
	 */
	function replaceReference(sel, parent) {
		var stream = stringStream(sel);
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

	/**
	 * Returns resolved selector for given node
	 * @param  {CSSSection} node 
	 * @return {Array}      Array of normalized selector parts
	 */
	function resolvedSelector(node) {
		if (typeof node.data('lessResolved') == 'undefined') {
			if (!node.parent) {
				return null;
			}

			// check if it’s a top-level node
			if (node.parent && !node.parent.parent) {
				node.data('lessResolved', cssSections.splitSelector(node.name()));
			} else {
				var parentSel = resolvedSelector(node.parent);
				var curSel = cssSections.splitSelector(node.name());
				var resolved = [];

				// for performance, use loops instead of iterators
				var ps, cs, rs;
				for (var i = 0, il = parentSel.length; i < il; i++) {
					ps = parentSel[i];
					for (var j = 0, jl = curSel.length; j < jl; j++) {
						cs = curSel[j];
						rs = replaceReference(cs, ps);
						if (rs == cs) {
							// no &-reference found, concat two selectors with space
							rs = ps + ' ' + cs;
						}

						resolved.push(rs);
					}
				}

				node.data('lessResolved', resolved);
			}
		}

		return node.data('lessResolved');
	}

	/**
	 * Recursively resolves CSS node list
	 * @param  {Array} nodeset List of CSSNode
	 * @param  {Array} out     Result reference
	 * @return {Array}
	 */
	function resolveNodelist(nodelist, out) {
		out = out || [];
		for (var i = 0, il = nodelist.length, node; i < il; i++) {
			node = nodelist[i];
			var sel = resolvedSelector(node);
			out.push({
				selector: sel,
				selectorString: sel.join(', '),
				ref: node
			});

			if (node.children) {
				resolveNodelist(node.children, out);
			}
		}

		return out;
	}

	return {
		resolve: function(tree) {
			return _.compact(resolveNodelist(tree.children));
		}
	};
});