/**
 * Core Zen Coding object, available in global scope
 */
(function(global) {
	
	global.zen_coding = {
		/**
		 * Simple, AMD-like module definition. The module will be added into
		 * <code>zen_coding</code> object and will be available via 
		 * <code>zen_coding.require(name)</code> or <code>zen_coding[name]</code>
		 * @param {String} name
		 * @param {Function} factory
		 * @memberOf zen_coding
		 */
		define: function(name, factory) {
			// do not let redefine existing properties
			if (!(name in this)) {
				this[name] = _.isFunction(factory) 
					? factory(_.bind(this.require, this), _, this)
					: factory;
			}
		},
		
		/**
		 * Returns reference to Zen Coding module
		 * @param {String} name Module name
		 */
		require: function(name) {
			return this[name];
		},
		
		/**
		 * The essential function that expands Zen Coding abbreviation
		 * @param {String} abbr Abbreviation to parse
		 * @param {String} syntax Abbreviation's context syntax
		 * @param {String} profile Output profile (or its name)
		 * @param {TreeNode} contextNode Contextual node where abbreviation is
		 * written
		 * @return {String}
		 */
		expandAbbreviation: function(abbr, syntax, profile, contextNode) {
			if (!abbr) return '';
			
			var filters = this.require('filters');
			var utils = this.require('utils');
			var transform = this.require('transform');
			var parser = this.require('parser');
			
			var data = filters.extractFromAbbreviation(abbr);
			abbr = data[0];
			var additionalFilters = data[1];
			
			var parsedTree = parser.parse(abbr);
			if (parsedTree) {
				var outputTree = transform.transform(parsedTree, syntax, contextNode);
				var filtersList = filters.composeList(syntax, profile, additionalFilters);
				filters.apply(outputTree, filtersList, profile);
				return utils.replaceVariables(outputTree.toString());
			}
			
			return '';
		},
		
		/**
		 * Log message into console if it exists
		 */
		log: function() {
			if (global.console && global.console.log)
				global.console.log.apply(global.console, arguments);
		},
		
		/**
		 * Reference to Underscore.js. 
		 * Get it by calling <code>zen_coding.require('_')</code>
		 */
		_: _
	};
	
	
})(this);