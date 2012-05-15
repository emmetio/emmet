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
					? this.exec(factory)
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
		 * Helper method that just executes passed function but with all 
		 * important arguments like 'require' and '_'
		 * @param {Function} fn
		 * @param {Object} context Execution context
		 */
		exec: function(fn, context) {
			return fn.call(context || global, _.bind(this.require, this), _, this);
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
			
			profile = this.require('profile').get(profile, syntax);
			
			var data = filters.extractFromAbbreviation(abbr);
			var outputTree = transform.transform(data[0], syntax, contextNode);
			var filtersList = filters.composeList(syntax, profile, data[1]);
			filters.apply(outputTree, filtersList, profile);
			return utils.replaceVariables(outputTree.toString());
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