/**
 * Resolver for fast CSS typing. Handles abbreviations with the following 
 * notation:<br>
 * 
 * <code>(-vendor prefix)?property(value)*(!)?</code>
 * 
 * <br><br>
 * <b>Abbreviation handling</b><br>
 * 
 * By default, Zen Coding search for snippet definition for provided abbreviation.
 * If snippet wasn't found, Zen Coding automatically generates tag with 
 * abbreviation's name. For example, <code>foo</code> abbreviation will generate
 * <code>&lt;foo&gt;&lt;/foo&gt;</code> output.
 * <br><br>
 * This module will capture all expanded properties and upgrade them with values, 
 * vendor prefixes and !important declarations. All unmatched abbreviations will 
 * be automatically transformed into <code>property-name: ${1}</code> snippets. 
 * 
 * <b>Vendor prefixes<b><br>
 * 
 * If CSS-property is preceded with dash, resolver should output property with
 * all <i>known</i> vendor prefixes. For example, if <code>brad</code> 
 * abbreviation generates <code>border-radius: ${value};</code> snippet,
 * the <code>-brad</code> abbreviation should generate:
 * <pre><code>
 * -webkit-border-radius: ${value};
 * -moz-border-radius: ${value};
 * border-radius: ${value};
 * </code></pre>
 * Note that <i>o</i> and <i>ms</i> prefixes are omitted since Opera and IE 
 * supports unprefixed property.<br><br>
 * 
 * Users can also provide an explicit list of one-character prefixes for any
 * CSS property. For example, <code>-wm-float</code> will produce
 * 
 * <pre><code>
 * -webkit-float: ${1};
 * -moz-float: ${1};
 * float: ${1};
 * </code></pre>
 * 
 * Although this example looks pointless, users can use this feature to write
 * cutting-edge properties implemented by browser vendors recently.  
 * 
 * @constructor
 * @memberOf __cssResolverDefine
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.define('cssResolver', function(require, _) {
	var prefixObj = {
		/** Real vendor prefix name */
		prefix: 'zen',
		
		/** 
		 * Indicates this prefix is obsolete and should't be used when user 
		 * wants to generate all-prefixed properties
		 */
		obsolete: false,
		
		/**
		 * Returns prefixed CSS property name
		 * @param {String} name Unprefixed CSS property
		 */
		transformName: function(name) {
			return '-' + this.prefix + '-' + name;
		},
		
		/**
		 * @type {Array} List of unprefixed CSS properties that supported by 
		 * current prefix. This list is used to generate all-prefixed property 
		 */
		supports: null
	};
	
	
	/** 
	 * List of registered one-character prefixes. Key is a one-character prefix, 
	 * value is an <code>prefixObj</code> object
	 */
	var vendorPrefixes = {};
	
	var unitAliases = {
		'p': '%',
		'e': 'em',
		'x': 'ex'
	};
	
	var defaultValue = '${1};';
	
	// XXX module preferences
	var prefs = require('preferences');
	prefs.define('css.valueSeparator', ': ',
			'Defines a symbol that should be placed between CSS property and ' 
			+ 'value when expanding CSS abbreviations.');
	
	var descTemplate = _.template('A comma-separated list of CSS properties that may have ' 
		+ '<code><%= vendor %></code> vendor prefix. This list is used to generate '
		+ 'a list of prefixed properties when expanding <code>-property</code> '
		+ 'abbreviations. Empty list means that all possible CSS values may ' 
		+ 'have <code><%= vendor %></code> prefix.');
	
	prefs.define('css.webkitProperties', '', descTemplate({vendor: 'webkit'}));
	prefs.define('css.mozProperties', '', descTemplate({vendor: 'moz'}));
	prefs.define('css.msProperties', '', descTemplate({vendor: 'ms'}));
	prefs.define('css.oProperties', '', descTemplate({vendor: 'o'}));
	prefs.define('css.unitlessProperties', 'z-index, line-height', 
			'The list of properties whose values ​​must not contain units.');
	
	function isNumeric(ch) {
		var code = ch && ch.charCodeAt(0);
		return (ch && ch == '.' || (code > 47 && code < 58));
	}
	
	/**
	 * Check if provided snippet contains only one CSS property and value.
	 * @param {String} snippet
	 * @returns {Boolean}
	 */
	function isSingleProperty(snippet) {
		var utils = require('utils');
		snippet = utils.trim(snippet);
		
		// check if it doesn't contain a comment
		if (~snippet.indexOf('/*'))
			return false;
		
		snippet = require('tabStops').processText(snippet, {
			replaceCarets: true,
			tabstop: function() {
				return 'value';
			}
		});
		
		return snippet.split(':').length == 2;
	}
	
	/**
	 * Split snippet into a CSS property-value pair
	 * @param {String} snippet
	 */
	function splitSnippet(snippet) {
		var utils = require('utils');
		snippet = utils.trim(snippet);
		if (snippet.indexOf(':') == -1) {
			return {
				name: snippet,
				value: defaultValue
			};
		}
		
		var pair = snippet.split(':', 2);
		return {
			name: utils.trim(pair[0]),
			value: utils.trim(pair[1])
		};
	}
	
	/**
	 * Search for a list of supported prefixes for CSS property. This list
	 * is used to generate all-prefixed snippet
	 * @param {String} property CSS property name
	 * @returns {Array}
	 */
	function findPrefixes(property) {
		var result = [];
		_.each(vendorPrefixes, function(obj, prefix) {
			if (obj.supports && _.include(obj.supports, property)) {
				result.push(prefix);
			}
		});
		
		if (!result.length) {
			// add all non-obsolete prefixes
			_.each(vendorPrefixes, function(obj, prefix) {
				if (!obj.obsolete)
					result.push(prefix);
			});
		}
		
		return result;
	}
	
	function addPrefix(name, obj) {
		if (_.isString(obj))
			obj = {prefix: obj};
		
		vendorPrefixes[name] = _.extend({}, prefixObj, obj);
	}
	
	/**
	 * Transforms snippet value if required. For example, this transformation
	 * may add <i>!important</i> declaration to CSS property
	 * @param {String} snippet
	 * @param {Boolean} isImportant
	 * @returns {String}
	 */
	function transformSnippet(snippet, isImportant) {
		if (!_.isString(snippet))
			snippet = snippet.data;
		
		if (!isSingleProperty(snippet))
			return snippet;
		
		if (isImportant) {
			if (~snippet.indexOf(';')) {
				snippet = snippet.split(';').join(' !important;');
			} else {
				snippet += ' !important';
			}
		}
		
		// format value separator
		var ix = snippet.indexOf(':');
		snippet = snippet.substring(0, ix).replace(/\s+$/, '') 
			+ prefs.get('css.valueSeparator')
			+ require('utils').trim(snippet.substring(ix + 1));
		
		return snippet;
	}
	
	/**
	 * Helper function that parses comma-separated list of elements into array
	 * @param {String} list
	 * @returns {Array}
	 */
	function parseList(list) {
		var result = _.map((list || '').split(','), require('utils').trim);
		return result.length ? result : null;
	}
	
	addPrefix('w', {
		prefix: 'webkit',
		supports: prefs.getArray('css.webkitProperties')
	});
	addPrefix('m', {
		prefix: 'moz',
		supports: prefs.getArray('css.mozProperties')
	});
	addPrefix('s', {
		prefix: 'ms',
		supports: prefs.getArray('css.msProperties')
	});
	addPrefix('o', {
		prefix: 'o',
		supports: prefs.getArray('css.oProperties')
	});
	
	var unitlessProps = prefs.getArray('css.unitlessProperties');
	var floatUnit = 'em';
	var intUnit = 'px';
	
	// I think nobody uses it
//	addPrefix('k', {
//		prefix: 'khtml',
//		obsolete: true
//	});
	
	/**
	 * XXX register resolver
	 * @param {TreeNode} node
	 * @param {String} syntax
	 */
	require('resources').addResolver(function(node, syntax) {
		if (syntax == 'css' && node.isElement()) {
			return require('cssResolver').expandToSnippet(node.abbreviation);
		}
		
		return null;
	});
	
	return {
		/**
		 * Adds vendor prefix
		 * @param {String} name One-character prefix name
		 * @param {Object} obj Object describing vendor prefix
		 * @memberOf cssResolver
		 */
		addPrefix: addPrefix,
		
		/**
		 * Returns object describing vendor prefix
		 * @param {String} name
		 * @returns {Object}
		 */
		getPrefix: function(name) {
			return vendorPrefixes[name];
		},
		
		/**
		 * Removes prefix object
		 * @param {String} name
		 */
		removePrefix: function(name) {
			if (name in vendorPrefixes)
				delete vendorPrefixes[name];
		},
		
		/**
		 * Adds CSS unit shorthand and its full value
		 * @param {String} alias
		 * @param {String} value
		 */
		addUnitAlias: function(alias, value) {
			unitAliases[alias] = value;
		},
		
		/**
		 * Get unit name for alias
		 * @param {String} alias
		 * @returns {String}
		 */
		getUnitAlias: function(alias) {
			return unitAliases[alias];
		},
		
		/**
		 * Removes unit alias
		 * @param {String} alias
		 */
		removeUnitAlias: function(alias) {
			if (alias in unitAliases)
				delete unitAliases[alias];
		},
		
		/**
		 * Extract vendor prefixes from abbreviation
		 * @param {String} abbr
		 * @returns {Object} Object containing array of prefixes and clean 
		 * abbreviation name
		 */
		extractPrefixes: function(abbr) {
			if (abbr.charAt(0) != '-') {
				return {
					property: abbr,
					prefixes: null
				};
			}
			
			// abbreviation may either contain sequence of one-character prefixes
			// or just dash, meaning that user wants to produce all possible
			// prefixed properties
			var i = 1, il = abbr.length, ch;
			var prefixes = [];
			
			while (i < il) {
				ch = abbr.charAt(i);
				if (ch == '-') {
					// end-sequence character found, stop searching
					i++;
					break;
				}
				
				if (ch in vendorPrefixes) {
					prefixes.push(ch);
				} else {
					// no prefix found, meaning user want to produce all
					// vendor-prefixed properties
					prefixes.length = 0;
					i = 1;
					break;
				}
				
				i++;
			}
			
			// reached end of abbreviation and no property name left
			if (i == il -1) {
				i = 1;
				prefixes.length = 1;
			}
			
			return {
				property: abbr.substring(i),
				prefixes: prefixes.length ? prefixes : 'all'
			};
		},
		
		/**
		 * Search for value substring in abbreviation
		 * @param {String} abbr
		 * @returns {String} Value substring
		 */
		findValuesInAbbreviation: function(abbr) {
			var i = 0, il = abbr.length, ch;
			
			while (i < il) {
				ch = abbr.charAt(i);
				if (isNumeric(ch) || (ch == '-' && isNumeric(abbr.charAt(i + 1)))) {
					return abbr.substring(i);
				}
				
				i++;
			}
			
			return '';
		},
		
		/**
		 * Parses values defined in abbreviations
		 * @param {String} abbrValues Values part of abbreviations (can be 
		 * extracted with <code>findValuesInAbbreviation</code>)
		 * @returns {Array}
		 */
		parseValues: function(abbrValues) {
			var valueStack = '';
			var values = [];
			var i = 0, il = abbrValues.length, ch, nextCh;
			
			while (i < il) {
				ch = abbrValues.charAt(i);
				if (ch == '-' && valueStack) {
					// next value found
					values.push(valueStack);
					valueStack = '';
					i++;
					continue;
				}
				
				valueStack += ch;
				i++;
				
				nextCh = abbrValues.charAt(i);
				if (ch != '-' && !isNumeric(ch) && (isNumeric(nextCh) || nextCh == '-')) {
					values.push(valueStack);
					valueStack = '';
				}
			}
			
			if (valueStack) {
				values.push(valueStack);
			}
			
			return values;
		},
		
		/**
		 * Extracts values from abbreviation
		 * @param {String} abbr
		 * @returns {Object} Object containing array of values and clean 
		 * abbreviation name
		 */
		extractValues: function(abbr) {
			// search for value start
			var abbrValues = this.findValuesInAbbreviation(abbr);
			if (!abbrValues) {
				return {
					property: abbr,
					values: null
				};
			}
			
			return {
				property: abbr.substring(0, abbr.length - abbrValues.length),
				values: this.parseValues(abbrValues)
			};
		},
		
		/**
		 * Normalizes value, defined in abbreviation.
		 * @param {String} value
		 * @param {String} property
		 * @returns {String}
		 */
		normalizeValue: function(value, property) {
			property = (property || '').toLowerCase();
			return value.replace(/^(\-?[0-9\.]+)([a-z]*)$/, function(str, val, unit) {
				if (!unit && (val == '0' || _.include(unitlessProps, property)))
					return val;
				
				if (!unit)
					return val + (~val.indexOf('.') ? floatUnit : intUnit);
				
				return val + (unit in unitAliases ? unitAliases[unit] : unit);
			});
		},
		
		/**
		 * Expands abbreviation into a snippet
		 * @param {String} abbr Abbreviation name to expand
		 * @param {String} value Abbreviation value
		 * @returns {Array} Array of CSS properties and values or predefined
		 * snippet (string or element)
		 */
		expand: function(abbr, value) {
			var resources = require('resources');
			
			// check if snippet should be transformed to !important
			var isImportant;
			if (isImportant = /^(.+)\!$/.test(abbr)) {
				abbr = RegExp.$1;
			}
			
			// check if we have abbreviated resource
			var snippet = resources.getSnippet('css', abbr);
			if (snippet)
				return transformSnippet(snippet, isImportant);
			
			// no abbreviated resource, parse abbreviation
			var prefixData = this.extractPrefixes(abbr);
			var valuesData = this.extractValues(prefixData.property);
			var abbrData = _.extend(prefixData, valuesData);
			
			snippet = resources.getSnippet('css', abbrData.property);
			
			if (!snippet) {
				snippet = abbrData.property + ':' + defaultValue;
			} else if (!_.isString(snippet)) {
				snippet = snippet.data;
			}
			
			if (!isSingleProperty(snippet)) {
				return snippet;
			}
			
			var snippetObj = splitSnippet(snippet);
			var result = [];
			if (!value && abbrData.values) {
				value = _.map(abbrData.values, function(val) {
					return this.normalizeValue(val, snippetObj.name);
				}, this).join(' ') + ';';
			}
			
			snippetObj.value = value || snippetObj.value;
			
			if (abbrData.prefixes) {
				var prefixes = abbrData.prefixes == 'all' 
					? findPrefixes(snippetObj.name)
					: abbrData.prefixes;
					
				_.each(prefixes, function(p) {
					if (p in vendorPrefixes) {
						result.push(transformSnippet(
							vendorPrefixes[p].transformName(snippetObj.name) 
							+ ':' + snippetObj.value,
							isImportant));
						
					}
				});
			}
			
			// put the original property
			result.push(transformSnippet(snippetObj.name + ':' + snippetObj.value, isImportant));
			
			return result;
		},
		
		/**
		 * Same as <code>expand</code> method but transforms output into a 
		 * Zen Coding snippet
		 * @param {String} abbr
		 * @param {String} value
		 * @returns {String}
		 */
		expandToSnippet: function(abbr, value) {
			var snippet = this.expand(abbr, value);
			if (_.isArray(snippet)) {
				return snippet.join('\n');
			}
			
			if (!_.isString(snippet))
				return snippet.data;
			
			return String(snippet);
		}
	};
});

