/**
 * Parsed resources (snippets, abbreviations, variables, etc.) for Zen Coding.
 * Contains convenient method to get access for snippets with respect of 
 * inheritance. Also provides abilitity to store data in different vocabularies
 * ('system' and 'user') for fast and safe resurce update
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */var zen_resources = (function(){
	var TYPE_ABBREVIATION = 'zen-tag',
		TYPE_EXPANDO = 'zen-expando',
	
		/** Reference to another abbreviation or tag */
		TYPE_REFERENCE = 'zen-reference',
		
		VOC_SYSTEM = 'system',
		VOC_USER = 'user',
		
		/** Regular expression for XML tag matching */
		re_tag = /^<(\w+\:?[\w\-]*)((?:\s+[\w\:\-]+\s*=\s*(['"]).*?\3)*)\s*(\/?)>/,
		re_attrs = /([\w\-]+)\s*=\s*(['"])(.*?)\2/g
		
		system_settings = {},
		user_settings = {},
		
		user_variables = {};
		
	/**
	 * Trim whitespace from string
	 * @param {String} text
	 * @return {String}
	 */
	function trim(text) {
		return (text || "").replace( /^\s+|\s+$/g, "" );
	}
		
	/**
	 * Check if specified resource is parsed by Zen Coding
	 * @param {Object} obj
	 * @return {Boolean}
	 */
	function isParsed(obj) {
		return obj && obj.__zen_parsed__;
	}
	
	/**
	 * Marks object as parsed by Zen Coding
	 * @param {Object}
	 */
	function setParsed(obj) {
		obj.__zen_parsed__ = true;
	}
	
	/**
	 * Returns resource vocabulary by its name
	 * @param {String} name Vocabulary name ('system' or 'user')
	 */
	function getVocabulary(name) {
		return name == VOC_SYSTEM ? system_settings : user_settings;
	}
		
	/**
	 * Helper function that transforms string into hash
	 * @return {Object}
	 */
	function stringToHash(str){
		var obj = {}, items = str.split(",");
		for ( var i = 0; i < items.length; i++ )
			obj[ items[i] ] = true;
		return obj;
	}
	
	/**
	 * Creates resource inheritance chain for lookups
	 * @param {String} vocabulary Resource vocabulary
	 * @param {String} syntax Syntax name
	 * @param {String} name Resource name
	 * @return {Array}
	 */
	function createResourceChain(vocabulary, syntax, name) {
		var voc = getVocabulary(vocabulary),
			result = [],
			resource;
		
		if (voc && syntax in voc) {
			resource = voc[syntax];
			if (name in resource)
				result.push(resource[name]);
		}
		
		// get inheritance definition
		// in case of user-defined vocabulary, resource dependency
		// may be defined in system vocabulary only, so we have to correctly
		// handle this case
		var chain_source;
		if (resource && 'extends' in resource)
			chain_source = resource;
		else if (vocabulary == VOC_USER && syntax in system_settings 
			&& 'extends' in system_settings[syntax] )
			chain_source = system_settings[syntax];
			
		if (chain_source) {
			if (!isParsed(chain_source['extends'])) {
				var ar = chain_source['extends'].split(',');
				for (var i = 0; i < ar.length; i++) 
					ar[i] = trim(ar[i]);
				chain_source['extends'] = ar;
				setParsed(chain_source['extends']);
			}
			
			// find resource in ancestors
			for (var i = 0; i < chain_source['extends'].length; i++) {
				var type = chain_source['extends'][i];
				if (voc[type] && voc[type][name])
					result.push(voc[type][name]);
			}
		}
		
		return result;
	}
	
	/**
	 * Get resource collection from settings vocbulary for specified syntax. 
	 * It follows inheritance chain if resource wasn't directly found in
	 * syntax settings
	 * @param {String} vocabulary Resource vocabulary
	 * @param {String} syntax Syntax name
	 * @param {String} name Resource name
	 */
	function getSubset(vocabulary, syntax, name) {
		var chain = createResourceChain(vocabulary, syntax, name);
		return chain[0];
	}
	
	/**
	 * Returns parsed item located in specified vocabulary by its syntax and
	 * name
	 * @param {String} vocabulary Resource vocabulary
	 * @param {String} syntax Syntax name
	 * @param {String} name Resource name ('abbreviation', 'snippet')
	 * @param {String} item Abbreviationor snippet name
	 * @return {Object|null}
	 */
	function getParsedItem(vocabulary, syntax, name, item) {
		var chain = createResourceChain(vocabulary, syntax, name),
			result = null,
			res;
			
		for (var i = 0, il = chain.length; i < il; i++) {
			res = chain[i];
			if (item in res) {
				if (name == 'abbreviations' && !isParsed(res[item])) {
					// parse abbreviation
					var value = res[item];
					res[item] = parseAbbreviation(item, value);
					res[item].__ref = value;
					setParsed(res[item]);
				}
				
				result = res[item];
				break;
			}
		}
		
		return result;
	}
	
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
	
	/**
	 * Make expando from string
	 * @param {String} key
	 * @param {String} value
	 * @return {Object}
	 */
	function makeExpando(key, value) {
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
			is_empty: !!is_empty
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
	
	/**
	 * Parses single abbreviation
	 * @param {String} key Abbreviation name
	 * @param {String} value = Abbreviation value
	 * @return {Object}
	 */
	function parseAbbreviation(key, value) {
		key = trim(key);
		var m;
		if (key.substr(-1) == '+') {
			// this is expando, leave 'value' as is
			return makeExpando(key, value);
		} else if (m = re_tag.exec(value)) {
			return makeAbbreviation(key, m[1], m[2], m[4] == '/');
		} else {
			// assume it's reference to another abbreviation
			return entry(TYPE_REFERENCE, key, value);
		}
	}
	
	return {
		/**
		 * Sets new unparsed data for specified settings vocabulary
		 * @param {Object} data
		 * @param {String} type Vocabulary type ('system' or 'user')
		 */
		setVocabulary: function(data, type) {
			if (type == VOC_SYSTEM)
				system_settings = data;
			else
				user_settings = data;
		},
		
		/**
		 * Get data from specified vocabulary. Can contain parsed entities
		 * @param {String} name Vocabulary type ('system' or 'user')
		 * @return {Object}
		 */
		getVocabulary: getVocabulary,
		
		/**
		 * Returns resource value from data set with respect of inheritance
		 * @param {String} syntax Resource syntax (html, css, ...)
		 * @param {String} name Resource name ('snippets' or 'abbreviation')
		 * @param {String} abbr Abbreviation name
		 * @return {Object|null}
		 */
		getResource: function(syntax, name, item) {
			return getParsedItem(VOC_USER, syntax, name, item) 
				|| getParsedItem(VOC_SYSTEM, syntax, name, item);
		},
		
		/**
		 * Returns abbreviation value from data set
		 * @param {String} type Resource type (html, css, ...)
		 * @param {String} name Abbreviation name
		 * @return {Object|null}
		 */
		getAbbreviation: function(type, name) {
			return this.getResource(type, 'abbreviations', name) 
				|| this.getResource(type, 'abbreviations', name.replace(/\-/g, ':'));
		},
		
		/**
		 * Returns snippet value from data set
		 * @param {String} type Resource type (html, css, ...)
		 * @param {String} name Snippet name
		 * @return {Object|null}
		 */
		getSnippet: function(type, name) {
			return this.getResource(type, 'snippets', name)
				|| this.getResource(type, 'snippets', name.replace(/\-/g, ':'));
		},
		
		/**
		 * Returns variable value
		 * @return {String}
		 */
		getVariable: function(name) {
			return getSubset(VOC_USER, 'variables', name) 
				|| getSubset(VOC_SYSTEM, 'variables', name);
		},
		
		/**
		 * Returns resource subset from settings vocabulary
		 * @param {String} syntax Syntax name
		 * @param {String} name Resource name
		 * @return {Object}
		 */
		getSubset: function(syntax, name) {
			return getSubset(VOC_USER, syntax, name) 
				|| getSubset(VOC_SYSTEM, syntax, name);
		},
		
		/**
		 * Returns specified elements collection (like 'empty', 'block_level') from
		 * <code>resource</code>. If collections wasn't found, returns empty object
		 * @param {Object} resource
		 * @param {String} type
		 * @return {Object}
		 */
		getElementsCollection: function(resource, type) {
			if (resource && resource.element_types) {
				// if it's not parsed yet – do it
				var res = resource.element_types;
				if (!isParsed(res)) {
					for (var p in res) 
						res[p] = stringToHash(res[p]);
						
					setParsed(res);
				}
				return res[type] || {}
			}
			else
				return {};
		}
	}
})();

try {
	zen_resources.setVocabulary(zen_settings, 'system');
	zen_resources.setVocabulary(my_zen_settings, 'user');
} catch(e) {}