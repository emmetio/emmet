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
	
	zen_resources.addResolver(function(abbr, node, syntax) {
		var result = null;
		for (var i = 0, il = generators.length; i < il; i++) {
			var item = generators[i], m;
			if ((m = item.re.exec(abbr))) {
				result = item.fn(m, abbr, node, syntax);
				if (result !== null) {
					return _.isString(result) ? zen_coding.dataType.snippet(result) : result;
				}
			}
		}
		
		return result;
	});
}());