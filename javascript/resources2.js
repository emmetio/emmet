/**
 * Parsed resources (snippets, abbreviations, variables, etc.) for Zen Coding.
 * Contains convenient method to get access for snippets with respect of 
 * inheritance. Also provides ability to store data in different vocabularies
 * ('system' and 'user') for fast and safe resource update
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * XXX This module is over-complicated, should provide better implementation
 * 
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.define('resources', function(require, _) {
	var VOC_SYSTEM = 'system';
	var VOC_USER = 'user';
		
	/** Regular expression for XML tag matching */
	var reTag = /^<(\w+\:?[\w\-]*)((?:\s+[\w\:\-]+\s*=\s*(['"]).*?\3)*)\s*(\/?)>/;
		
	var systemSettings = {};
	var userSettings = {};
	
	/** @type HandlerList List of registered abbreviation resolvers */
	var resolvers = require('handlerList').create();
	
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
		return name == VOC_SYSTEM ? systemSettings : userSettings;
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
			resource = null;
		
		if (voc && syntax in voc) {
			resource = voc[syntax];
			if (name in resource)
				result.push(resource[name]);
		}
		
		// get inheritance definition
		// in case of user-defined vocabulary, resource dependency
		// may be defined in system vocabulary only, so we have to correctly
		// handle this case
		var chain_source = null;
		if (resource && 'extends' in resource)
			chain_source = resource;
		else if (vocabulary == VOC_USER && syntax in systemSettings 
			&& 'extends' in systemSettings[syntax] )
			chain_source = systemSettings[syntax];
			
		if (chain_source) {
			if (!isParsed(chain_source['extends'])) {
				var ar = chain_source['extends'].split(',');
				var utils = require('utils');
				for (var i = 0; i < ar.length; i++) 
					ar[i] = utils.trim(ar[i]);
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
	 * @param {String} item Abbreviation or snippet name
	 * @return {Object}
	 */
	function getParsedItem(vocabulary, syntax, name, item) {
		var chain = createResourceChain(vocabulary, syntax, name);
		var result = null, res;
		var elements = require('elements');
		
		for (var i = 0, il = chain.length; i < il; i++) {
			res = chain[i];
			if (item in res) {
				if (!isParsed(res[item])) {
					switch(name) {
						case 'abbreviations':
							var value = res[item];
							res[item] = parseAbbreviation(item, value);
							res[item].__ref = value;
							break;
						case 'snippets':
							res[item] = elements.create('snippet', res[item]);
							break;
					}
					
					setParsed(res[item]);
				}
				
				result = res[item];
				break;
			}
		}
		
		return result;
	}
	
	/**
	 * Parses single abbreviation
	 * @param {String} key Abbreviation name
	 * @param {String} value Abbreviation value
	 * @return {Object}
	 */
	function parseAbbreviation(key, value) {
		key = require('utils').trim(key);
		var elements = require('elements');
		var m;
		if (m = reTag.exec(value)) {
			return elements.create('element', m[1], m[2], m[4] == '/');
		} else {
			// assume it's reference to another abbreviation
			return elements.create('reference', value);
		}
	}
	
	return {
		/**
		 * Sets new unparsed data for specified settings vocabulary
		 * @param {Object} data
		 * @param {String} type Vocabulary type ('system' or 'user')
		 * @memberOf zen_coding.resources
		 */
		setVocabulary: function(data, type) {
			if (type == VOC_SYSTEM)
				systemSettings = data;
			else
				userSettings = data;
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
		 * @param {String} item Resource item name
		 * @return {Object}
		 */
		getResource: function(syntax, name, item) {
			return getParsedItem(VOC_USER, syntax, name, item) 
				|| getParsedItem(VOC_SYSTEM, syntax, name, item);
		},
		
		/**
		 * Returns abbreviation value from data set
		 * @param {String} type Resource type (html, css, ...)
		 * @param {String} name Abbreviation name
		 * @return {Object}
		 */
		getAbbreviation: function(type, name) {
			name = name || '';
			return this.getResource(type, 'abbreviations', name) 
				|| this.getResource(type, 'abbreviations', name.replace(/\-/g, ':'));
		},
		
		/**
		 * Returns snippet value from data set
		 * @param {String} type Resource type (html, css, ...)
		 * @param {String} name Snippet name
		 * @return {Object}
		 */
		getSnippet: function(type, name) {
			name = name || '';
			return this.getResource(type, 'snippets', name)
				|| this.getResource(type, 'snippets', name.replace(/\-/g, ':'));
		},
		
		/**
		 * Returns resource (abbreviation, snippet, etc.) matched for passed 
		 * abbreviation
		 * @param {TreeNode} node
		 * @param {String} syntax
		 * @returns {Object}
		 */
		getMatchedResource: function(node, syntax) {
			return resolvers.exec(null, _.toArray(arguments)) 
				|| this.getAbbreviation(syntax, node.name()) 
				|| this.getSnippet(syntax, node.name());
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
		 * Store runtime variable in user storage
		 * @param {String} name Variable name
		 * @param {String} value Variable value
		 */
		setVariable: function(name, value){
			var voc = getVocabulary('user') || {};
			if (!('variables' in voc))
				voc.variables = {};
				
			voc.variables[name] = value;
			this.setVocabulary(voc, 'user');
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
		 * Check if there are resources for specified syntax
		 * @param {String} syntax
		 * @return {Boolean}
		 */
		hasSyntax: function(syntax) {
			return syntax in getVocabulary(VOC_USER) 
				|| syntax in getVocabulary(VOC_SYSTEM);
		},
		
		/**
		 * Registers new abbreviation resolver.
		 * @param {Function} fn Abbreviation resolver which will receive 
		 * abbreviation as first argument and should return parsed abbreviation
		 * object if abbreviation has handled successfully, <code>null</code>
		 * otherwise
		 * @param {Object} options Options list as described in 
		 * {@link HandlerList#add()} method
		 */
		addResolver: function(fn, options) {
			resolvers.add(fn, options);
		},
		
		removeResolver: function(fn) {
			resolvers.remove(fn);
		}
	};
});