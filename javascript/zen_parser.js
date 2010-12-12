/**
 * Class that parses abbreviation into tree with respect of groups, attributes
 * and text nodes
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "zen_coding.js"
 */var zen_parser = (function(){
	
	var re_valid_name = /^[\w\d\-_\$\:@!]+\+?$/i;
	
	/**
	 * @class
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
						var old_node = children[i];
						children[i] = node;
						old_node = old_node.parent = null;
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
					this.name = attr_result[0] || 'div';
					this.attributes = attr_result[1];
				}
			}
			
			// validate name
			if (this.name && !re_valid_name.test(this.name)) {
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
			var result = zen_coding.repeatString('-', level)
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
	 * @param {String} attr_set
	 */
	function extractAttributes(attr_set) {
		attr_set = trim(attr_set);
		var loop_count = 100, // endless loop protection
			re_string = /^(["'])((?:(?!\1)[^\\]|\\.)*)\1/,
			result = [],
			attr;
			
		while (attr_set && loop_count--) {
			var attr_name = getWord(0, attr_set);
			attr = null;
			if (attr_name) {
				attr = {name: attr_name, value: ''};
//				result[attr_name] = '';
				// let's see if attribute has value
				var ch = attr_set.charAt(attr_name.length);
				switch (ch) {
					case '=':
						var ch2 = attr_set.charAt(attr_name.length + 1);
						if (ch2 == '"' || ch2 == "'") {
							// we have a quoted string
							var m = attr_set.substring(attr_name.length + 1).match(re_string);
							if (m) {
								attr.value = m[2];
								attr_set = trim(attr_set.substring(attr_name.length + m[0].length + 1));
							} else {
								// something wrong, break loop
								attr_set = '';
							}
						} else {
							// unquoted string
							var m = attr_set.substring(attr_name.length + 1).match(/(.+?)(\s|$)/);
							if (m) {
								attr.value = m[1];
								attr_set = trim(attr_set.substring(attr_name.length + m[1].length + 1));
							} else {
								// something wrong, break loop
								attr_set = '';
							}
						}
						break;
					default:
						attr_set = trim(attr_set.substring(attr_name.length));
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
		var result = [],
			name = '',
			collect_name = true,
			class_name,
			char_map = {'#': 'id', '.': 'class'};
		
		// walk char-by-char
		var i = 0,
			il = str.length,
			val;
			
		while (i < il) {
			var ch = str.charAt(i);
			switch (ch) {
				case '#': // id
					val = getWord(i, str.substring(1));
					result.push({name: char_map[ch], value: val});
					i += val.length + 1;
					collect_name = false;
					break;
				case '.': // class
					val = getWord(i, str.substring(1));
					if (!class_name) {
						// remember object pointer for value modification
						class_name = {name: char_map[ch], value: ''};
						result.push(class_name);
					}
					
					class_name.value += ((class_name.value) ? ' ' : '') + val;
					i += val.length + 1;
					collect_name = false;
					break;
				case '[': //begin attribute set
					// search for end of set
					var end_ix = str.indexOf(']', i);
					if (end_ix == -1) {
						// invalid attribute set, stop searching
						i = str.length;
					} else {
						var attrs = extractAttributes(str.substring(i + 1, end_ix));
						for (var j = 0, jl = attrs.length; j < jl; j++) {
							result.push(attrs[j]);
						}
						i = end_ix;
					}
					collect_name = false;
					break;
				default:
					if (collect_name)
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
			
		var attr_lvl = 0,
			text_lvl = 0,
			brace_stack = [],
			i = 0,
			il = expr.length,
			ch;
			
		while (i < il) {
			ch = expr.charAt(i);
			switch (ch) {
				case '[':
					if (!text_lvl)
						attr_lvl++;
					break;
				case ']':
					if (!text_lvl)
						attr_lvl--;
					break;
				case '{':
					if (!attr_lvl) {
						text_lvl++;
						brace_stack.push(i);
					}
					break;
				case '}':
					if (!attr_lvl) {
						text_lvl--;
						var brace_start = brace_stack.pop();
						if (text_lvl === 0) {
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
		 * @param {String} abbr Abbreviation to parse
		 * @return {TreeNode}
		 */
		parse: function(abbr) {
			var root = new TreeNode,
				context = root.addChild(),
				i = 0,
				il = abbr.length,
				text_lvl = 0,
				attr_lvl = 0,
				group_lvl = 0,
				group_stack = [root],
				ch, prev_ch,
				token = '';
				
			group_stack.last = function() {
				return this[this.length - 1];
			};
			
			var dumpToken = function() {
				if (token)
					context.setAbbreviation(token);
				token = '';
			};
				
			while (i < il) {
				ch = abbr.charAt(i);
				prev_ch = i ? abbr.charAt(i - 1) : '';
				switch (ch) {
					case '{':
						if (!attr_lvl)
							text_lvl++;
						token += ch;
						break;
					case '}':
						if (!attr_lvl)
							text_lvl--;
						token += ch;
						break;
					case '[':
						if (!text_lvl)
							attr_lvl++;
						token += ch;
						break;
					case ']':
						if (!text_lvl)
							attr_lvl--;
						token += ch;
						break;
					case '(':
						if (!text_lvl && !attr_lvl) {
							// beginning of the new group
							dumpToken();
							
							if (prev_ch != '+' && prev_ch != '>') {
								// previous char is not an operator, assume it's
								// a sibling
								context = context.parent.addChild();
							}
							
							group_stack.push(context);
							context = context.addChild();
						} else {
							token += ch;
						}
						break;
					case ')':
						if (!text_lvl && !attr_lvl) {
							// end of the group, pop stack
							dumpToken();
							context = group_stack.pop();
							
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
						if (!text_lvl && !attr_lvl && i != il - 1 /* expando? */) {
							dumpToken();
							context = context.parent.addChild();
						} else {
							token += ch;
						}
						break;
					case '>': // child operator
						if (!text_lvl && !attr_lvl) {
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
		
		TreeNode: TreeNode,
		optimizeTree: optimizeTree
	}
})();