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

define(function(require, exports, module) {
	var _ = require('lodash');
	var utils = require('../../utils/common');

	var findDefault = function(attr) {
		return attr.isDefault;
	};

	var findImplied = function(attr) {
		return attr.isImplied;
	};

	var findEmpty = function(attr) {
		return !attr.value;
	};

	function resolveDefaultAttrs(node, parser) {
		_.each(node.children, function(item) {
			var attrList = item.attributeList();
			var defaultAttrValue = item.attribute(parser.DEFAULT_ATTR_NAME);
			if (!_.isUndefined(defaultAttrValue)) {
				// remove stub attribute
				item.attribute(parser.DEFAULT_ATTR_NAME, null);
				
				if (attrList.length) {
					// target for default value:
					// 1. default attribute
					// 2. implied attribute
					// 3. first empty attribute
				
					// find attribute marked as default
					var defaultAttr = _.find(attrList, findDefault) 
						|| _.find(attrList, findImplied) 
						|| _.find(attrList, findEmpty);

					if (defaultAttr) {
						var oldVal = item.attribute(defaultAttr.name);
						var newVal = utils.replaceUnescapedSymbol(oldVal, '|', defaultAttrValue);
						// no replacement, e.g. default value does not contains | symbol
						if (oldVal == newVal) {
							newVal = defaultAttrValue
						}
						
						item.attribute(defaultAttr.name, newVal);
					}
				}
			} else {
				// if no default attribute value, remove implied attributes
				_.each(attrList, function(attr) {
					if (attr.isImplied) {
						item.attribute(attr.name, null);
					}
				});
			}

			resolveDefaultAttrs(item, parser);
		});
	}

	return {
		/**
		 * @param  {AbbreviationNode} tree
		 * @param  {Object} options
		 * @param  {abbreviation} parser
		 */
		preprocessor: function(tree, options, parser) {
			resolveDefaultAttrs(tree, parser);
		}
	};
});