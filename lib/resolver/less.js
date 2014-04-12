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
	var reExtend = /&?:extend\s*\((.+?)\);?/g;
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
		this.node = listItem.node;
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
		},

		/**
		 * Returns parsed path of current node
		 * @return {Array}
		 */
		path: function() {
			return this.listItem.path;
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

			sels = sels.concat(collectInnerExtend(item.node));
			sels = _.uniq(sels);

			for (var j = 0, jl = sels.length; j < jl; j++) {
				result.push(new ExtendItem(sels[j], item));
			}
		}

		return result;
	}

	/**
	 * Check if current tree node contains extends defined in it
	 * as `&:extend(...)`
	 * @param  {CSSNode} node
	 * @return {Array}   List of extends found
	 */
	function collectInnerExtend(node) {
		var out = [], m;
		if (node.content) {
			// a mocked CSS section tree
			var content = node.content();
			while (m = reExtend.exec(content)) {
				out.push( utils.trim(m[1]) );
			}
		} else {
			for (var i = 0, il = node.children.length, name; i < il; i++) {
				name = item.children[i].name();
				while (m = reExtend.exec(name)) {
					out.push( utils.trim(m[1]) );
				}
			}
		}

		return out;
	}

	function lookupItem(item, i) {
		return new LookupItem(item, i);
	}

	function createLookup(list) {
		return _.map(list, lookupItem);
	}

	function createIdLookup(list) {
		var lookup = {};
		_.each(list, function(item) {
			lookup[item.node.id] = item;
		});
		return lookup;
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
			return '';
		}

		var out = '';
		for (var i = 0, il = path.length - 1; i < il; i++) {
			out += (i ? '/' : '') + path[i];
		}
		return out;
	}

	/**
	 * Returns all child node of given one, including
	 * grandchildren
	 * @param  {CSSNode} node
	 * @return {Array}
	 */
	function allChildren(node, out) {
		out = out || [];
		for (var i = 0, il = node.children.length; i < il; i++) {
			out.push(node.children[i]);
			allChildren(node.children[i], out);
		}

		return out;
	}

	function createNestingLookup(list) {
		var lookup = {};
		var idLookup = createIdLookup(list);
		_.each(list, function(item) {
			var key = nestingKey(item.path());
			if (!(key in lookup)) {
				lookup[key] = [];
			}

			lookup[key].push(item);
			if (key) {
				// add all nested children to lookup scope
				_.each(allChildren(item.node), function(node) {
					lookup[key].push(idLookup[node.id]);
				});
			}
		});
		return lookup;
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
	 * Fast test if list contains `:extend` instructions
	 * @param  {Array}  list Plain list of nodes
	 * @return {Boolean}
	 */
	function hasExtend(list) {
		var item, children;
		for (var i = 0, il = list.length; i < il; i++) {
			item = list[i];
			if (reExtend.test(_.last(item.path))) {
				return true;
			}

			// check for `&:extend()` inside node (its children or content)
			if (item.node.content) {
				if (reExtend.test(item.node.content())) {
					return true;
				}
			} else if (items.node.children) {
				children = items.node.children
				for (var j = 0, jl = children.length; j < jl; j++) {
					if (reExtend.test(children[j].name())) {
						return true;
					}
				}
			}
		}

		return false;
	}

	/**
	 * Resolves selectors with `:extend()` modifier
	 * @param  {Array} list Plain list of selectors
	 * @return {Array}
	 */
	function resolveExtend(list) {
		if (!hasExtend(list)) {
			return list;
		}

		// console.log('Before', _.pluck(list, 'path'));

		// extend selectors
		var toExtend = collectSelectorsToExtend(list);
		var lookup = createLookup(list);
		var nestingLookup = null;

		// In LESS, the order of selectors to extend is not important:
		// selectors can extend each other and extended selectors can extend
		// others (with extended selector).
		// To keep tree’s selectors up-to-date after extention, we have to 
		// update `path` with extended selector so `LookupItem` and `ExtendItem`
		// will return moste recent values
		_.each(toExtend, function(ex, i) {
			var sel = ex.sel.replace(reAll, '');
			var all = ex.sel !== sel;
			var options = {syntax: 'less', exact: !all};
			var targetRules = selector.rules(sel, true);

			var key = nestingKey(ex.listItem.path);
			var lookupItems = lookup;
			if (key) {
				if (!nestingLookup) {
					nestingLookup = createNestingLookup(lookup);
				}
				lookupItems = nestingLookup[key];
			}

			_.each(ex.extendWith(), function(extendWith) {
				_.each(lookupItems, function(l) {
					if (l.listItem === ex.listItem) {
						// self-referencing, ignore
						return;
					}

					if (!all) {
						// requested exact match: run simplier
						// and faster extend
						extendWith = extendWith.toString();
						var rulesLookup = {};
						_.each(l.rules(), function(rule) {
							rulesLookup[stripExtend(rule.toString())] = true;
						});

						_.each(targetRules, function(targetSelector) {
							targetSelector = targetSelector.toString();

							if (targetSelector in rulesLookup && !(extendWith in rulesLookup)) {
								var path = l.listItem.path;
								rulesLookup[extendWith] = true;
								path[path.length - 1] += ', ' + extendWith;
							}
						});
					} else {
						// requested partial match
						_.each(targetRules, function(targetSelector) {
							var rules = selector.extend(l.rules(), targetSelector, extendWith, options)
							var path = l.listItem.path;
							path[path.length - 1] = _.map(rules, function(r) {
								return r.toString();
							}).join(', ');
						});
					}
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
		reExtend: reExtend,
		resolve: function(tree) {
			var list = preprocessor.resolve(tree, {nestedInsert: 'after'});
			list = resolveExtend(list);
			list = removeMixins(list);
			return list;
		}
	};
});