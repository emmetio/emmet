/**
 * Module adds support for generators: a regexp-based abbreviation resolver 
 * that can produce custom output.
 */
(function() {
	var generators = [];
	
	_.extend(zen_coding, {
		addGenerator: function(regexp, fn) {
			if (_.isString(regexp))
				regexp = new RegExp(regexp);
			
			generators.unshift({
				re: regexp,
				fn: fn
			});
		}
	});
	
	zen_coding.require('resources').addResolver(function(node, syntax) {
		var result = null;
		var elements = zen_coding.require('elements');
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
}());