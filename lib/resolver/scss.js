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
	var selector = require('../assets/selector');

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
	 * Check if given selector has extend part
	 * @param  {Selector}  sel
	 * @return {Boolean}
	 */
	function hasExtendPart(sel) {
		var parts = sel.parts();
		var reExtPart = /^%/;
		for (var i = parts.length - 1; i >= 0; i--) {
			var frags = parts[i].fragments();
			for (var j = frags.length - 1; j >= 0; j--) {
				if (reExtPart.test(frags[j])) {
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
	function collectSelectorsToExtend(list) {
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
						extendWith: item.name(),
						node: item
					});
				}
			}
		}

		return toExtend;
	}

	function collectSelectorsToExtendMock(list) {
		var toExtend = [];
		list.forEach(function(item, i) {
			var content = item.node.content(), m;
			while (m = reExtendMocked.exec(content)) {
				toExtend.push({
					sel: utils.trim(m[1]).replace(reOptional, ''),
					extendWith: item.node.name(),
					node: item
				});
			}
		});

		return toExtend;
	}

	function createLookup(list) {
		return _.map(list, function(item, i) {
			return {
				listIx: i,
				rules: selector.rules(_.last(item.path), true),
				item: item
			};
		});
	}

	/**
	 * Creates key from path that can be used for
	 * nesting lookups
	 * @param  {Array} path Node path
	 * @return {String}     Returns `null` if current path
	 * can’t be used for nesting
	 */
	function nestingKey(path) {
		if (path.length < 2) {
			return null;
		}

		var out = '';
		for (var i = 0, il = path.length - 1; i < il; i++) {
			out += (i ? '/' : '') + path[i];
		}
		return out;
	}

	function createNestingLookup(list) {
		var lookup = {};
		_.each(list, function(item) {
			var key = nestingKey(item.item.path);
			if (!key) {
				return;
			}

			if (!(key in lookup)) {
				lookup[key] = [];
			}

			lookup[key].push(item);
		});
		return lookup;
	}

	/**
	 * Resolves sections that contains `@extend` instruction
	 * @param  {Array} list Plain list of selectors
	 * @return {Array}
	 */
	function resolveExtend(list, options) {
		if (!options.mock && !hasExtend(list, options)) {
			return list;
		}

		// use two-pass filtering: first, find selectors that should 
		// be extended (contains `@extend` child), then actually 
		// extend selectors found
		var toExtend = options.mock 
			? collectSelectorsToExtendMock(list)
			: collectSelectorsToExtend(list);

		// extend selectors
		var lookup = createLookup(list);
		var nestingLookup = createNestingLookup(lookup);
		_.each(toExtend, function(ex, i) {
			var targetSelector = selector.create(ex.sel);
			var extendWith = selector.create(ex.extendWith);
			var key = nestingKey(ex.node.path);
			var items = key ? nestingLookup[key] : lookup;

			_.each(items, function(l) {
				var ctx = lookup[l.listIx];
				ctx.rules = selector.extend(ctx.rules, targetSelector, extendWith);
			});
		});

		var out = [];
		_.each(lookup, function(l) {
			var rules = _.filter(l.rules, function(rule) {
				return !hasExtendPart(rule);
			});

			if (!rules.length) {
				return;
			}

			var path = l.item.path.slice(0);
			path[path.length - 1] = _.map(rules, function(rule) {
				return rule.toString();
			}).join(', ');

			out.push({
				path: path,
				node: l.item.node
			});
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