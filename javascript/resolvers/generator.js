/**
 * Module adds support for generators: a regexp-based abbreviation resolver 
 * that can produce custom output.
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	/** @type HandlerList */
	var generators = require('handlerList').create();
	var resources = require('resources');
	
	_.extend(resources, {
		/**
		 * Add generator. A generator function <code>fn</code> will be called 
		 * only if current abbreviation matches <code>regexp</code> regular 
		 * expression and this function should return <code>null</code> if
		 * abbreviation cannot be resolved
		 * @param {RegExp} regexp Regular expression for abbreviation element name
		 * @param {Function} fn Resolver function
		 * @param {Object} options Options list as described in 
		 * {@link HandlerList#add()} method
		 */
		addGenerator: function(regexp, fn, options) {
			if (_.isString(regexp))
				regexp = new RegExp(regexp);
			
			generators.add(function(node, syntax) {
				var m;
				if ((m = regexp.exec(node.name()))) {
					return fn(m, node, syntax);
				}
				
				return null;
			}, options);
		}
	});
	
	resources.addResolver(function() {
		return generators.exec(null, _.toArray(arguments));
	});
});