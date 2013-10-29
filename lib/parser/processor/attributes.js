/**
 * Resolves node attribute names: moves `default` attribute value
 * from stub to real attribute.@async
 *
 * This resolver should be applied *after* resource matcher
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function() {
	var _ = require('lodash');

	function process(node, parser) {
		_.each(node.children, function(item) {
			var defaultAttrValue = item.attribute(parser.DEFAULT_ATTR_NAME);
			if (!_.isUndefined(defaultAttrValue)) {
				// remove stub attribute
				item.attribute(parser.DEFAULT_ATTR_NAME, null);

				// TODO locate *real* default attribute
				var attrList = item.attributeList();
				if (attrList.length) {
					item.attribute(attrList[0].name, defaultAttrValue);
				}
			}
		});
	}

	return {
		/**
		 * @param  {AbbreviationNode} tree
		 * @param  {Object} options
		 * @param  {abbreviation} parser
		 */
		preprocessor: function(tree, options, parser) {
			process(tree, parser);
		}
	};
});