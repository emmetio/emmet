/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */ 
var zen_settings_parser = (function(){
	/**
	 * Trim whitespace from string
	 * @param {String} text
	 * @return {String}
	 */
	function trim(text) {
		return (text || "").replace( /^\s+|\s+$/g, "" );
	}
	
	var TYPE_ABBREVIATION = 'zen-tag',
		TYPE_EXPANDO = 'zen-expando',
	
		/** Reference to another abbreviation or tag */
		TYPE_REFERENCE = 'zen-reference';
	
	/**
	 * Unified object for parsed data
	 */
	function entry(type, key, value) {
		return {
			type: type,
			key: key,
			value: value
		};
	}
	
	/** Regular expression for XML tag matching */
	var re_tag = /^<([\w\-]+(?:\:[\w\-]+)?)((?:\s+[\w\-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
		
		re_attrs = /([\w\-]+)\s*=\s*(['"])(.*?)\2/g;
	
	/**
	 * Make expando from string
	 * @param {String} key
	 * @param {String} value
	 * @return {Object}
	 */
	function makeExpando(key, value) {
		if (key.substr(-1) == '+') 
			key = key.substring(0, key.length - 2);	
		
		return entry(TYPE_EXPANDO, key, value);
	}
	
	/**
	 * Make abbreviation from string
	 * @param {String} key Abbreviation key
	 * @param {String} tag_name Expanded element's tag name
	 * @param {String} attrs Expanded element's attributes
	 * @param {Boolean} is_empty Is expanded element empty or not
	 * @return {Object}
	 */
	function makeAbbreviation(key, tag_name, attrs, is_empty) {
		var result = {
			name: tag_name,
			is_empty: Boolean(is_empty)
		};
		
		if (attrs) {
			var m;
			result.attributes = [];
			while (m = re_attrs.exec(attrs)) {
				result.attributes.push({
					name: m[1],
					value: m[3]
				});
			}
		}
		
		return entry(TYPE_ABBREVIATION, key, result);
	}
	
	return {
		/**
		 * Parses key/value pair of user's settings
		 * @param {String} key
		 * @param {String} value
		 */
		parseAbbreviation: function(key, value) {
			key = trim(key);
			if (key.substr(-1) == '+') {
				// this is expando, leave 'value' as is
				return makeExpando(key, value);
			} else {
				var m = re_tag.exec(value);
				if (m) 
					return makeAbbreviation(key, m[1], m[2], m[3] == '/');
			}
			
			// assume it's reference
			return entry(TYPE_REFERENCE, key, value);
		},
		
		TYPE_ABBREVIATION: TYPE_ABBREVIATION,
		TYPE_EXPANDO: TYPE_EXPANDO,
		
		/** Reference to another abbreviation or tag */
		TYPE_REFERENCE: TYPE_REFERENCE
	}
})();