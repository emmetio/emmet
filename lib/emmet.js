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
	var actions = require('./action/main');
	var parser = require('./parser/abbreviation');
	var filters = require('./filter/main');
	var tabStops = require('./assets/tabStops');
	
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
			
			syntax = syntax || utils.defaultSyntax();
			profile = profile || utils.defaultProfile();

			tabStops.resetTabstopIndex();

			var filtersData = filters.extract(abbr);
			var filtersList = filters.composeList(syntax, profile, data[1]);
			var tree = parser.parse(filtersData[0], {
				syntax: syntax, 
				profile: profile, 
				contextNode: contextNode
			});

			filters.apply(tree, filtersList, profile);
			return tree.valueOf();
		},

		/**
		 * Runs given action
		 * @param  {String} name Action name
		 * @param  {IEmmetEditor} editor Editor instance
		 * @return {Boolean} Returns true if action was performed successfully
		 */
		run: function(name) {
			return actions.run.apply(actions, _.toArray(arguments));
		}
	};
});