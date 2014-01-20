/**
 * SCSS selector resolver: takes parsed section tree of SCSS selectors 
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
	var reMixin = /^@mixin/;
	var reExtend = /^@extend\b/;
	var reExtendMocked = /@extend\s+(.+?)(;|\})/g;
	var reOptional = /\s+\!optional\s*$/;

	/**
	 * Quickly detects if given list of parsed CSS tree
	 * nodes contains `@extend` instructions
	 * @param  {Array}  list Plain list of selectors
	 * @return {Boolean}
	 */
	function hasExtend(list, options) {
		for (var i = 0, il = list.length; i < il; i++) {
			var item = list[i].node;
			for (var j = 0, jl = item.children.length; j < jl; j++) {
				if (reExtend.test(item.children[j].name())) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Collects selectors from list that should be extended
	 * @param  {Array} list
	 * @return {Array}
	 */
	function collectExtendedSelectors(list) {
		var toExtend = [];
		
		var child, childName;
		for (var i = 0, il = list.length, item; i < il; i++) {
			item = list[i].node;

			for (var j = 0, jl = item.children.length; j < jl; j++) {
				child = item.children[j];
				childName = child.name();
				if (reExtend.test(childName)) {
					toExtend.push({
						sel: utils.trim(childName.replace(reExtend, '')).replace(reOptional, ''),
						extendWith: item.name()
					});
				}
			}
		}

		return toExtend;
	}

	function collectExtendedSelectorsMock(list) {
		var toExtend = [];
		list.forEach(function(item) {
			var content = item.node.content(), m;
			while (m = reExtendMocked.exec(content)) {
				toExtend.push({
					sel: utils.trim(m[1]).replace(reOptional, ''),
					extendWith: item.node.name()
				});
			}
		});

		return toExtend;
	}

	/**
	 * Resolves sections that contains `@extend` instruction
	 * @param  {Array} list Plain list of selectors
	 * @return {Array}
	 */
	function resolveExtend(list, options) {
		if (!options.mock && !hasExtend(list, options)) {
			console.log('no extend');
			return list;
		}

		// use two-pass filtering: first, find selectors that should 
		// be extended (contains `@extend` child), then actually 
		// extend selectors found
		var toExtend = options.mock 
			? collectExtendedSelectorsMock(list)
			: collectExtendedSelectors(list);

		if (!toExtend.length) {
			// nothing to extend
			console.log('nothing to extend');
			return list;
		}

		console.log(toExtend);
		return list;

		// extend selectors
		var lookup = preprocessor.createLookup(list);
		_.each(toExtend, function(ex, i) {
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
		var hasMixin = function(p) {
			return reMixin.test(p);
		};

		return _.filter(list, function(item) {
			return !_.find(item.path, hasMixin);
		});
	}

	return {
		resolve: function(tree, options) {
			options = options || {};
			var list = preprocessor.resolve(tree);
			list = resolveExtend(list, options);
			list = removeMixins(list);
			return list;
		}
	};
});