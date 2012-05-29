/**
 * CSS EditTree is a module that can parse a CSS rule into a tree with 
 * convenient methods for adding, modifying and removing CSS properties. These 
 * changes can be written back to string with respect of code formatting.
 * 
 * @memberOf __cssEditTreeDefine
 * @constructor
 * @param {Function} require
 * @param {Underscore} _ 
 */
zen_coding.define('cssEditTree', function(require, _) {
	var defaultOptions = {
		styleBefore: '\n\t',
		styleSeparator: ': ',
		offset: 0
	};
	
	var WHITESPACE_REMOVE_FROM_START = 1;
	var WHITESPACE_REMOVE_FROM_END   = 2;
	
	/**
	 * Removes whitespace tokens from the array ends
	 * @param {Array} tokens
	 * @param {Number} mask Mask indicating from which end whitespace should be 
	 * removed 
	 * @returns {Array}
	 */
	function trimWhitespaceTokens(tokens, mask) {
		mask = mask || (WHITESPACE_REMOVE_FROM_START | WHITESPACE_REMOVE_FROM_END);
		var whitespace = ['white', 'line'];
		
		if ((mask & WHITESPACE_REMOVE_FROM_END) == WHITESPACE_REMOVE_FROM_END)
			while (tokens.length && _.include(whitespace, _.last(tokens).type)) {
				tokens.pop();
	 		}
		
		if ((mask & WHITESPACE_REMOVE_FROM_START) == WHITESPACE_REMOVE_FROM_START)
			while (tokens.length && _.include(whitespace, tokens[0].type)) {
				tokens.shift();
			}
		
		return tokens;
	}
	
	/**
	 * Helper function that searches for selector range for <code>CSSEditRule</code>
	 * @param {TokenIterator} it
	 * @returns {Range}
	 */
	function findSelectorRange(it) {
		var tokens = [], token;
 		var start = it.position(), end;
 		
 		while (token = it.next()) {
			if (token.type == '{')
				break;
			tokens.push(token);
		}
 		
 		trimWhitespaceTokens(tokens);
 		
 		if (tokens.length) {
 			start = tokens[0].start;
 			end = _.last(tokens).end;
 		} else {
 			end = start;
 		}
 		
 		return require('range').create(start, end - start);
	}
	
	/**
	 * Helper function that searches for CSS property value range next to
	 * iterator's current position  
	 * @param {TokenIterator} it
	 * @returns {Range}
	 */
	function findValueRange(it) {
		// find value start position
		var skipTokens = ['white', 'line', ':'];
		var tokens = [], token, start, end;
		
		it.nextUntil(function(tok) {
			return !_.include(skipTokens, this.itemNext().type);
		});
		
		start = it.current().end;
		// consume value
		while (token = it.next()) {
			if (token.type == '}' || token.type == ';') {
				// found value end
				trimWhitespaceTokens(tokens, WHITESPACE_REMOVE_FROM_START 
						| (token.type == '}' ? WHITESPACE_REMOVE_FROM_END : 0));
				
				if (tokens.length) {
					start = tokens[0].start;
					end = _.last(tokens).end;
				} else {
					end = start;
				}
				
				return require('range').create(start, end - start);
			}
			
			tokens.push(token);
		}
	}
	
	function createToken(start, value, type) {
		var obj = {
			start: start || 0,
			value: value || '',
			type: type
		};
		
		obj.end = obj.start + obj.value.length;
		return obj;
	}
	
	/**
	 * Returns range object
	 * @param {Number} start
	 * @param {Number} len 
	 * @returns {Range}
	 */
	function range(start, len) {
		return require('range').create(start, len);
	}
	
	/**
	 * Finds parts of complex CSS value
	 * @param {String} str
	 * @returns {Array} Returns list of <code>Range</code>'s
	 */
	function findParts(str) {
		/** @type StringStream */
		var stream = require('stringStream').create(str);
		var rangeModule = require('range');
		var ch;
		var result = [];
		var sep = /[\s\u00a0,]/;
		
		var add = function() {
			stream.next();
			result.push(rangeModule.create(stream.start, stream.current()));
			stream.start = stream.pos;
		};
		
		// skip whitespace
		stream.eatSpace();
		stream.start = stream.pos;
		
		while (ch = stream.next()) {
			if (ch == '"' || ch == "'") {
				stream.next();
				if (!stream.skipTo(ch)) break;
				add();
			} else if (ch == '(') {
				if (!stream.skipTo(')')) break;
				add();
			} else {
				if (sep.test(ch)) {
					result.push(rangeModule.create(stream.start, stream.current().length - 1));
					stream.eatWhile(sep);
					stream.start = stream.pos;
				}
			}
		}
		
		add();
		
		return _.chain(result)
			.filter(function(item) {
				return !!item.length();
			})
			.uniq(false, function(item) {
				return item.toString();
			})
			.value();
	}
	
	/**
	 * @type CSSEditRule
	 * @param {String} source
	 * @param {Object} options
	 */
	function CSSEditRule(source, options) {
		this.options = _.extend({}, defaultOptions, options);
		this.source = source;
		this._properties = [];
		
		/** @type TokenIterator */
 		var it = require('tokenIterator').create(
 				require('cssParser').parse(source));
 		
 		var selectorRange = findSelectorRange(it);
 		this._selectorPos = selectorRange.start;
 		this._selector = selectorRange.substring(source);
 		
 		if (!it.current() || it.current().type != '{')
 			throw 'Invalid CSS rule';
 		
 		this._contentStartPos = it.position() + 1;
 		
 		// consume properties
 		var propertyRange, valueRange, token;
		while (token = it.next()) {
			if (token.type == 'identifier') {
				propertyRange = range(token);
				valueRange = findValueRange(it);
				var end = (it.current() && it.current().type == ';') 
					? range(it.current())
					: range(it.position(), 0);
				this._properties.push(new CSSEditProperty(this,
						createToken(propertyRange.start, propertyRange.substring(source)),
						createToken(valueRange.start, valueRange.substring(source)),
						createToken(end.start, end.substring(source))
						));
			}
		}
		
		this._saveStyle();
	}
	
	CSSEditRule.prototype = {
		/**
		 * Remembers all styles of properties
		 * @private
		 */
		_saveStyle: function() {
			var start = this._contentStartPos;
			var source = this.source;
			
			_.each(this.list(), /** @param {CSSEditProperty} p */ function(p) {
				p.styleBefore = source.substring(start, p.namePosition());
				p.styleSeparator = source.substring(p.nameRange().end, p.valuePosition());
				
				// graceful and naive comments removal 
				p.styleBefore = _.last(p.styleBefore.split('*/'));
				p.styleSeparator = p.styleSeparator.replace(/\/\*.*?\*\//g, '');
				
				start = p.range().end;
			});
		},
		
		/**
		 * Replace substring of tag's source
		 * @param {String} value
		 * @param {Number} start
		 * @param {Number} end
		 * @private
		 */
		_updateSource: function(value, start, end) {
			// create modification range
			var r = range(start, _.isUndefined(end) ? 0 : end - start);
			var delta = value.length - r.length();
			
			if (this._contentStartPos > r.start)
				this._contentStartPos += delta;
			
			// update all affected positions
			_.each(this.list(), function(item) {
				if (item._namePos > r.start) 
					item._namePos += delta;
				
				if (item._valuePos > r.start) 
					item._valuePos += delta;
				
				if (item._endPos > r.start) 
					item._endPos += delta;
			});
			
			this.source = require('utils').replaceSubstring(this.source, value, r);
		},
			
			
		/**
		 * Adds new CSS property 
		 * @param {String} name Property name
		 * @param {String} value Property value
		 * @param {Number} pos Position at which to insert new property. By 
		 * default the property is inserted at the end of rule 
		 * @returns {CSSEditProperty}
		 */
		add: function(name, value, pos) {
			var list = this.list();
			var start = this._contentStartPos;
			var styles = _.pick(this.options, 'styleBefore', 'styleSeparator');
			
			if (_.isUndefined(pos))
				pos = list.length;
			
			/** @type CSSEditProperty */
			var donor = list[pos];
			if (donor) {
				start = donor.fullRange().start;
			} else if (donor = list[pos - 1]) {
				// make sure that donor has terminating semicolon
				donor.end(';');
				start = donor.range().end;
			}
			
			if (donor) {
				styles = _.pick(donor, 'styleBefore', 'styleSeparator');
			}
			
			var nameToken = createToken(start + styles.styleBefore.length, name);
			var valueToken = createToken(nameToken.end + styles.styleSeparator.length, value);
			
			var property = new CSSEditProperty(this, nameToken, valueToken,
					createToken(valueToken.end, ';'));
			
			_.extend(property, styles);
			
			// write new property into the source
			this._updateSource(property.styleBefore + property.toString(), start);
			
			// insert new property
			this._properties.splice(pos, 0, property);
			return property;
		},
		
		/**
		 * Returns property object
		 * @param {String} name Property name or its index
		 * @returns {CSSEditProperty}
		 */
		get: function(name) {
			if (_.isNumber(name))
				return this.list()[name];
			
			if (_.isString(name))
				return _.find(this.list(), function(prop) {
					return prop.name() === name;
				});
			
			return name;
		},
		
		/**
		 * Returns all property objects by name or indexes
		 * @param {Object} name Property name(s) or indexes (<code>String</code>,
		 * <code>Array</code>, <code>Number</code>)
		 * @returns {Array}
		 */
		getAll: function(name) {
			if (!_.isArray(name))
				name = [name];
			
			// split names and indexes
			var names = [], indexes = [];
			_.each(name, function(item) {
				if (_.isString(item))
					names.push(item);
				else if (_.isNumber(item))
					indexes.push(item);
			});
			
			return _.filter(this.list(), function(property, i) {
				return _.include(indexes, i) || _.include(names, property.name());
			});
		},
		
		/**
		 * Returns or updates property value
		 * @param {String} name Property name or its index
		 * @param {String} value New property value
		 * @returns {String}
		 */
		value: function(name, value) {
			var property = this.get(name);
			if (property)
				return property.value(value);
		},
		
		/**
		 * Returns all values of properties found by <code>getAll()</code>
		 * method
		 * @param {Object} name Property name(s) or indexes (<code>String</code>,
		 * <code>Array</code>, <code>Number</code>)
		 * @returns {Array}
		 */
		values: function(name) {
			return _.map(this.getAll(name), function(property) {
				return property.value();
			});
		},
		
		/**
		 * Remove property
		 * @param {String} name Property name or its index
		 */
		remove: function(name) {
			var property = this.get(name);
			if (property) {
				this._updateSource('', property.fullRange());
				this._properties = _.without(this._properties, property);
			}
		},
		
		/**
		 * Returns list of all CSS property objects of current rule
		 * @returns {Array}
		 */
		list: function() {
			return this._properties;
		},
		
		indexOf: function(property) {
			return _.indexOf(this.list(), this.get(property));
		},
		
		/**
		 * Sets or gets current rule selector
		 * @param {String} value New selector value. If not passed, current 
		 * selector is returned
		 * @return {String}
		 */
		selector: function(value) {
			if (!_.isUndefined(value) && !this._selector !== value) {
				this._updateSource(value, this.selectorRange());
				this._selector = value;
			}
			
			return this._selector;
		},
		
		/**
		 * Returns selector range object
		 * @param {Boolean} isAbsolute Return absolute range (with respect of 
		 * rule offset)
		 * @returns {Range}
		 */
		selectorRange: function(isAbsolute) {
			return range(this._selectorPos + (isAbsolute ? this.options.offset : 0), this.selector());
		},
		
		/**
		 * Returns property that belongs to specified position
		 * @param {Number} pos
		 * @param {Boolean} isAbsolute
		 * @returns {CSSEditProperty}
		 */
		propertyFromPosition: function(pos, isAbsolute) {
			return _.find(this.list(), function(property) {
				return property.range(isAbsolute).inside(pos);
			});
		},
		
		toString: function() {
			return this.source;
		}
	};
	
	/**
	 * @param {CSSEditRule} rule
	 * @param {Token} name
	 * @param {Token} value
	 * @param {Token} end
	 * @returns
	 */
	function CSSEditProperty(rule, name, value, end) {
		/** @type CSSEditRule */
		this.parent = rule;
		
		this.styleBefore = rule.options.styleBefore;
		this.styleSeparator = rule.options.styleSeparator;
		
		this._name = name.value;
		this._value = value.value;
		this._end = end.value;
		
		this._namePos = name.start;
		this._valuePos = value.start;
		this._endPos = end.start;
	}
	
	CSSEditProperty.prototype = {
		/**
		 * Make position absolute
		 * @private
		 * @param {Number} num
		 * @param {Boolean} isAbsolute
		 * @returns {Boolean}
		 */
		_pos: function(num, isAbsolute) {
			return num + (isAbsolute ? this.parent.options.offset : 0);
		},
		
		/**
		 * Sets of gets property value
		 * @param {String} val New property value. If not passed, current 
		 * value is returned
		 */
		value: function(val) {
			if (!_.isUndefined(val) && this._value !== val) {
				this.parent._updateSource(val, this.valueRange());
				this._value = val;
			}
			
			return this._value;
		},
		
		/**
		 * Returns ranges of complex value parts
		 * @returns {Array} Returns <code>null</code> if value is not complex
		 */
		valueParts: function(isAbsolute) {
			var parts = findParts(this.value());
			if (isAbsolute) {
				var offset = this.parent.options.offset;
				_.each(parts, function(p) {
					p.shift(offset);
				});
			}
			
			return parts;
		},
		
		/**
		 * Sets of gets property name
		 * @param {String} val New property name. If not passed, current 
		 * name is returned
		 */
		name: function(val) {
			if (!_.isUndefined(val) && this._name !== val) {
				this.parent._updateSource(val, this.nameRange());
				this._name = val;
			}
			
			return this._name;
		},
		
		/**
		 * Sets of gets property end value (basically, it's a semicolon)
		 * @param {String} val New end value. If not passed, current 
		 * value is returned
		 */
		end: function(val) {
			if (!_.isUndefined(val) && this._end !== val) {
				this.parent._updateSource(val, this._endPos, this._endPos + this._end.length);
				this._end = val;
			}
			
			return this._end;
		},
		
		/**
		 * Returns position of property name token
		 * @param {Boolean} isAbsolute Return absolute position
		 * @returns {Number}
		 */
		namePosition: function(isAbsolute) {
			return this._pos(this._namePos, isAbsolute);
		},
		
		/**
		 * Returns position of property value token
		 * @param {Boolean} isAbsolute Return absolute position
		 * @returns {Number}
		 */
		valuePosition: function(isAbsolute) {
			return this._pos(this._valuePos, isAbsolute);
		},
		
		/**
		 * Returns rule range: from identifier to closing semicolon
		 * @param {Boolean} isAbsolute Return absolute range (with respect of
		 * rule offset)
		 * @returns {Range}
		 */
		range: function(isAbsolute) {
			return range(this.namePosition(isAbsolute), this.toString());
		},
		
		/**
		 * Returns full rule range, with indentation
		 * @param {Boolean} isAbsolute Return absolute range (with respect of
		 * rule offset)
		 * @returns {Range}
		 */
		fullRange: function(isAbsolute) {
			var r = this.range(isAbsolute);
			r.start -= this.styleBefore.length;
			return r;
		},
		
		/**
		 * Returns property name range
		 * @param {Boolean} isAbsolute Return absolute range (with respect of
		 * rule offset)
		 * @returns {Range}
		 */
		nameRange: function(isAbsolute) {
			return range(this.namePosition(isAbsolute), this.name());
		},
		
		/**
		 * Returns property value range
		 * @param {Boolean} isAbsolute Return absolute range (with respect of
		 * rule offset)
		 * @returns {Range}
		 */
		valueRange: function(isAbsolute) {
			return range(this.valuePosition(isAbsolute), this.value());
		},
		
		/**
		 * Returns item string representation
		 * @returns {String}
		 */
		toString: function() {
			return this.name() + this.styleSeparator + this.value() + this.end();
		},
		
		valueOf: function() {
			return this.toString();
		}
	};
	
	return {
		/**
		 * Parses CSS rule into editable tree
		 * @param {String} source
		 * @param {Object} options
		 * @memberOf zen_coding.cssEditTree
		 * @returns {CSSEditRule}
		 */
		parse: function(source, options) {
			return new CSSEditRule(source, options);
		},
		
		/**
		 * Extract and parse CSS rule from specified position in <code>content</code> 
		 * @param {String} content CSS source code
		 * @param {Number} pos Character position where to start source code extraction
		 * @returns {CSSEditRule}
		 */
		parseFromPosition: function(content, pos, isBackward) {
			var bounds = this.extractRule(content, pos, isBackward);
			if (!bounds || !bounds.inside(pos))
				// no matching CSS rule or caret outside rule bounds
				return null;
			
			return this.parse(bounds.substring(content), {
				offset: bounds.start
			});
		},
		
		/**
		 * Extracts single CSS selector definition from source code
		 * @param {String} content CSS source code
		 * @param {Number} pos Character position where to start source code extraction
		 * @returns {Range}
		 */
		extractRule: function(content, pos, isBackward) {
			var result = '';
			var len = content.length;
			var offset = pos;
			var stopChars = '{}/\\<>';
			var bracePos = -1, ch;
			
			// search left until we find rule edge
			while (offset >= 0) {
				ch = content.charAt(offset);
				if (ch == '{') {
					bracePos = offset;
					break;
				}
				else if (ch == '}' && !isBackward) {
					offset++;
					break;
				}
				
				offset--;
			}
			
			// search right for full rule set
			while (offset < len) {
				ch = content.charAt(offset);
				if (ch == '{')
					bracePos = offset;
				else if (ch == '}') {
					if (bracePos != -1)
						result = content.substring(bracePos, offset + 1);
					break;
				}
				
				offset++;
			}
			
			if (result) {
				// find CSS selector
				offset = bracePos - 1;
				var selector = '';
				while (offset >= 0) {
					ch = content.charAt(offset);
					if (stopChars.indexOf(ch) != -1) break;
					offset--;
				}
				
				// also trim whitespace
				selector = content.substring(offset + 1, bracePos).replace(/^[\s\n\r]+/m, '');
				return require('range').create(bracePos - selector.length, bracePos + result.length);
			}
			
			return null;
		},
		
		/**
	 	 * Removes vendor prefix from CSS property
	 	 * @param {String} name CSS property
	 	 * @return {String}
	 	 */
	 	baseName: function(name) {
	 		return name.replace(/^\s*\-\w+\-/, '');
	 	},
	 	
	 	/**
	 	 * Finds parts of complex CSS value
	 	 * @param {String} str
	 	 * @returns {Array}
	 	 */
	 	findParts: findParts
	};
});