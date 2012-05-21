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
	
	/**
	 * Returns newline character at specified position in content
	 * @param {String} content
	 * @param {Number} pos
	 * @return {String}
	 */
	function getNewline(content, pos) {
		return content.charAt(pos) == '\r' && content.charAt(pos + 1) == '\n' 
			? '\r\n' 
			: content.charAt(pos);
	}
	
	/**
	 * Normalize newline tokens
	 * @param {Array} tokens
	 * @param {String} source
	 */
	function normalizeNewline(tokens, source) {
		var it = new TokenIterator(tokens), token;
		while (token = it.next()) {
			if (token.type == 'line') {
				token.value = getNewline(source, it.position());
			}
		}
	}
	
	/**
	 * @type TokenIterator
	 * @param {Array} tokens
	 * @returns
	 */
	function TokenIterator(tokens) {
		/** @type Array */
		this.tokens = tokens;
		this._position = 0;
		this.reset();
	}
	
	TokenIterator.prototype = {
		next: function() {
			if (this.hasNext()) {
				var token = this.tokens[++this._i];
				if (this._i)
					this._position += this.tokens[this._i - 1].value.length;
				
				return token;
			}
			
			return null;
		},
		
		position: function() {
			return this._position;
		},
		
		hasNext: function() {
			return this._i < this._il - 1;
		},
		
		reset: function() {
			this._i = -1;
			this._il = this.tokens.length;
		},
		
		item: function() {
			return this.tokens[this._i];
		},
		
		itemNext: function() {
			return this.tokens[this._i + 1];
		},
		
		itemPrev: function() {
			return this.tokens[this._i - 1];
		},
		
		nextUntil: function(type, callback) {
			var token;
			var test = _.isString(type) 
				? function(t){return t.type == type;} 
				: type;
			
			while (token = this.next()) {
				if (callback)
					callback.call(this, token);
				if (test.call(this, token))
					break;
			}
		}
	};
	
	/**
	 * Consume all CSS properties in rule
	 * @param {TokenIterator} it
	 * @param {CSSRule} rule
	 * @returns {Array}
	 */
	function consumeProperties(it, rule) {
		var result = [], token, property = null;
		
		while (token = it.next()) {
			if (token.type == 'identifier') {
				if (property)
					result.push(property);
				
				property = new CSSProperty(rule);
				property._nameOld = token.value;
				property.name(token.value, it.position());
				consumeValue(it, property);
			}
		}
		
		if (property)
			result.push(property);
		
		return result;
	}
	
	/**
	 * Consume CSS property value
	 * @param {TokenIterator} it
	 * @param {CSSProperty} property
	 */
	function consumeValue(it, property) {
		var pos = -1;
		var value = '';
		var skipTokens = ['white', 'line', ':'];
		var token, type;
		
		// find value start position
		it.nextUntil(function(tok) {
			return !_.include(skipTokens, this.itemNext().type);
		});
		
		pos = it.position() + it.item().value.length;
		while (token = it.next()) {
			type = token.type;
			if (type == '}') {
				break;
			} else if (type == ';') {
				property._endOld = token.value;
				property.end(token.value);
				break;
			} else if (type == 'line' && (it.itemNext().type == '}' || pos === -1)) {
				break;
			}
			
			value += token.value;
		}
		
		// remember value
		property._valueOld = value;
		property.value(value, pos);
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
	 * @type CSSRule
	 * @param {String} source
	 * @param {Object} options
	 */
	function CSSRule(source, options) {
		this.options = _.extend({}, defaultOptions, options);
		this.source = source;
		this._isSaved = false;
		this._contentStartPos = -1;
		
		var tokens = require('cssParser').lex(source);
		normalizeNewline(tokens, source);
		
		// iterate though all tokens and collect all important values
		var it = new TokenIterator(tokens), token;
		while (token = it.next()) {
			switch (token.type) {
				case 'identifier':
					this._selectorOld = token.value;
					this.selector(token.value, it.position());
					break;
					
				case '{':
					this._contentStartPos = it.position() + 1;
					this._properties = consumeProperties(it, this);
					break;
			}
		}
		
		this._saveStyle();
		this.save();
	}
	
	CSSRule.prototype = {
		/**
		 * Remembers all styles of properties
		 * @private
		 */
		_saveStyle: function() {
			var start = this._contentStartPos;
			var source = this.source;
			
			_.each(this.list(), /** @param {CSSProperty} p */ function(p) {
				p.styleBefore = source.substring(start, p.namePosition());
				p.styleSeparator = source.substring(p.namePosition() + p.name().length, p.valuePosition());
				
				// graceful and naive comments removal 
				p.styleBefore = _.last(p.styleBefore.split('*/'));
				p.styleSeparator = p.styleSeparator.replace(/\/\*.*?\*\//g, '');
				
				start = p.range().end;
			});
		},
		
		/**
		 * Shift token positions of modified property's siblings
		 * @param {CSSProperty} property Modified property or its index
		 * @param {Number} delta Position offset
		 * @private
		 */
		_shiftSiblingsRange: function(property, delta) {
			if (property instanceof CSSProperty)
				property = this.indexOf(property) + 1;
			
			_.each(this.list().slice(property), function(prop) {
				prop.shiftPosition(delta);
			});
		},
		
		/**
		 * Replace substring of rule's source
		 * @private
		 */
		_updateSource: function(value, start, end) {
			this.source = require('utils').replaceSubstring(this.source, value, start, end);
		},
			
			
		/**
		 * Adds new CSS property 
		 * @param {String} name Property name
		 * @param {String} value Property value
		 * @param {Number} pos Position at which to insert new property. By 
		 * default the property is inserted at the end of rule 
		 */
		add: function(name, value, pos) {
			var len = this._properties.length;
			var start = this._contentStartPos;
			var property = new CSSProperty(this, name, value, ';');
			property.styleBefore = this.options.styleBefore;
			property.styleSeparator = this.options.styleSeparator;
			
			if (_.isUndefined(pos))
				pos = len;
			
			
			if (len) {
				// learn style from existing properties
				var ref = this.get(pos > len - 1 ? len - 1 : pos);
				property.styleBefore = ref.styleBefore;
				property.styleSeparator = ref.styleSeparator;
				// make sure the property ends with semicolon
				ref.end(';');
				
				start = ref.fullRange()[pos == len ? 'end' : 'start'];
			}
			
			property._namePos = start + property.styleBefore.length;
			property._valuePos = property._namePos + name.length + property.styleSeparator.length;
			
			// insert new property
			this._properties.splice(pos, 0, property);
			
			// write new property into the source
			this._updateSource(property, start);
			this._shiftSiblingsRange(property, property.fullRange().length());
			return property;
		},
		
		/**
		 * Updates CSS property's value
		 * @param {String} name Property name or its index to update
		 * @param {String} value New property value
		 */
		set: function(name, value) {
			var property = this.get(name);
			if (property) {
				property.value(value);
				property.save();
			}
		},
		
		/**
		 * Returns property object
		 * @param {String} name Property name or its index
		 * @returns {CSSProperty}
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
		 * Returns property value
		 * @param {String} name Property name or its index
		 * @returns {String}
		 */
		value: function(name) {
			var property = this.get(name);
			if (property)
				return property.value();
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
				var r = property.fullRange();
				this._updateSource('', r.start, r.end);
				this._shiftSiblingsRange(property, -r.length());
				this._properties = _.without(this._properties, property);
				this.save();
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
		selector: function(value, pos) {
			if (!_.isUndefined(value)) {
				this._isSaved = false;
				this._selector = value;
				this.save();
			}
			
			if (_.isNumber(pos))
				this._selectorPos = pos;
			
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
		
		save: function() {
			var delta = 0;
			var selector = this.selector();
			if (this._selectorOld !== selector) {
				delta = selector - this._selectorOld;
				this._updateSource(selector, this._selectorPos, this._selectorPos + this._selectorOld.length);
			}
			
			if (delta)
				this._shiftSiblingsRange(0, delta);
			
			this._selectorOld = this._selector;
			this._isSaved = true;
			_.invoke(this.list(), 'save');
		},
		
		/**
		 * Returns property that belongs to specified position
		 * @param {Number} pos
		 * @param {Boolean} isAbsolute
		 * @returns {CSSProperty}
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
	
	function CSSProperty(rule, name, value, end) {
		/** @type CSSRule */
		this.parent = rule;
		
		this.styleBefore = '';
		this.styleSeparator = '';
		
		this._isSaved = false;
		this._name = this._nameOld = name || '';
		this._value = this._valueOld = value || '';
		this._end = this._endOld = end || '';
		this._namePos = this._valuePos = -1;
	}
	
	CSSProperty.prototype = {
		/**
		 * Sets of gets property value
		 * @param {String} val New property value. If not passed, current 
		 * value is returned
		 * @param {Number} pos
		 */
		value: function(val, pos) {
			if (!_.isUndefined(val) && this._value !== val) {
				this._value = val;
				this.save();
			}
			
			if (_.isNumber(pos))
				this._valuePos = pos;
			
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
		 * @param {Number} pos
		 */
		name: function(val, pos) {
			if (!_.isUndefined(val) && this._name !== val) {
				this._name = val;
				this.save();
			}
			
			if (_.isNumber(pos))
				this._namePos = pos;
			
			return this._name;
		},
		
		/**
		 * Sets of gets property end value (basically, it's a semicolon)
		 * @param {String} val New end value. If not passed, current 
		 * value is returned
		 */
		end: function(val) {
			if (!_.isUndefined(val) && this._end !== val) {
				this._end = val;
				this.save();
			}
			
			return this._end;
		},
		
		namePosition: function() {
			return this._namePos;
		},
		
		valuePosition: function() {
			return this._valuePos;
		},
		
		save: function() {
			var delta = 0;
			var name = this.name();
			if (this._nameOld !== name) {
				delta += name.length - this._nameOld.length;
				this.parent._updateSource(name, this.namePosition(), this.namePosition() + this._nameOld.length);
				this._valuePos += delta;
			}
			
			var value = this.value();
			if (this._valueOld !== value) {
				delta += value.length - this._valueOld.length;
				this.parent._updateSource(value, this.valuePosition(), this.valuePosition() + this._valueOld.length);
			}
			
			var end = this.end();
			if (this._endOld !== end) {
				delta += end.length - this._endOld.length;
				this.parent._updateSource(end, 
						this.valuePosition() + this.value().length, 
						this.valuePosition() + this.value().length + this._endOld.length);
			}
			
			if (delta) {
				this.parent._shiftSiblingsRange(this, delta);
			}
			
			this._valueOld = this._value;
			this._nameOld = this._name;
			this._endOld = this._end;
			this._isSaved = true;
		},
		
		/**
		 * Returns rule range: from identifier to closing semicolon
		 * @param {Boolean} isAbsolute Return absolute range (with respect of
		 * rule offset)
		 * @returns {Range}
		 */
		range: function(isAbsolute) {
			var r = range(this.namePosition(), 
					this.valuePosition() + this.value().length + this.end().length - this.namePosition());
			
			if (isAbsolute)
				r.shift(this.parent.options.offset);
			return r;
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
			return range(this.namePosition() + (isAbsolute ? this.parent.options.offset : 0), this.name());
		},
		
		/**
		 * Returns property value range
		 * @param {Boolean} isAbsolute Return absolute range (with respect of
		 * rule offset)
		 * @returns {Range}
		 */
		valueRange: function(isAbsolute) {
			return range(this.valuePosition() + (isAbsolute ? this.parent.options.offset : 0), this.value());
		},
		
		shiftPosition: function(delta) {
			this._namePos += delta;
			this._valuePos += delta;
		},
		
		toString: function() {
			return this.styleBefore + this.name() + this.styleSeparator + this.value() + this.end();
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
		 * @returns {CSSRule}
		 */
		parse: function(source, options) {
			return new CSSRule(source, options);
		},
		
		/**
		 * Extract and parse CSS rule from specified position in <code>content</code> 
		 * @param {String} content CSS source code
		 * @param {Number} pos Character position where to start source code extraction
		 * @returns {CSSRule}
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