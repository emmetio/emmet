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
				this[name] = factory(_.bind(this.require, this), _, this);
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
		 * Log message into console if it exists
		 */
		log: function() {
			if (global.console && global.console.log)
				global.console.log.apply(global.console, arguments);
		}
	};
	
	
})(this);