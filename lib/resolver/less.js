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

	function ExtendItem(sel, listItem) {
		this.sel = sel;
		this.listItem = listItem;
		this.node = listItem.node;
		this._selCache = null;
		this._selCacheKey = null;
	}

	ExtendItem.prototype = {
		extendWith: function() {
			var sel = _.last(this.listItem.path);
			// if we have cached value, validate it first
			if (this._selCache !== null && this._selCacheKey === sel) {
				return this._selCache;
			}

			this._selCacheKey = sel;
			this._selCache = selector.rules(stripExtend(sel), true);
			return this._selCache;
		}
	};

	function LookupItem(listItem, i) {
		this.listIx = i;
		this.listItem = listItem;
		this._ruleCache = null;
		this._ruleCacheKey = null;
	}

	LookupItem.prototype = {
		/**
		 * Returns parsed rules for given selector
		 * @return {Array
		 */
		rules: function() {
			var sel = _.last(this.listItem.path);
			// if we have parsed and cached item,
			// validate it first
			if (this._ruleCache !== null && sel === this._ruleCacheKey) {
				return this._ruleCache;
			}

			this._ruleCacheKey = sel;
			this._ruleCache = selector.rules(sel, true);
			return this._ruleCache;
		}
	};

	/**
	 * Collects selectors from list that should be extended
	 * @param  {Array} list
	 * @return {Array}
	 */
	function collectSelectorsToExtend(list) {
		var result = [];
		
		var item, nodeName, sels = [], m;
		for (var i = 0, il = list.length; i < il; i++) {
			item = list[i];
			nodeName = _.last(item.path);
			sels.length = 0;
			
			while (m = reExtend.exec(nodeName)) {
				sels.push( utils.trim(m[1]) );
			}

			for (var j = 0, jl = sels.length; j < jl; j++) {
				result.push(new ExtendItem(sels[j], item));
			}
		}

		return result;
	}

	function lookupItem(item, i) {
		return new LookupItem(item, i);
	}

	function createLookup(list) {
		return _.map(list, lookupItem);
	}

	/**
	 * Strips `:extend` from given selector
	 * @param  {String} sel
	 * @return {String}
	 */
	function stripExtend(sel) {
		return utils.trim(sel.replace(reExtend, ''));
	}

	/**
	 * Removes `:extend` in given path
	 * @param  {Array} path
	 * @return {Array}
	 */
	function removeExtendFromPath(path) {
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

		// extend selectors
		var toExtend = collectSelectorsToExtend(list);
		var lookup = createLookup(list);

		// In LESS, the order of selectors to extend is not important:
		// selectors can extend each other and extended selectors can extend
		// others (with extended selector).
		// To keep tree’s selectors up-to-date after extention, we have to 
		// update `path` with extended selector so `LookupItem` and `ExtendItem`
		// will return moste recent values
		_.each(toExtend, function(ex, i) {
			var sel = ex.sel.replace(reAll, '');
			var options = {syntax: 'less', strict: ex.sel === sel};
			var targetSelector = selector.create(sel);
			_.each(ex.extendWith(), function(extendWith) {
				_.each(lookup, function(l) {
					if (l.listItem === ex.listItem) {
						// self-referencing, ignore
						return;
					}
					var rules = selector.extend(l.rules(), targetSelector, extendWith, options)
					var path = l.listItem.path;
					path[path.length - 1] = _.map(rules, function(r) {
						return r.toString();
					}).join(', ');
				});
			});
		});

		// console.log(_.pluck(list, 'path'));
		_.each(list, function(item) {
			item.path = removeExtendFromPath(item.path);
		});
		return list;

		var out = [];
		_.each(lookup, function(l) {
			var path = l.item.path.slice(0);
			path[path.length - 1] = _.map(l.rules, function(rule) {
				return rule.toString();
			}).join(', ');

			out.push({
				path: removeExtendFromPath(path),
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