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
	var selector = require('../assets/selector');
	var reExtend = /:extend\s*\((.+?)\)/g;
	var reAll = /\s+all$/;

	var reValidSections = /^@(media|supports)/;

	/**
	 * Collects selectors from list that should be extended
	 * @param  {Array} list
	 * @return {Array}
	 */
	function collectSelectorsToExtend(list) {
		var result = [];
		
		var item, node, nodeName, sels = [];

		var replaceExtend = function(str, p1) {
			sels.push( utils.trim(p1) );
			return '';
		};

		for (var i = 0, il = list.length; i < il; i++) {
			item = list[i];
			node = item.node;

			sels.length = 0;
			nodeName = utils.trim(_.last(item.path).replace(reExtend, replaceExtend));

			for (var j = 0, jl = sels.length; j < jl; j++) {
				result.push({
					sel: sels[j],
					extendWith: nodeName,
					node: node
				});
			}
		}

		return result;
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
	 * Removes `:extend` in given path
	 * @param  {Array} path
	 * @return {Array}
	 */
	function removeExtend(path) {
		for (var i = 0, il = path.length; i < il; i++) {
			path[i] = utils.trim(path[i].replace(reExtend, ''));
		}

		return path;
	}

	/**
	 * Resolves selectors with `:extend()` modifier
	 * @param  {Array} list Plain list of selectors
	 * @return {Array}
	 */
	function resolveExtend(list) {
		// fast test: do we have `:extend` at all?
		var hasExtend = _.find(list, function(item) {
			return reExtend.test(item.path[item.path.length - 1]);
		});

		if (!hasExtend) {
			return list;
		}

		var toExtend = collectSelectorsToExtend(list);
		var options = {syntax: 'less'};

		// extend selectors
		var lookup = createLookup(list);
		_.each(toExtend, function(ex, i) {
			var sel = ex.sel.replace(reAll, '');
			var all = ex.sel != sel;
			var targetSelector = selector.create(sel);
			var extendWith = selector.create(ex.extendWith);

			// TODO implement `not all` feature
			_.each(lookup, function(l) {
				var ctx = lookup[l.listIx];
				ctx.rules = selector.extend(ctx.rules, targetSelector, extendWith, options);
			});
		});

		var out = [];
		_.each(lookup, function(l) {
			var path = l.item.path.slice(0);
			path[path.length - 1] = _.map(l.rules, function(rule) {
				return rule.toString();
			}).join(', ');

			out.push({
				path: removeExtend(path),
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