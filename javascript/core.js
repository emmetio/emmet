/**
 * Core Zen Coding object, available in global scope
 */
(function(global, _) {
	var defaultSyntax = 'html';
	var defaultProfile = 'plain';
	
	/** List of registered modules */
	var modules = {
		_: _
	};
	
	/**
	 * Shared empty constructor function to aid in prototype-chain creation.
	 */
	var ctor = function(){};
	
	/**
	 * Helper function to correctly set up the prototype chain, for subclasses.
	 * Similar to `goog.inherits`, but uses a hash of prototype properties and
	 * class properties to be extended.
	 * Took it from Backbone.
	 * @param {Object} parent
	 * @param {Object} protoProps
	 * @param {Object} staticProps
	 * @returns {Object}
	 */
	function inherits(parent, protoProps, staticProps) {
		var child;

		// The constructor function for the new subclass is either defined by
		// you (the "constructor" property in your `extend` definition), or
		// defaulted by us to simply call the parent's constructor.
		if (protoProps && protoProps.hasOwnProperty('constructor')) {
			child = protoProps.constructor;
		} else {
			child = function() {
				parent.apply(this, arguments);
			};
		}

		// Inherit class (static) properties from parent.
		_.extend(child, parent);

		// Set the prototype chain to inherit from `parent`, without calling
		// `parent`'s constructor function.
		ctor.prototype = parent.prototype;
		child.prototype = new ctor();

		// Add prototype properties (instance properties) to the subclass,
		// if supplied.
		if (protoProps)
			_.extend(child.prototype, protoProps);

		// Add static properties to the constructor function, if supplied.
		if (staticProps)
			_.extend(child, staticProps);

		// Correctly set child's `prototype.constructor`.
		child.prototype.constructor = child;

		// Set a convenience property in case the parent's prototype is needed
		// later.
		child.__super__ = parent.prototype;

		return child;
	};
	
	/**
	 * @type Function Function that loads module definition if it's not defined
	 */
	var moduleLoader = null;
	
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
				modules[name] = _.isFunction(factory) 
					? this.exec(factory)
					: factory;
			}
		},
		
		/**
		 * Returns reference to Zen Coding module
		 * @param {String} name Module name
		 */
		require: function(name) {
			if (!(name in modules) && moduleLoader)
				moduleLoader(name);
			
			return modules[name];
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
		 * The self-propagating extend function for classes.
		 * Took it from Backbone 
		 * @param {Object} protoProps
		 * @param {Object} classProps
		 * @returns {Object}
		 */
		extend: function(protoProps, classProps) {
			var child = inherits(this, protoProps, classProps);
			child.extend = this.extend;
			return child;
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
			
			syntax = syntax || defaultSyntax;
			profile = profile || defaultProfile;
			
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
		},
		
		/**
		 * Setups function that should synchronously load undefined modules
		 * @param {Function} fn
		 */
		setModuleLoader: function(fn) {
			moduleLoader = fn;
		}
	};
})(this, _);