/**
 * Module adds support for generators: a regexp-based abbreviation resolver 
 * that can produce custom output.
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.exec(function(require, _) {
	var generators = [];
	var resources = require('resources');
	
	_.extend(resources, {
		addGenerator: function(regexp, fn) {
			if (_.isString(regexp))
				regexp = new RegExp(regexp);
			
			generators.unshift({
				re: regexp,
				fn: fn
			});
		}
	});
	
	resources.addResolver(function(node, syntax) {
		var result = null;
		for (var i = 0, il = generators.length; i < il; i++) {
			var item = generators[i], m;
			if ((m = item.re.exec(node.name))) {
				result = item.fn(m, node, syntax);
				if (result !== null) {
					return result;
				}
			}
		}
		
		return result;
	});
});