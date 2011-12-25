/**
 * Factories for default Zen Coding element types: abbreviation, snippet, 
 * reference
 * @memberOf __zenCodingDataType
 * @constructor
 */
(function() {
	var reAttrs = /([\w\-]+)\s*=\s*(['"])(.*?)\2/g;
	
	_.extend(zen_coding, {
		/**
		 * It's a garbage, just for JSDT code completion
		 * @memberOf zen_coding
		 */
		__id: 1,
		dataType: {
			/** @memberOf zen_coding.dataType */
			ELEMENT: 1,
			SNIPPET: 2,
			REFERENCE: 3,
			EXPANDO: 4,
			
			/**
			 * Element factory
			 * @param {String} elementName Name of output element
			 * @param {String} attrs Attributes definition. You may also pass
			 * <code>Array</code> where each contains object with <code>name</code> 
			 * and <code>value</code> properties, or <code>Object</code>
			 * @param {Boolean} isEmpty Is expanded element should be empty
			 */
			element: function(elementName, attrs, isEmpty) {
				var result = {
					type: this.ELEMENT,
					name: elementName,
					is_empty: !!isEmpty
				};
				
				if (attrs) {
					result.attributes = [];
					if (_.isArray(attrs)) {
						result.attributes = attrs;
					} else if (_.isString(attrs)) {
						var m;
						while (m = reAttrs.exec(attrs)) {
							result.attributes.push({
								name: m[1],
								value: m[3]
							});
						}
					} else {
						_.each(attrs, function(value, name) {
							result.attributes.push({
								name: name, 
								value: value
							});
						});
					}
				}
				
				return result;
			},
			
			/**
			 * Snippet factory
			 * @param {String} value Snippet value
			 */
			snippet: function(value) {
				return  {
					type: this.SNIPPET,
					data: value
				};
			},
			
			/**
			 * Expando (string containing abbreviation) factory
			 * @param {String} value
			 */
			expando: function(value) {
				return {
					type: this.EXPANDO,
					data: value
				};
			},
			
			/**
			 * Reference to another item (element or snippet) factory
			 * @param {String} value
			 */
			reference: function(value) {
				return  {
					type: this.REFERENCE,
					data: value
				};
			}
		}
	});
}());