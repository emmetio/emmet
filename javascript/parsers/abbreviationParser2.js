/**
 * Zen Coding abbreviation parser. This module is designed to be stand-alone
 * (e.g. without any dependencies) so authors can copy this file into their
 * projects
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * @memberOf __abbreviationParser
 * @constructor
 * @param {Function} require
 * @param {Underscore} _
 */zen_coding.define('abbreviationParser2', function(require, _) {
	var reValidName = /^[\w\d\-_\$\:@!]+\+?$/i;
	var reWord = /[\w\-:\$]/;
	
	var pairs = {
		'[': ']',
		'(': ')',
		'{': '}'
	};
	
	function isPairChar(ch) {
		return ch in pairs;
	}
	
	/**
	 * Returns stripped string: a string without first and last character
	 * @param {String} str
	 * @returns {String}
	 */
	function stripped(str) {
		return str.substring(1, str.length - 1);
	}
	
	/**
	 * @type AbbreviationNode
	 */
	function AbbreviationNode(parent) {
		/** @type AbbreviationNode */
		this.parent = null;
		this.children = [];
		this.attributes = [];
		
		/** @type String Raw abbreviation for current node */
		this.abbreviation = '';
		this.counter = 1;
		this.name = null;
		this.text = null;
		this.repeatCount = 1;
		this.hasImplicitName = false;
		this.hasImplicitRepeat = false;
	}
	
	AbbreviationNode.prototype = {
		/**
		 * Adds passed node as child or creates new child
		 * @param {AbbreviationNode} child
		 * @return {AbbreviationNode}
		 */
		addChild: function(child) {
			child = child || new AbbreviationNode;
			child.parent = this;
			this.children.push(child);
			return child;
		},
		
		/**
		 * Creates a deep copy of current node
		 * @returns {AbbreviationNode}
		 */
		clone: function() {
			var node = new AbbreviationNode();
			var attrs = ['abbreviation', 'counter', 'name', 'text', 'repeatCount', 'hasImplicitName', 'hasImplicitRepeat'];
			_.each(attrs, function(a) {
				node[a] = this[a];
			}, this);
			
			// clone attributes
			node.attributes = _.map(this.attributes, function(attr) {
				return _.clone(attr);
			});
			
			// clone children
			node.children = _.map(this.children, function(child) {
				return child.clone();
			});
			
			return node;
		},
		
		/**
		 * Recursively sets <code>property</code> to <code>value</code> of current
		 * node and its children 
		 * @param {String} name Property to update
		 * @param {Object} value New property value
		 */
		updateProperty: function(name, value) {
			this[name] = value;
			_.each(this.children, function(child) {
				child.updateProperty(name, value);
			});
		},
		
		/**
		 * Replace current node in parent's child list with another node
		 * @param {AbbreviationNode} node
		 */
		replaceWith: function(node) {
			if (this.parent) {
				var ix = _.indexOf(this.parent.children, this);
				if (!ix) {
					this.parent.children[ix] = node;
					node.parent = this.parent;
					this.parent = null;
					return true;
				}
			}
			
			return false;
		},
		
		/**
		 * Sets abbreviation that belongs to current node
		 * @param {String} abbr
		 */
		setAbbreviation: function(abbr) {
			abbr = abbr || '';
			this.abbreviation = abbr;
			
			
			var that = this;
			
			// find multiplier
			abbr = abbr.replace(/\*(\d+)?$/, function(str, repeatCount) {
				if (repeatCount) {
					that.repeatCount = parseInt(repeatCount, 10) || 1;
				} else {
					// TODO set implicit repeat count
					that.hasImplicitRepeat = true;
				}
			});
			
			var abbrText = extractText(abbr);
			if (abbrText) {
				abbr = abbrText.element;
				this.text = abbrText.text;
			}
			
			var abbrAttrs = parseAttributes(abbr);
			console.log('found attributes', abbrAttrs);
			if (abbrAttrs) {
				abbr = abbrAttrs.element;
				this.attributes = abbrAttrs.attributes;
			}
			
			this.name = abbr;
			
			// validate name
			if (this.name && !reValidName.test(this.name)) {
				throw 'Invalid abbreviation';
			}
		},
		
		/**
		 * @return {String}
		 */
		getAbbreviation: function() {
			return this.expr;
		},
		
		/**
		 * Dump current tree node into a formatted string
		 * @return {String}
		 */
		toString: function(level) {
			level = level || 0;
			var output = this.abbreviation || '(empty)';
			
			return require('utils').repeatString('-', level)
				+ output + '\n' 
				+ _.map(this.children, function(item) {
					return item.toString(level + 1);
				}).join('');
		},
		
		/**
		 * Check if current node contains children with empty <code>expr</code>
		 * property
		 * @return {Boolean}
		 */
		hasEmptyChildren: function() {
			return !!_.find(this.children, function(child) {
				return child.isEmpty();
			});
		},
		
		/**
		 * Indicates empty node (i.e. without abbreviation). It may be a 
		 * grouping node and should not be outputted
		 * @return {Boolean}
		 */
		isEmpty: function() {
			return !this.abbreviation && !this.children.length;
		},
		
		/**
		 * Check if current node is a text-only node
		 * @return {Boolean}
		 */
		isTextNode: function() {
			return !this.name && this.text;
		},
		
		/**
		 * Indicates whether this node may be used to build elements or snippets
		 * @returns {Boolean}
		 */
		isElement: function() {
			return !this.isEmpty() && !this.isTextNode();
		},
		
		/**
		 * Returns attribute value (might be empty string) or <code>null</code> 
		 * if attribute wasn't found 
		 * @param {String} name
		 * @returns {String}
		 */
		getAttribute: function(name) {
			var attr = _.find(this.attributes, function(attr) {
				return attr.name == name; 
			});
			
			return attr ? attr.value : null;
		}
	};
	
	/**
	 * Check if character is numeric
	 * @requires {Stirng} ch
	 * @return {Boolean}
	 */
	function isNumeric(ch) {
		if (typeof(ch) == 'string')
			ch = ch.charCodeAt(0);
			
		return (ch && ch > 47 && ch < 58);
	}
	
	/**
	 * Optimizes tree node: replaces empty nodes with their children
	 * @param {AbbreviationNode} node
	 * @return {AbbreviationNode}
	 */
	function squash(node) {
		for (var i = node.children.length - 1; i >= 0; i--) {
			/** @type {AbbreviationNode} */
			var n = node.children[i];
			if (n.isEmpty()) {
				var args = [i, 1];
				for (var j = 0, jl = n.children.length; j < jl; j++) {
					args.push(n.children[j]);
				}
				
				Array.prototype.splice.apply(node.children, args);
			}
		}
		
		return node;
	}
	
	function consumeQuotedValue(stream, quote) {
		var ch;
		while (ch = stream.next()) {
			if (ch === quote)
				return true;
			
			if (ch == '\\')
				continue;
		}
		
		return false;
	}
	
	/**
	 * Extract attributes and their values from attribute set: 
	 * <code>[attr col=3 title="Quoted string"]</code>
	 * @param {String} attrSet
	 * @returns {Array}
	 */
	function extractAttributes(attrSet, attrs) {
		attrSet = require('utils').trim(attrSet);
		var result = [];
		
		/** @type StringStream */
		var stream = require('stringStream').create(attrSet);
		stream.eatSpace();
		
		while (!stream.eol()) {
			stream.start = stream.pos;
			if (stream.eatWhile(reWord)) {
				var attrName = stream.current();
				var attrValue = '';
				if (stream.peek() == '=') {
					stream.next();
					stream.start = stream.pos;
					var quote = stream.next();
					if ((quote == '"' || quote == "'") && consumeQuotedValue(stream, quote)) {
						attrValue = stream.current();
						// strip quotes
						attrValue = attrValue.substring(1, attrValue.length - 1);
					} else if (stream.eatWhile(reWord)) {
						attrValue = stream.current();
					} else {
						throw 'Invalid attribute value';
					}
				}
				
				result.push({
					name: attrName, 
					value: attrValue
				});
				stream.eatSpace();
			} else {
				break;
			}
		}
		
		return result;
	}
	
	/**
	 * Parses tag attributes extracted from abbreviation. If attributes found, 
	 * returns object with <code>element</code> and <code>attributes</code>
	 * properties
	 * @param {String} abbr
	 * @returns {Object} Returns <code>null</code> if no attributes found in 
	 * abbreviation
	 */
	function parseAttributes(abbr) {
		/*
		 * Example of incoming data:
		 * #header
		 * .some.data
		 * .some.data#header
		 * [attr]
		 * #item[attr=Hello other="World"].class
		 */
		var result = [];
		var attrMap = {'#': 'id', '.': 'class'};
		var nameEnd = null;
		
		/** @type StringStream */
		var stream = require('stringStream').create(abbr);
		while (!stream.eol()) {
			switch (stream.peek()) {
				case '#': // id
				case '.': // class
					if (nameEnd === null)
						nameEnd = stream.pos;
					
					var attrName = attrMap[stream.peek()];
					
					stream.next();
					stream.start = stream.pos;
					stream.eatWhile(reWord);
					result.push({
						name: attrName, 
						value: stream.current()
					});
					break;
				case '[': //begin attribute set
					if (nameEnd === null)
						nameEnd = stream.pos;
					
					stream.start = stream.pos;
					if (!stream.skipToPair('[', ']')) 
						throw 'Invalid attribute set definition';
					
					result = result.concat(
						extractAttributes(stripped(stream.current()))
					);
					break;
				default:
					stream.next();
			}
		}
		
		if (!result.length)
			return null;
		
		// optimize attribute set: remove duplicates and merge class attributes
		var lookup = {};
		result = _.filter(result, function(attr) {
			if (!(attr.name in lookup)) {
				return lookup[attr.name] = attr;
			}
			
			if (attr.name.toLowerCase() == 'class') {
				lookup[attr.name].value += ' ' + attr.value;
			} else {
				lookup[attr.name].value = attr.value;
			}
			
			return false;
		});
		
		return {
			element: abbr.substring(0, nameEnd),
			attributes: result
		};
	}
	
	/**
	 * @param {AbbreviationNode} node
	 * @return {AbbreviationNode}
	 */
	function optimizeTree(node) {
		while (node.hasEmptyChildren())
			squash(node);
		
		_.each(node.children, optimizeTree);
		
		return node;
	}
	
	/**
	 * Extract text data from abbreviation: if <code>a{hello}</code> abbreviation
	 * is passed, returns object <code>{element: 'a', text: 'hello'}</code>.
	 * If nothing found, returns <code>null</code>
	 * @param {String} abbr
	 * 
	 */
	function extractText(abbr) {
		if (!~abbr.indexOf('{'))
			return null;
		
		/** @type StringStream */
		var stream = require('stringStream').create(abbr);
		while (!stream.eol()) {
			switch (stream.peek()) {
				case '[':
				case '(':
					stream.skipToPair(stream.peek(), pairs[stream.peek()]); break;
					
				case '{':
					stream.start = stream.pos;
					stream.skipToPair('{', '}');
					return {
						element: abbr.substring(0, stream.start),
						text: stripped(stream.current())
					};
					
				default:
					stream.next();
			}
		}
	}
	
	function isAllowedChar(ch) {
		var charCode = ch.charCodeAt(0);
		var specialChars = '#.*:$-_!@|';
		
		return (charCode > 64 && charCode < 91)       // uppercase letter
				|| (charCode > 96 && charCode < 123)  // lowercase letter
				|| isNumeric(ch)                      // number
				|| specialChars.indexOf(ch) != -1;    // special character
	}
	
	return {
		/**
		 * Parses abbreviation into tree with respect of groups, 
		 * text nodes and attributes. Each node of the tree is a single 
		 * abbreviation. Tree represents actual structure of the outputted 
		 * result
		 * @memberOf abbreviationParser2
		 * @param {String} abbr Abbreviation to parse
		 * @return {AbbreviationNode}
		 */
		parse: function(abbr) {
			var root = new AbbreviationNode;
			var context = root.addChild(), ch;
			
			abbr = require('utils').trim(abbr);
			
			/** @type StringStream */
			var stream = require('stringStream').create(abbr);
			var loopProtector = 500;
			
			while (!stream.eol() && --loopProtector > 0) {
				ch = stream.peek();
				
				switch (ch) {
					case '(': // abbreviation group
						stream.start = stream.pos;
						if (stream.skipToPair('(', ')')) {
							var inner = this.parse(stripped(stream.current()));
							var multiplier = stream.match(/^\*(\d+)?/, true);
							if (multiplier) {
								if (multiplier[1]) {
									context.repeatCount = parseInt(multiplier[1], 10) || 1;
								} else {
									// TODO set implicit repeat count
									context.hasImplicitRepeat = true;
								}
							}
							
							_.each(inner.children, function(child) {
								this.addChild(child);
							}, context);
						} else {
							throw 'Invalid abbreviation: mo matching ")" found for character at ' + stream.pos;
						}
						break;
						
					case '>': // child operator
						context = context.addChild();
						stream.next();
						break;
						
					case '+': // sibling operator
						context = context.parent.addChild();
						stream.next();
						break;
						
					case '^': // climb up operator
						var parent = context.parent || context;
						context = (parent.parent || parent).addChild();
						stream.next();
						break;
						
					default: // consume abbreviation
						stream.start = stream.pos;
						stream.eatWhile(function(c) {
							if (c == '[' || c == '{') {
								if (stream.skipToPair(c, pairs[c])) {
									stream.backUp(1);
									return true;
								}
								
								throw 'Invalid abbreviation: mo matching "' + pairs[c] + '" found for character at ' + stream.pos;
							}
							
							if (c == '+') {
								// let's see if this is an expando marker
								stream.next();
								var isMarker = stream.eol() ||  ~'+>^'.indexOf(stream.peek());
								stream.backUp(1);
								return isMarker;
							}
							
							return c != '(' && isAllowedChar(c);
						});
						
						context.setAbbreviation(stream.current());
						stream.start = stream.pos;
				}
			}
			
			if (loopProtector < 1)
				throw 'Endless loop detected';
			
			return root;
		},
		
		/**
		 * Check if passed symbol is valid symbol for abbreviation expression
		 * @param {String} ch
		 * @return {Boolean}
		 */
		isAllowedChar: function(ch) {
			ch = String(ch); // convert Java object to JS
			return isAllowedChar(ch) || ~'>+^[](){}'.indexOf(ch);
		},
		
		AbbreviationNode: AbbreviationNode,
		optimizeTree: optimizeTree
	};
});