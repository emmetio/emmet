/**
 * Class that parses abbreviation into tree with respect of groups, attributes
 * and text nodes
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "zen_coding.js"
 */var zen_parser = (function(){
	
	/**
	 * @class
	 */
	function TreeNode(parent) {
		this.expr = '';
		this.parent = null;
		this.children = [];
		this.count = 1;
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
		 * Sets abbreviation that belongs to current node
		 * @param {String} abbr
		 */
		setAbbreviation: function(abbr) {
			var m = abbr.match(/\*(\d+)?$/);
			if (m) {
				this.count = parseInt(m[1] || 1, 10);
				this.is_repeating = !m[1];
				this.expr = abbr.substr(0, abbr.length - m[0].length);
			} else {
				this.expr = abbr;
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
			var result = zen_coding.repeatString('-', level)
//				+ (this.expr ? this.expr + ' (' + this.count + '|' + this.is_repeating + ')' : '(empty)') 
				+ (this.expr || '(empty)') 
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
			return !this.expr;
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
		}
		
	}
})();