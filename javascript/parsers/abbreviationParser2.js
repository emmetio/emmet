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
	var reValidName = /^[\w\-\$\:@\!]+\+?$/i;
	var reWord = /[\w\-:\$]/;
	
	var pairs = {
		'[': ']',
		'(': ')',
		'{': '}'
	};
	
	var spliceFn = Array.prototype.splice;
	
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
		this.hasImplicitRepeat = false;
		/** Custom data dictionary */
		this._data = {};
		
		// output properties
		this.start = '';
		this.end = '';
		this.content = '';
		this.padding = '';
	}
	
	AbbreviationNode.prototype = {
		/**
		 * Adds passed node as child or creates new child
		 * @param {AbbreviationNode} child
		 * @param {Number} position Index in children array where child chould 
		 * be inserted
		 * @return {AbbreviationNode}
		 */
		addChild: function(child, position) {
			child = child || new AbbreviationNode;
			child.parent = this;
			
			if (_.isUndefined(position)) {
				this.children.push(child);
			} else {
				this.children.splice(position, 0, child);
			}
			
			return child;
		},
		
		/**
		 * Creates a deep copy of current node
		 * @returns {AbbreviationNode}
		 */
		clone: function() {
			var node = new AbbreviationNode();
			var attrs = ['abbreviation', 'counter', 'name', 'text', 'repeatCount', 'hasImplicitRepeat'];
			_.each(attrs, function(a) {
				node[a] = this[a];
			}, this);
			
			// clone attributes
			node.attributes = _.map(this.attributes, function(attr) {
				return _.clone(attr);
			});
			
			node._data = _.clone(this._data);
			
			// clone children
			node.children = _.map(this.children, function(child) {
				child = child.clone();
				child.parent = node;
				return child;
			});
			
			return node;
		},
		
		/**
		 * Removes current node from parent‘s child list
		 * @returns {AbbreviationNode} Current node itself
		 */
		remove: function() {
			if (this.parent) {
				this.parent.children = _.without(this.parent.children, this);
			}
			
			return this;
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
		 * Finds first child node that matches truth test for passed 
		 * <code>fn</code> function
		 * @param {Function} fn
		 * @returns {AbbreviationNode}
		 */
		find: function(fn) {
			var result = null;
			_.find(this.children, function(child) {
				if (fn(child)) {
					return result = child;
				}
				
				return result = child.find(fn);
			});
			
			return result;
		},
		
		/**
		 * Finds all child nodes that matches truth test for passed 
		 * <code>fn</code> function
		 * @param {Function} fn
		 * @returns {Array}
		 */
		findAll: function(fn) {
			var result = [];
			_.each(this.children, function(child) {
				if (fn(child))
					result.push(child);
				
				result = result.concat(child.findAll(fn));
			});
			
			return _.compact(result);
		},
		
		/**
		 * Sets/gets custom data
		 * @param {String} name
		 * @param {Object} value
		 * @returns {Object}
		 */
		data: function(name, value) {
			if (arguments.length == 2)
				this._data[name] = value;
			
			return this._data[name];
		},
		
		/**
		 * Sets how many times current element should be repeated
		 * @private
		 */
		_setRepeat: function(count) {
			if (count) {
				this.repeatCount = parseInt(count, 10) || 1;
			} else {
				this.hasImplicitRepeat = true;
			}
		},
		
		/**
		 * Sets abbreviation that belongs to current node
		 * @param {String} abbr
		 */
		setAbbreviation: function(abbr) {
			abbr = abbr || '';
			
			var that = this;
			
			// find multiplier
			abbr = abbr.replace(/\*(\d+)?$/, function(str, repeatCount) {
				that._setRepeat(repeatCount);
				return '';
			});
			
			this.abbreviation = abbr;
			
			var abbrText = extractText(abbr);
			if (abbrText) {
				abbr = abbrText.element;
				this.text = abbrText.text;
			}
			
			var abbrAttrs = parseAttributes(abbr);
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
		 * Check if current node has implied name that should be resolved
		 * @returns {Boolean}
		 */
		hasImplicitName: function() {
			return !this.name && this.attributes.length;
		},
		
		/**
		 * Indicates that current element is a grouping one, e.g. has no 
		 * representation but serves as a container for other nodes
		 * @returns {Boolean}
		 */
		isGroup: function() {
			return !this.abbreviation;
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
		 * Indicates that current node should be repeated
		 * @returns {Boolean}
		 */
		isRepeating: function() {
			return this.repeatCount > 1 || this.hasImplicitRepeat;
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
		 * Returns latest and deepest child of current tree
		 * @returns {AbbreviationNode}
		 */
		deepestChild: function() {
			if (!this.children.length)
				return null;
				
			var deepestChild = this;
			while (deepestChild.children.length) {
				deepestChild = _.last(deepestChild.children);
			}
			
			return deepestChild;
		}
	};
	
	/**
	 * Returns stripped string: a string without first and last character
	 * @param {String} str
	 * @returns {String}
	 */
	function stripped(str) {
		return str.substring(1, str.length - 1);
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
			if (n.isGroup()) {
				spliceFn.apply(node.children, [i, 1].concat(n.children));
			} else if (n.isEmpty()) {
				n.remove();
			}
		}
		
		_.each(node.children, squash);
		
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
	 * Parses abbreviation into a tree
	 * @param {String} abbr
	 * @returns {AbbreviationNode}
	 */
	function parseAbbreviation(abbr) {
		abbr = require('utils').trim(abbr);
		
		var root = new AbbreviationNode;
		var context = root.addChild(), ch;
		
		/** @type StringStream */
		var stream = require('stringStream').create(abbr);
		var loopProtector = 1000, multiplier;
		
		while (!stream.eol() && --loopProtector > 0) {
			ch = stream.peek();
			
			switch (ch) {
				case '(': // abbreviation group
					stream.start = stream.pos;
					if (stream.skipToPair('(', ')')) {
						var inner = parseAbbreviation(stripped(stream.current()));
						if (multiplier = stream.match(/^\*(\d+)?/, true)) {
							context._setRepeat(multiplier[1]);
						}
						
						_.each(inner.children, function(child) {
							context.addChild(child);
						});
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
							var isMarker = stream.eol() ||  ~'+>^*'.indexOf(stream.peek());
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
	
	/**
	 * “Un-rolls“ contents of current node: recursively replaces all repeating 
	 * children with their repeated clones
	 * @param {AbbreviationNode} node
	 * @returns {AbbreviationNode}
	 */
	function unroll(node) {
		for (var i = node.children.length - 1, j, child; i >= 0; i--) {
			child = node.children[i];
			
			if (child.isRepeating()) {
				j = child.repeatCount;
				child.repeatCount = 1;
				child.updateProperty('counter', 1);
				while (--j > 0) {
					child.parent.addChild(child.clone(), i + 1)
						.updateProperty('counter', j + 1);
				}
			}
		}
		
		// to keep proper 'counter' property, we need to walk
		// on children once again
		_.each(node.children, unroll);
		
		return node;
	}
	
	/**
	 * Inserts special content that should be outputted inside implicilty
	 * repeated elements
	 * @param {AbbreviationNode} tree
	 * @param {String} content
	 */
	function pasteContent(tree, content) {
		
	}
	
	function isAllowedChar(ch) {
		var charCode = ch.charCodeAt(0);
		var specialChars = '#.*:$-_!@|';
		
		return (charCode > 64 && charCode < 91)       // uppercase letter
				|| (charCode > 96 && charCode < 123)  // lowercase letter
				|| (charCode > 47 && charCode < 58)   // number
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
		 * @param {String} content Content that should be pasted inside 
		 * implicitly repeated elements (used in “Wrap with abbreviation” action)
		 * 
		 * @return {AbbreviationNode}
		 */
		parse: function(abbr, content) {
			var tree = parseAbbreviation(abbr);
			
			if (content) {
				var lines = require('utils').splitByLines(content, true);
				// set repeat count for implicitly repeated elements before
				// tree is unrolled
				var targets = tree.findAll(function(item) {
					if (item.hasImplicitRepeat)
						return item.repeatCount = lines.length;
				});
				
				tree = unroll(tree);
				
				// now, put one line of content on each repeated elements
				if (targets.length) {
					_.each(targets, function(item) {
						var children = item.parent.children;
						var ix = _.indexOf(children, item);
						_.each(_.range(ix, ix + lines.length), function(i, j) {
							children[i].data('paste', lines[j]);
						});
					});
				} else {
					// no implicitly repeated elements, put pasted content in
					// the deepest child
					var deepest = tree.deepestChild();
					if (deepest)
						deepest.data('paste', content);
				}
				
			} else {
				tree = unroll(tree);
			}
			
			return squash(tree);
		},
		
		/**
		 * Check if passed symbol is valid symbol for abbreviation expression
		 * @param {String} ch
		 * @return {Boolean}
		 */
		isAllowedChar: function(ch) {
			ch = String(ch); // convert Java object to JS
			return isAllowedChar(ch) || ~'>+^[](){}'.indexOf(ch);
		}
	};
});