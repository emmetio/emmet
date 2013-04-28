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
emmet.define('cssEditTree', function(require, _) {
	var defaultOptions = {
		styleBefore: '\n\t',
		styleSeparator: ': ',
		offset: 0
	};
	
	var WHITESPACE_REMOVE_FROM_START = 1;
	var WHITESPACE_REMOVE_FROM_END   = 2;
	
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
		
		while ((token = it.next())) {
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
		
		return range(start, end - start);
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
		
		it.nextUntil(function() {
			return !_.include(skipTokens, this.itemNext().type);
		});
		
		start = it.current().end;
		// consume value
		while ((token = it.next())) {
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
				
				return range(start, end - start);
			}
			
			tokens.push(token);
		}
		
		// reached the end of tokens list
		if (tokens.length) {
			return range(tokens[0].start, _.last(tokens).end - tokens[0].start);
		}
	}
	
	/**
	 * Finds parts of complex CSS value
	 * @param {String} str
	 * @returns {Array} Returns list of <code>Range</code>'s
	 */
	function findParts(str) {
		/** @type StringStream */
		var stream = require('stringStream').create(str);
		var ch;
		var result = [];
		var sep = /[\s\u00a0,]/;
		
		var add = function() {
			stream.next();
			result.push(range(stream.start, stream.current()));
			stream.start = stream.pos;
		};
		
		// skip whitespace
		stream.eatSpace();
		stream.start = stream.pos;
		
		while ((ch = stream.next())) {
			if (ch == '"' || ch == "'") {
				stream.next();
				if (!stream.skipTo(ch)) break;
				add();
			} else if (ch == '(') {
				// function found, may have nested function
				stream.backUp(1);
				if (!stream.skipToPair('(', ')')) break;
				stream.backUp(1);
				add();
			} else {
				if (sep.test(ch)) {
					result.push(range(stream.start, stream.current().length - 1));
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
	 * A bit hacky way to identify invalid CSS property definition: when user
	 * starts writing new abbreviation in CSS rule, he actually creates invalid
	 * CSS property definition and this method tries to identify such abbreviation
	 * and prevent it from being added to CSS edit tree 
	 * @param {TokenIterator} it
	 */
	function isValidIdentifier(it) {
//		return true;
		var tokens = it.tokens;
		for (var i = it._i + 1, il = tokens.length; i < il; i++) {
			if (tokens[i].type == ':')
				return true;
			
			if (tokens[i].type == 'identifier' || tokens[i].type == 'line')
				return false;
		}
		
		return false;
	}
	
	/**
	 * @class
	 * @extends EditContainer
	 */
	var CSSEditContainer = require('editTree').EditContainer.extend({
		initialize: function(source, options) {
			_.defaults(this.options, defaultOptions);
			var editTree = require('editTree');
			
			/** @type TokenIterator */
			var it = require('tokenIterator').create(
					require('cssParser').parse(source));
			
			var selectorRange = findSelectorRange(it);
			this._positions.name = selectorRange.start;
			this._name = selectorRange.substring(source);
			
			if (!it.current() || it.current().type != '{')
				throw 'Invalid CSS rule';
			
			this._positions.contentStart = it.position() + 1;
			
			// consume properties
			var propertyRange, valueRange, token;
			while ((token = it.next())) {
				if (token.type == 'identifier' && isValidIdentifier(it)) {
					propertyRange = range(token);
					valueRange = findValueRange(it);
					var end = (it.current() && it.current().type == ';') 
						? range(it.current())
						: range(valueRange.end, 0);
					this._children.push(new CSSEditElement(this,
							editTree.createToken(propertyRange.start, propertyRange.substring(source)),
							editTree.createToken(valueRange.start, valueRange.substring(source)),
							editTree.createToken(end.start, end.substring(source))
							));
				}
			}
			
			this._saveStyle();
		},
		
		/**
		 * Remembers all styles of properties
		 * @private
		 */
		_saveStyle: function() {
			var start = this._positions.contentStart;
			var source = this.source;
			var utils = require('utils');
			
			_.each(this.list(), /** @param {CSSEditProperty} p */ function(p) {
				p.styleBefore = source.substring(start, p.namePosition());
				// a small hack here:
				// Sometimes users add empty lines before properties to logically
				// separate groups of properties. In this case, a blind copy of
				// characters between rules may lead to undesired behavior,
				// especially when current rule is duplicated or used as a donor
				// to create new rule.
				// To solve this issue, we‘ll take only last newline indentation
				var lines = utils.splitByLines(p.styleBefore);
				if (lines.length > 1) {
					p.styleBefore = '\n' + _.last(lines);
				}
				
				p.styleSeparator = source.substring(p.nameRange().end, p.valuePosition());
				
				// graceful and naive comments removal 
				p.styleBefore = _.last(p.styleBefore.split('*/'));
				p.styleSeparator = p.styleSeparator.replace(/\/\*.*?\*\//g, '');
				
				start = p.range().end;
			});
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
			var start = this._positions.contentStart;
			var styles = _.pick(this.options, 'styleBefore', 'styleSeparator');
			var editTree = require('editTree');
			
			if (_.isUndefined(pos))
				pos = list.length;
			
			/** @type CSSEditProperty */
			var donor = list[pos];
			if (donor) {
				start = donor.fullRange().start;
			} else if ((donor = list[pos - 1])) {
				// make sure that donor has terminating semicolon
				donor.end(';');
				start = donor.range().end;
			}
			
			if (donor) {
				styles = _.pick(donor, 'styleBefore', 'styleSeparator');
			}
			
			var nameToken = editTree.createToken(start + styles.styleBefore.length, name);
			var valueToken = editTree.createToken(nameToken.end + styles.styleSeparator.length, value);
			
			var property = new CSSEditElement(this, nameToken, valueToken,
					editTree.createToken(valueToken.end, ';'));
			
			_.extend(property, styles);
			
			// write new property into the source
			this._updateSource(property.styleBefore + property.toString(), start);
			
			// insert new property
			this._children.splice(pos, 0, property);
			return property;
		}
	});
	
	/**
	 * @class
	 * @type CSSEditElement
	 * @constructor
	 */
	var CSSEditElement = require('editTree').EditElement.extend({
		initialize: function(rule, name, value, end) {
			this.styleBefore = rule.options.styleBefore;
			this.styleSeparator = rule.options.styleSeparator;
			
			this._end = end.value;
			this._positions.end = end.start;
		},
		
		/**
		 * Returns ranges of complex value parts
		 * @returns {Array} Returns <code>null</code> if value is not complex
		 */
		valueParts: function(isAbsolute) {
			var parts = findParts(this.value());
			if (isAbsolute) {
				var offset = this.valuePosition(true);
				_.each(parts, function(p) {
					p.shift(offset);
				});
			}
			
			return parts;
		},
		
		/**
		 * Sets of gets property end value (basically, it's a semicolon)
		 * @param {String} val New end value. If not passed, current 
		 * value is returned
		 */
		end: function(val) {
			if (!_.isUndefined(val) && this._end !== val) {
				this.parent._updateSource(val, this._positions.end, this._positions.end + this._end.length);
				this._end = val;
			}
			
			return this._end;
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
		 * Returns item string representation
		 * @returns {String}
		 */
		valueOf: function() {
			return this.name() + this.styleSeparator + this.value() + this.end();
		}
	});
	
	return {
		/**
		 * Parses CSS rule into editable tree
		 * @param {String} source
		 * @param {Object} options
		 * @memberOf emmet.cssEditTree
		 * @returns {EditContainer}
		 */
		parse: function(source, options) {
			return new CSSEditContainer(source, options);
		},
		
		/**
		 * Extract and parse CSS rule from specified position in <code>content</code> 
		 * @param {String} content CSS source code
		 * @param {Number} pos Character position where to start source code extraction
		 * @returns {EditContainer}
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
			var stopChars = '{}/\\<>\n\r';
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
				if (ch == '{') {
					bracePos = offset;
				} else if (ch == '}') {
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
				return require('range').create(bracePos - selector.length, result.length + selector.length);
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