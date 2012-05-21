/**
 * HTML EditTree is a module that can parse an HTML element into a tree with 
 * convenient methods for adding, modifying and removing attributes. These 
 * changes can be written back to string with respect of code formatting.
 * 
 * @memberOf __htmlEditTreeDefine
 * @constructor
 * @param {Function} require
 * @param {Underscore} _ 
 */
zen_coding.define('htmlEditTree', function(require, _) {
	var defaultOptions = {
		styleBefore: ' ',
		offset: 0
	};
	
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
		return require('create').create(start, len);
	}
	
	/**
	 * @type HTMLEditElement
	 * @param {String} source
	 * @param {Object} options
	 */
	function HTMLEditElement(source, options) {
		this.options = _.extend({}, defaultOptions, options);
		this.source = source;
		this._isSaved = false;
		this._attributes = [];
		
		var attrToken = null;
		var tokens = require('xmlParser').parse(source);
		
		_.each(tokens, function(token) {
			updateToken(token);
			switch (token.type) {
				case 'tag':
					if (/^<[^\/]+/.test(token.value)) {
						this.name(token.value.substring(1), token.start + 1);
					}
					break;
					
				case 'attribute':
					// add empty attribute
					if (attrToken) {
						this._attributes.push(new HTMLEditAttribute(this, attrToken));
					}
					
					attrToken = token;
					break;
					
				case 'string':
					this._attributes.push(new HTMLEditAttribute(this, attrToken, token));
					attrToken = null;
					break;
			}
		}, this);
		
		if (attrToken) {
			this._attributes.push(new HTMLEditAttribute(this, attrToken));
		}
		
		this._saveStyle();
	}
	
	HTMLEditElement.prototype = {
		/**
		 * Remembers all styles of properties
		 * @private
		 */
		_saveStyle: function() {
			var start = this.name().length + 1;
			var source = this.source;
			
			_.each(this.list(), /** @param {HTMLEditAttribute} p */ function(p) {
				p.styleBefore = source.substring(start, p.namePosition());
				
				if (p.valuePosition() !== -1) {
					p.styleSeparator = source.substring(p.namePosition() + p.name().length, p.valuePosition());
				}
				
				start = p.range().end;
			});
		},
		
		/**
		 * Shift token positions of modified property's siblings
		 * @param {HTMLEditAttribute} attribute Modified attribute or its index
		 * @param {Number} delta Position offset
		 * @private
		 */
		_shiftSiblingsRange: function(attribute, delta) {
			if (attribute instanceof HTMLEditAttribute)
				attribute = this.indexOf(attribute) + 1;
			
			_.each(this.list().slice(attribute || 0), function(prop) {
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
		 * Adds new attribute 
		 * @param {String} name Property name
		 * @param {String} value Property value
		 * @param {Number} pos Position at which to insert new property. By 
		 * default the property is inserted at the end of rule 
		 */
		add: function(name, value, pos) {
			var list = this.list();
			var start = 1;
			
			var styleBefore = this.options.styleBefore;
			var styleSeparator = this.options.styleSeparator;
			var styleQuote = this.options.styleQuote;
			
			if (_.isUndefined(pos))
				pos = list.length;
			
			/** @type HTMLEditAttribute */
			var donor = list[pos] || list[pos - 1];
			if (donor) {
				styleBefore = donor.styleBefore;
				styleSeparator = donor.styleSeparator;
				styleQuote = donor.styleQuote;
				start = donor.range().end;
			}
			
			var attribute = new HTMLEditAttribute(this, 
					createToken(start + styleBefore.length, name),
					createToken(start + styleBefore.length + name.length + styleSeparator.length, value)
					);
			
			attribute.styleBefore = styleBefore;
			attribute.styleSeparator = styleSeparator;
			attribute.styleQuote = styleQuote;
			
			// insert new attribute
			this._attributes.splice(pos, 0, attribute);
			
			// write new property into the source
			this._updateSource(attribute, start);
			this._shiftSiblingsRange(attribute, attribute.fullRange().length());
			return attribute;
		},
		
		/**
		 * Updates attribute value
		 * @param {String} name Attribute name or its index to update
		 * @param {String} value New attribute value
		 */
		set: function(name, value) {
			var attr = this.get(name);
			if (attr) {
				attr.value(value);
			}
		},
		
		/**
		 * Returns attribute object
		 * @param {String} name Attribute name or its index
		 * @returns {HTMLEditAttribute}
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
		 * Returns attribute value
		 * @param {String} name Attribute name or its index
		 * @returns {String}
		 */
		value: function(name) {
			var attribute = this.get(name);
			if (attribute)
				return attribute.value();
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
				var r = attribute.fullRange();
				this._updateSource('', r.start, r.end);
				this._shiftSiblingsRange(attribute, -r.length());
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
				this._isSaved = false;
				this._shiftSiblingsRange(null, value.length - this._name.length);
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
		 * @returns {HTMLEditAttribute}
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
	 * @param {HTMLEditElement} element
	 * @param {Object} nameToken
	 * @param {Object} valueToken
	 */
	function HTMLEditAttribute(element, nameToken, valueToken) {
		this.parent = element;
		
		this.styleBefore = '';
		this.styleSeparator = '';
		
		this._isSaved = false;
		this._name = this._nameOld = nameToken.value || '';
		this._value = this._valueOld = valueToken ? valueToken.value : '';
		this._namePos = nameToken.start;
		this._valuePos = valueToken ? valueToken.start : -1;
	}
	
	HTMLEditAttribute.prototype = {
		/**
		 * Sets of gets attribute value
		 * @param {String} val New attribute value. If not passed, current 
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
		 * Sets of gets attribute name
		 * @param {String} val New attribute name. If not passed, current 
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
		
		namePosition: function() {
			return this._namePos;
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
			
			if (delta) {
				this.parent._shiftSiblingsRange(this, delta);
			}
			
			this._valueOld = this._value;
			this._nameOld = this._name;
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
					this.valuePosition() + this.value().length - this.namePosition());
			
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
		 * Parses HTML element into editable tree
		 * @param {String} source
		 * @param {Object} options
		 * @memberOf zen_coding.htmlEditTree
		 * @returns {HTMLEditElement}
		 */
		parse: function(source, options) {
			
		}
	};
});