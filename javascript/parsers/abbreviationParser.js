/**
 * Zen Coding abbreviation parser. This module is designed to be stand-alone
 * (e.g. without any dependencies) so authors can copy this file into their
 * projects
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * @memberOf __abbreviationParser
 * @constructor
 */zen_coding.define('abbreviationParser', function(require, _) {
	var reValidName = /^[\w\d\-_\$\:@!]+\+?$/i;
	
	/**
	 * @type TreeNode
	 */
	function TreeNode(parent) {
		this.abbreviation = '';
		/** @type {TreeNode} */
		this.parent = null;
		this.children = [];
		this.count = 1;
		this.name = null;
		this.text = null;
		this.attributes = [];
		this.is_repeating = false;
		this.has_implict_name = false;
	}
	
	TreeNode.prototype = {
		/**
		 * Adds passed or creates new child
		 * @param {TreeNode} [child]
		 * @return {TreeNode}
		 */
		addChild: function(child) {
			child = child || new TreeNode;
			child.parent = this;
			this.children.push(child);
			return child;
		},
		
		/**
		 * Replace current node in parent's child list with another node
		 * @param {TreeNode} node
		 */
		replace: function(node) {
			if (this.parent) {
				var children = this.parent.children;
				for (var i = 0, il = children.length; i < il; i++) {
					if (children[i] === this) {
						children[i] = node;
						this.parent = null;
						return;
					}
				}
			}
		},
		
		/**
		 * Sets abbreviation that belongs to current node
		 * @param {String} abbr
		 */
		setAbbreviation: function(abbr) {
			this.abbreviation = abbr;
			var m = abbr.match(/\*(\d+)?$/);
			if (m) {
				this.count = parseInt(m[1] || 1, 10);
				this.is_repeating = !m[1];
				abbr = abbr.substr(0, abbr.length - m[0].length);
			}
			
			if (abbr) {
				var name_text = splitExpression(abbr);
				var name = name_text[0];
				if (name_text.length == 2)
					this.text = name_text[1];
					
				if (name) {
					var attr_result = parseAttributes(name);
					this.name = attr_result[0] || '';
					this.has_implict_name = !attr_result[0];
					this.attributes = attr_result[1];
				}
			}
			
			// validate name
			if (this.name && !reValidName.test(this.name)) {
				throw new Error('InvalidAbbreviation');
			}
		},
		
		/**
		 * @return {String}
		 */
		getAbbreviation: function() {
			return this.expr;
		},
		
		/**
		 * Dump current tree node into a foramtted string
		 * @return {String}
		 */
		toString: function(level) {
			level = level || 0;
			var output = '(empty)';
			if (this.abbreviation) {
				output = '';
				if (this.name)
					output = this.name;
					
				if (this.text !== null)
					output += (output ? ' ' : '') + '{text: "' + this.text + '"}';
					
				if (this.attributes.length) {
					var attrs = [];
					for (var i = 0, il = this.attributes.length; i < il; i++) {
						attrs.push(this.attributes[i].name + '="' + this.attributes[i].value + '"'); 
					}
					output += ' [' + attrs.join(', ') + ']';
				}
			}
			var result = require('utils').repeatString('-', level)
				+ output 
				+ '\n';
			for (var i = 0, il = this.children.length; i < il; i++) {
				result += this.children[i].toString(level + 1);
			}
			
			return result;
		},
		
		/**
		 * Check if current node contains children with empty <code>expr</code>
		 * property
		 * @return {Boolean}
		 */
		hasEmptyChildren: function() {
			for (var i = 0, il = this.children.length; i < il; i++) {
				if (this.children[i].isEmpty())
					return true;
			}
			
			return false;
		},
		
		/**
		 * Indicates empty node (i.e. without abbreviation). It may be a 
		 * grouping node and should not be outputted
		 * @return {Boolean}
		 */
		isEmpty: function() {
			return !this.abbreviation;
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
			for (var i = 0, il = this.attributes.length; i < il; i++) {
				if (this.attributes[i].name == name)
					return this.attributes[i].value;
			}
			
			return null;
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
	 * @param {TreeNode} node
	 * @return {TreeNode}
	 */
	function squash(node) {
		for (var i = node.children.length - 1; i >=0; i--) {
			/** @type {TreeNode} */
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
	
	/**
	 * Trim whitespace from string
	 * @param {String} text
	 * @return {String}
	 */
	function trim(text) {
		return (text || "").replace( /^\s+|\s+$/g, "" );
	}
	
	/**
	 * Get word, starting at <code>ix</code> character of <code>str</code>
	 */
	function getWord(ix, str) {
		var m = str.substring(ix).match(/^[\w\-:\$]+/);
		return m ? m[0] : '';
	}
	
	/**
	 * Extract attributes and their values from attribute set 
	 * @param {String} attrSet
	 */
	function extractAttributes(attrSet) {
		attrSet = trim(attrSet);
		var loopCount = 1000; // endless loop protection
		var reString = /^(["'])((?:(?!\1)[^\\]|\\.)*)\1/;
		var result = [];
		var attr;
			
		while (attrSet && loopCount--) {
			var attrName = getWord(0, attrSet);
			attr = null;
			if (attrName) {
				attr = {name: attrName, value: ''};
				// let's see if attribute has value
				var ch = attrSet.charAt(attrName.length);
				switch (ch) {
					case '=':
						var ch2 = attrSet.charAt(attrName.length + 1);
						if (ch2 == '"' || ch2 == "'") {
							// we have a quoted string
							var m = attrSet.substring(attrName.length + 1).match(reString);
							if (m) {
								attr.value = m[2];
								attrSet = trim(attrSet.substring(attrName.length + m[0].length + 1));
							} else {
								// something wrong, break loop
								attrSet = '';
							}
						} else {
							// unquoted string
							var m = attrSet.substring(attrName.length + 1).match(/(.+?)(\s|$)/);
							if (m) {
								attr.value = m[1];
								attrSet = trim(attrSet.substring(attrName.length + m[1].length + 1));
							} else {
								// something wrong, break loop
								attrSet = '';
							}
						}
						break;
					default:
						attrSet = trim(attrSet.substring(attrName.length));
						break;
				}
			} else {
				// something wrong, can't extract attribute name
				break;
			}
			
			if (attr) result.push(attr);
		}
		return result;
	}
	
	/**
	 * Parses tag attributes extracted from abbreviation
	 * @param {String} str
	 */
	function parseAttributes(str) {
		/*
		 * Example of incoming data:
		 * #header
		 * .some.data
		 * .some.data#header
		 * [attr]
		 * #item[attr=Hello other="World"].class
		 */
		var result = [];
		var name = '';
		var collectName = true;
		var className = null;
		var charMap = {'#': 'id', '.': 'class'};
		
		// walk char-by-char
		var i = 0;
		var il = str.length;
		var val;
			
		while (i < il) {
			var ch = str.charAt(i);
			switch (ch) {
				case '#': // id
					val = getWord(i, str.substring(1));
					result.push({name: charMap[ch], value: val});
					i += val.length + 1;
					collectName = false;
					break;
				case '.': // class
					val = getWord(i, str.substring(1));
					if (!className) {
						// remember object pointer for value modification
						className = {name: charMap[ch], value: ''};
						result.push(className);
					}
					
					className.value += (className.value ? ' ' : '') + val;
					i += val.length + 1;
					collectName = false;
					break;
				case '[': //begin attribute set
					// search for end of set
					var endIx = str.indexOf(']', i);
					if (endIx == -1) {
						// invalid attribute set, stop searching
						i = str.length;
					} else {
						var attrs = extractAttributes(str.substring(i + 1, endIx));
						for (var j = 0, jl = attrs.length; j < jl; j++) {
							result.push(attrs[j]);
						}
						i = endIx;
					}
					collectName = false;
					break;
				default:
					if (collectName)
						name += ch;
					i++;
			}
		}
		
		return [name, result];
	}
	
	/**
	 * @param {TreeNode} node
	 * @return {TreeNode}
	 */
	function optimizeTree(node) {
		while (node.hasEmptyChildren())
			squash(node);
			
		for (var i = 0, il = node.children.length; i < il; i++) {
			optimizeTree(node.children[i]);
		}
		
		return node;
	}
	
	/**
	 * Split expression by node name and its content, if exists. E.g. if we pass
	 * <code>a{Text}</code> expression, it will be splitted into <code>a</code>
	 * and <code>Text</code>
	 * @param {String} expr
	 * @return {Array} Result with one or two elements (if expression contains
	 * text node)
	 */
	function splitExpression(expr) {
		// fast test on text node
		if (expr.indexOf('{') == -1)
			return [expr];
			
		var attrLvl = 0;
		var textLvl = 0;
		var braceStack = [];
		var i = 0;
		var il = expr.length;
		var ch;
			
		while (i < il) {
			ch = expr.charAt(i);
			switch (ch) {
				case '[':
					if (!textLvl)
						attrLvl++;
					break;
				case ']':
					if (!textLvl)
						attrLvl--;
					break;
				case '{':
					if (!attrLvl) {
						textLvl++;
						braceStack.push(i);
					}
					break;
				case '}':
					if (!attrLvl) {
						textLvl--;
						var brace_start = braceStack.pop();
						if (textLvl === 0) {
							// found braces bounds
							return [
								expr.substring(0, brace_start),
								expr.substring(brace_start + 1, i)
							];
						}
					}
					break;
			}
			i++;
		}
		
		// if we are here, then no valid text node found
		return [expr];
	}
	
	
	return {
		/**
		 * Parses abbreviation into tree with respect of groups, 
		 * text nodes and attributes. Each node of the tree is a single 
		 * abbreviation. Tree represents actual structure of the outputted 
		 * result
		 * @memberOf abbreviationParser
		 * @param {String} abbr Abbreviation to parse
		 * @return {TreeNode}
		 */
		parse: function(abbr) {
			var root = new TreeNode;
			var context = root.addChild();
			var i = 0;
			var il = abbr.length;
			var textLvl = 0;
			var attrLvl = 0;
			var groupStack = [root];
			var ch, prevCh, token = '';
				
			groupStack.last = function() {
				return this[this.length - 1];
			};
			
			var dumpToken = function() {
				if (token)
					context.setAbbreviation(token);
				token = '';
			};
				
			while (i < il) {
				ch = abbr.charAt(i);
				prevCh = i ? abbr.charAt(i - 1) : '';
				switch (ch) {
					case '{':
						if (!attrLvl)
							textLvl++;
						token += ch;
						break;
					case '}':
						if (!attrLvl)
							textLvl--;
						token += ch;
						break;
					case '[':
						if (!textLvl)
							attrLvl++;
						token += ch;
						break;
					case ']':
						if (!textLvl)
							attrLvl--;
						token += ch;
						break;
					case '(':
						if (!textLvl && !attrLvl) {
							// beginning of the new group
							dumpToken();
							
							if (prevCh != '+' && prevCh != '>') {
								// previous char is not an operator, assume it's
								// a sibling
								context = context.parent.addChild();
							}
							
							groupStack.push(context);
							context = context.addChild();
						} else {
							token += ch;
						}
						break;
					case ')':
						if (!textLvl && !attrLvl) {
							// end of the group, pop stack
							dumpToken();
							context = groupStack.pop();
							
							if (i < il - 1 && abbr.charAt(i + 1) == '*') {
								// group multiplication
								var group_mul = '', n_ch;
								for (var j = i + 2; j < il; j++) {
									n_ch = abbr.charAt(j);
									if (isNumeric(n_ch))
										group_mul += n_ch;
									else 
										break;
								}
								
								i += group_mul.length + 1;
								group_mul = parseInt(group_mul || 1, 10);
								while (1 < group_mul--)
									context.parent.addChild(context);
//									last_parent.addChild(cur_item);
							}
							
						} else {
							token += ch;
						}
						break;
					case '+': // sibling operator
						if (!textLvl && !attrLvl && i != il - 1 /* expando? */) {
							dumpToken();
							context = context.parent.addChild();
						} else {
							token += ch;
						}
						break;
					case '>': // child operator
						if (!textLvl && !attrLvl) {
							dumpToken();
							context = context.addChild();
						} else {
							token += ch;
						}
						break;
					default:
						token += ch;
				}
				
				i++;
			}
			// put the final token
			dumpToken();
			
			return optimizeTree(root);
		},
		
		/**
		 * Check if passed symbol is valid symbol for abbreviation expression
		 * @param {String} ch
		 * @return {Boolean}
		 */
		isAllowedChar: function(ch) {
			ch = String(ch); // convert Java object to JS
			var charCode = ch.charCodeAt(0);
			var specialChars = '#.>+*:$-_!@[]()|';
			
			return (charCode > 64 && charCode < 91)       // uppercase letter
					|| (charCode > 96 && charCode < 123)  // lowercase letter
					|| isNumeric(ch)                 // number
					|| specialChars.indexOf(ch) != -1;    // special character
		},
		
		TreeNode: TreeNode,
		optimizeTree: optimizeTree
	};
});