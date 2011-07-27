/**
 * Tools for filling vendor-prefixed properties inside CSS rule
 * 
 * @include "parserutils.js"
 */
 var zen_vendor_prefixes = (function(){
 	
 	/**
	 * Find value token, staring at <code>pos</code> index and moving right
	 * TODO: refactor, should be single method across actions.js and this module
	 * @param {Array} tokens
	 * @param {Number} pos
	 * @return {ParserUtils.token}
	 */
	function findValueToken(tokens, pos) {
		for (var i = pos, il = tokens.length; i < il; i++) {
			var t = tokens[i];
			if (t.type == 'value')
				return t;
			else if (t.type == 'identifier' || t.type == ';')
				break;
		}
		
		return null;
	}
 	
 	function TreeNode(token) {
 		this.start_token = token;
 		this.end_token = null;
 		
 		this.children = [];
 		this.properties = [];
 		
 		this.parent = null;
 		this.next_sibling = null;
 		this.prev_sibling = null;
 	}
 	
 	TreeNode.prototype = {
 		/**
 		 * @param {ParserUtils.token} token
 		 * @returns TreeNode
 		 */
 		addChild: function(token) {
 			var child = new TreeNode(token),
 				/** @type TreeNode */
 				last_child = this.children[this.children.length - 1];
 				
 			child.parent = this;
 			if (last_child) {
 				last_child.next_sibling = child;
 				child.prev_sibling = last_child;
 			}
 			
 			this.children.push(child);
 			return child;
 		},
 		
 		/**
 		 * Adds CSS property name and value into current section
 		 * @param {ParserUtils.token} name_token
 		 * @param {ParserUtils.token} value_token
 		 */
 		addProperty: function(name_token, value_token) {
 			this.properties.push({
 				name: name_token ? name_token.content : null,
 				value: value_token ? value_token.content : null,
 				name_token: name_token,
 				value_token: value_token
 			});
 		}
 	};
 	
 	return {
	 	/**
	 	 * Parses content of CSS file into some sort of syntax tree for faster 
	 	 * search and lookups
	 	 * @param {String} text CSS stylesheet
	 	 */
 		parseIntoTree: function(text) {
	 		var tokens = ParserUtils.parseCSS(text),
	 			tree = new TreeNode(),
	 			/** @type ParserUtils.token */
	 			cur_node = tree;
	 			
	 		for (var i = 0, il = tokens.length; i < il; i++) {
	 			/** @type ParserUtils.token */
	 			var token = tokens[i];
	 			switch (token.type) {
	 				case '{': // rule/section start
	 					cur_node = cur_node.addChild(token);
	 					break;
	 				case '}': // rule/section end
	 					cur_node.end_token = token;
	 					cur_node = cur_node.parent;
	 					break;
	 				case 'identifier': // CSS property
		 				if (cur_node) {
		 					cur_node.addProperty(token, findValueToken(tokens, i + 1));
		 				}
	 					break;
	 			}
	 		}
	 		
	 		return tree;
	 	}
 	}
 })();