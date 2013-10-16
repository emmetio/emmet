if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
} else {
	requirejs.config({
		paths: {
			'lodash': '../bower_components/lodash/dist/lodash'
		}
	});
}

define(function(require, exports, module) {
	var defaultSyntax = 'html';
	var defaultProfile = 'plain';
	var global = typeof self != 'undefined' ? self : this;

	var _ = require('lodash');
	var range = require('./assets/range');
	var utils = require('./utils/common');
	
	console.log('Range: ', range.create(1, 2));
	return {
		/**
		 * Helper method that just executes passed function but with all 
		 * important arguments like 'require' and '_'
		 * @deprecated Use RequireJS modules to access Emmet modules
		 * @param {Function} fn
		 * @param {Object} context Execution context
		 */
		exec: function(fn, context) {
			return fn.call(context || global, require, _, this);
		},

		/**
		 * The essential function that expands Emmet abbreviation
		 * @param {String} abbr Abbreviation to parse
		 * @param {String} syntax Abbreviation's context syntax
		 * @param {String} profile Output profile (or its name)
		 * @param {Object} contextNode Contextual node where abbreviation is
		 * written
		 * @return {String}
		 */
		expandAbbreviation: function(abbr, syntax, profile, contextNode) {
			if (!abbr) return '';
			
			syntax = syntax || defaultSyntax;
			
			var filters = r('filters');
			var parser = r('abbreviationParser');
			
			profile = r('profile').get(profile, syntax);
			r('tabStops').resetTabstopIndex();
			
			var data = filters.extractFromAbbreviation(abbr);
			var outputTree = parser.parse(data[0], {
				syntax: syntax, 
				contextNode: contextNode
			});
			
			var filtersList = filters.composeList(syntax, profile, data[1]);
			filters.apply(outputTree, filtersList, profile);
			return outputTree.valueOf();
		},

		/**
		 * Returns default syntax name used in abbreviation engine
		 * @returns {String}
		 */
		defaultSyntax: function() {
			return defaultSyntax;
		},
		
		/**
		 * Returns default profile name used in abbreviation engine
		 * @returns {String}
		 */
		defaultProfile: function() {
			return defaultProfile;
		},
		
		/**
		 * Log message into console if it exists
		 */
		log: function() {
			if (global.console && global.console.log)
				global.console.log.apply(global.console, arguments);
		}
	};
});