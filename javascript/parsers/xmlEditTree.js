/**
 * XML EditTree is a module that can parse an XML/HTML element into a tree with 
 * convenient methods for adding, modifying and removing attributes. These 
 * changes can be written back to string with respect of code formatting.
 * 
 * @memberOf __xmlEditTreeDefine
 * @constructor
 * @param {Function} require
 * @param {Underscore} _ 
 */
zen_coding.define('xmlEditTree', function(require, _) {
	var defaultOptions = {
		styleBefore: ' ',
		styleSeparator: '=',
		styleQuote: '"',
		offset: 0
	};
	
	var startTag = /^<([\w\:\-]+)((?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/m;
	
	function updateToken(token, source) {
		var range = require('range').create(token);
		token.value = range.substring(source);
		return token;
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
	 * @param start
	 * @param len
	 * @returns {Range}
	 */
	function range(start, len) {
		return require('range').create(start, len);
	}
	
	/**
	 * @type XMLEditElement
	 * @param {String} source
	 * @param {Object} options
	 */
	function XMLEditElement(source, options) {
		this.options = _.extend({}, defaultOptions, options);
		this.source = source;
		this._attributes = [];
		
		var attrToken = null;
		var tokens = require('xmlParser').parse(source);
		
		_.each(tokens, function(token) {
			updateToken(token, source);
			switch (token.type) {
				case 'tag':
					if (/^<[^\/]+/.test(token.value)) {
						this._name = token.value.substring(1);
					}
					break;
					
				case 'attribute':
					// add empty attribute
					if (attrToken) {
						this._attributes.push(new XMLEditAttribute(this, attrToken));
					}
					
					attrToken = token;
					break;
					
				case 'string':
					this._attributes.push(new XMLEditAttribute(this, attrToken, token));
					attrToken = null;
					break;
			}
		}, this);
		
		if (attrToken) {
			this._attributes.push(new XMLEditAttribute(this, attrToken));
		}
		
		this._saveStyle();
	}
	
	XMLEditElement.prototype = {
		/**
		 * Remembers all styles of properties
		 * @private
		 */
		_saveStyle: function() {
			var start = this.nameRange().end;
			var source = this.source;
			
			_.each(this.list(), /** @param {XMLEditAttribute} p */ function(p) {
				p.styleBefore = source.substring(start, p.namePosition());
				
				if (p.valuePosition() !== -1) {
					p.styleSeparator = source.substring(p.namePosition() + p.name().length, p.valuePosition() - p.styleQuote.length);
				}
				
				start = p.range().end;
			});
		},
		
		/**
		 * Replace substring of rule's source
		 * @param {String} value
		 * @param {Number} start
		 * @param {Number} end
		 * @private
		 */
		_updateSource: function(value, start, end) {
			// create modification range
			var r = range(start, _.isUndefined(end) ? 0 : end - start);
			var delta = value.length - r.length();
			
			// update all affected positions
			_.each(this.list(), function(item) {
				if (item._namePos > r.start) 
					item._namePos += delta;
				
				if (item._valuePos > r.start) 
					item._valuePos += delta;
			});
			
			this.source = require('utils').replaceSubstring(this.source, value, r);
		},
			
			
		/**
		 * Adds new attribute 
		 * @param {String} name Property name
		 * @param {String} value Property value
		 * @param {Number} pos Position at which to insert new property. By 
		 * default the property is inserted at the end of rule 
		 */
		add: function(name, value, pos) {
			var list = this.list();
			var start = this.nameRange().end;
			var styles = _.pick(this.options, 'styleBefore', 'styleSeparator', 'styleQuote');
			
			if (_.isUndefined(pos))
				pos = list.length;
			
			
			/** @type XMLEditAttribute */
			var donor = list[pos];
			if (donor) {
				start = donor.fullRange().start;
			} else if (donor = list[pos - 1]) {
				start = donor.range().end;
			}
			
			if (donor) {
				styles = _.pick(donor, 'styleBefore', 'styleSeparator', 'styleQuote');
			}
			
			value = styles.styleQuote + value + styles.styleQuote;
			
			var attribute = new XMLEditAttribute(this, 
					createToken(start + styles.styleBefore.length, name),
					createToken(start + styles.styleBefore.length + name.length 
							+ styles.styleSeparator.length, value)
					);
			
			_.extend(attribute, styles);
			
			// write new attribute into the source
			this._updateSource(attribute.styleBefore + attribute.toString(), start);
			
			// insert new attribute
			this._attributes.splice(pos, 0, attribute);
			return attribute;
		},
		
		/**
		 * Returns attribute object
		 * @param {String} name Attribute name or its index
		 * @returns {XMLEditAttribute}
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
		 * Returns all attribute objects by name or indexes
		 * @param {Object} name Attribute name(s) or indexes (<code>String</code>,
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
			
			return _.filter(this.list(), function(attribute, i) {
				return _.include(indexes, i) || _.include(names, attribute.name());
			});
		},
		
		/**
		 * Returns or updates attribute value
		 * @param {String} name Attribute name or its index
		 * @param {String} value New attribute value
		 * @returns {String}
		 */
		value: function(name, value) {
			var attribute = this.get(name);
			if (attribute)
				return attribute.value(value);
		},
		
		/**
		 * Returns all values of attributes found by <code>getAll()</code>
		 * method
		 * @param {Object} name Attribute name(s) or indexes (<code>String</code>,
		 * <code>Array</code>, <code>Number</code>)
		 * @returns {Array}
		 */
		values: function(name) {
			return _.map(this.getAll(name), function(attribute) {
				return attribute.value();
			});
		},
		
		/**
		 * Remove attribute
		 * @param {String} name Property name or its index
		 */
		remove: function(name) {
			var attribute = this.get(name);
			if (attribute) {
				this._updateSource('', attribute.fullRange());
				this._attributes = _.without(this._attributes, attribute);
			}
		},
		
		/**
		 * Returns list of all CSS property objects of current rule
		 * @returns {Array}
		 */
		list: function() {
			return this._attributes;
		},
		
		indexOf: function(attribute) {
			return _.indexOf(this.list(), this.get(attribute));
		},
		
		/**
		 * Sets or gets current element name
		 * @param {String} value New selector value. If not passed, current 
		 * selector is returned
		 * @return {String}
		 */
		name: function(value) {
			if (!_.isUndefined(value) && this._name !== value) {
				this._updateSource(value, 1, this._name.length + 1);
				this._name = value;
			}
			
			return this._name;
		},
		
		/**
		 * Returns name range object
		 * @param {Boolean} isAbsolute Return absolute range (with respect of 
		 * rule offset)
		 * @returns {Range}
		 */
		nameRange: function(isAbsolute) {
			return range(1 + (isAbsolute ? this.options.offset : 0), this.name());
		},
		
		/**
		 * Returns attribute that belongs to specified position
		 * @param {Number} pos
		 * @param {Boolean} isAbsolute
		 * @returns {XMLEditAttribute}
		 */
		attributeFromPosition: function(pos, isAbsolute) {
			return _.find(this.list(), function(attribute) {
				return attribute.range(isAbsolute).inside(pos);
			});
		},
		
		toString: function() {
			return this.source;
		}
	};
	
	/**
	 * @param {XMLEditElement} element
	 * @param {Object} nameToken
	 * @param {Object} valueToken
	 */
	function XMLEditAttribute(element, nameToken, valueToken) {
		this.parent = element;
		
		this.styleBefore = element.options.styleBefore;
		this.styleSeparator = element.options.styleSeparator;
		
		var value = '', quote = element.options.styleQuote;
		if (valueToken) {
			value = valueToken.value;
			quote = value.charAt(0);
			if (quote == '"' || quote == "'") {
				value = value.substring(1);
			} else {
				quote = '';
			}
			
			if (quote && value.charAt(value.length - 1) == quote) {
				value = value.substring(0, value.length - 1);
			}
		}
		
		this.styleQuote = quote;
		
		this._name = nameToken.value || '';
		this._value = value;
		this._namePos = nameToken.start;
		this._valuePos = valueToken ? valueToken.start + quote.length : -1;
	}
	
	XMLEditAttribute.prototype = {
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
		 * Sets of gets attribute value
		 * @param {String} val New attribute value. If not passed, current 
		 * value is returned
		 * @returns {String}
		 */
		value: function(val) {
			if (!_.isUndefined(val) && this._value !== val) {
				// update value in source
				this.parent._updateSource(val, this.valueRange());
				this._value = val;
			}
			
			return this._value;
		},
		
		/**
		 * Sets of gets attribute name
		 * @param {String} val New attribute name. If not passed, current 
		 * name is returned
		 * @returns {String}
		 */
		name: function(val) {
			if (!_.isUndefined(val) && this._name !== val) {
				this.parent._updateSource(val, this.nameRange());
				this._name = val;
			}
			return this._name;
		},
		
		/**
		 * Returns position of attribute name token
		 * @param {Boolean} isAbsolute Return absolute position
		 * @returns {Number}
		 */
		namePosition: function(isAbsolute) {
			return this._pos(this._namePos, isAbsolute);
		},
		
		/**
		 * Returns position of attribute value token (value is unquoted)
		 * @param {Boolean} isAbsolute Return absolute position
		 * @returns {Number}
		 */
		valuePosition: function(isAbsolute) {
			return this._pos(this._valuePos, isAbsolute);
		},
		
		/**
		 * Returns rule range: from identifier to closing semicolon
		 * @param {Boolean} isAbsolute Return absolute range 
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
		
		toString: function() {
			return this.name() + this.styleSeparator
				+ this.styleQuote + this.value() + this.styleQuote;
		},
		
		valueOf: function() {
			return this.toString();
		}
	};
	
	return {
		/**
		 * Parses HTML element into editable tree
		 * @param {String} source
		 * @param {Object} options
		 * @memberOf zen_coding.htmlEditTree
		 * @returns {XMLEditElement}
		 */
		parse: function(source, options) {
			return new XMLEditElement(source, options);
		},
		
		/**
		 * Extract and parse HTML from specified position in <code>content</code> 
		 * @param {String} content CSS source code
		 * @param {Number} pos Character position where to start source code extraction
		 * @returns {XMLEditElement}
		 */
		parseFromPosition: function(content, pos, isBackward) {
			var bounds = this.extractTag(content, pos, isBackward);
			if (!bounds || !bounds.inside(pos))
				// no matching HTML tag or caret outside tag bounds
				return null;
			
			return this.parse(bounds.substring(content), {
				offset: bounds.start
			});
		},
		
		/**
		 * Extracts nearest HTML tag range from <code>content</code>, starting at 
		 * <code>pos</code> position
		 * @param {String} content
		 * @param {Number} pos
		 * @param {Boolean} isBackward
		 * @returns {Range}
		 */
		extractTag: function(content, pos, isBackward) {
			var len = content.length, i;
			
			// max extraction length. I don't think there may be tags larger 
			// than 2000 characters length
			var maxLen = Math.min(2000, len);
			
			/** @type Range */
			var r = null;
			
			var match = function(pos) {
				var m;
				if (content.charAt(pos) == '<' && (m = content.substr(pos, maxLen).match(startTag)))
					return range(pos, m[0]);
			};
			
			// lookup backward, in case we are inside tag already
			for (i = pos; i >= 0; i--) {
				if (r = match(i)) break;
			}
			
			if (r && (r.inside(pos) || isBackward))
				return r;
			
			if (!r && isBackward)
				return null;
			
			// search forward
			for (i = pos; i < len; i++) {
				if (r = match(i))
					return r;
			}
		}
	};
});