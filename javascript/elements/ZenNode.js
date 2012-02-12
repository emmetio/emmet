/**
 * <code>ZenNode</code> — an element in final transformation process which will 
 * be used to generate output
 * @author Sergey Chikuyonok (serge.che@gmail.com) <http://chikuyonok.ru>
 */
(function(){
	/**
	 * Test if text contains output placeholder $#
	 * @param {String} text
	 * @return {Boolean}
	 */
	function hasOutputPlaceholder(text) {
		for (var i = 0, il = text.length; i < il; i++) {
			var ch = text.charAt(i);
			if (ch == '\\') { // escaped char
				i++;
				continue;
			} else if (ch == '$' && text.charAt(i + 1) == '#') {
				return true;
			}
		}
		
		return false;
	}
	
	/**
	 * Creates simplified tag from Zen Coding tag
	 * @param {ParsedElement} elem
	 */
	function ZenNode(elem) {
		var elems = zen_coding.require('elements');
		
		this.type = elems.is(elem, 'parsedSnippet') ? 'snippet' : 'tag';
		this.children = [];
		this.counter = 1;
		
		// copy attributes
		_.each('name,real_name,is_repeating,repeat_by_lines,has_implicit_name'.split(','), function(p) {
			this[p] = elem[p];
		}, this);
		
		// create deep copy of attribute list so we can change
		// their values in runtime without affecting other nodes
		// created from the same tag
		this.attributes = _.map(elem.attributes, function(a) {
			return _.clone(a);
		});
		
		/** @type {ParsedElement} Source element from which current tag was created */
		this.source = elem;
		
		// relations
		/** @type {ZenNode} */
		this.parent = null;
		/** @type {ZenNode} */
		this.nextSibling = null;
		/** @type {ZenNode} */
		this.previousSibling = null;
		
		// output params
		this.start = '';
		this.end = '';
		this.content = elem.getContent() || '';
		this.padding = '';
	}
	
	ZenNode.prototype = {
		/**
		 * Add child node
		 * @param {ZenNode} tag
		 */
		addChild: function(node) {
			node.parent = this;
			
			// check for implicit name
			if (node.has_implicit_name && this.isInline())
				node.name = 'span';
			
			var lastChild = _.last(this.children);
			if (lastChild) {
				node.previousSibling = lastChild;
				lastChild.nextSibling = node;
			}
			
			this.children.push(node);
		},
		
		/**
		 * Returns attribute object
		 * @private
		 * @param {String} name Attribute name
		 */
		_getAttr: function(name) {
			name = name.toLowerCase();
			return _.find(this.attributes, function(a) {
				return a.name.toLowerCase() == name;
			});
		},
		
		/**
		 * Get attribute's value.
		 * @param {String} name
		 * @return {String} Returns <code>null</code> if attribute wasn't found
		 */
		getAttribute: function(name) {
			var _ = zen_coding.require('_');
			var attr = this._getAttr(name);
			return _.isUndefined(attr) ? null : attr.value;
		},
		
		/**
		 * Set attribute's value.
		 * @param {String} name
		 * @param {String} value
		 */
		setAttribute: function(name, value) {
			var attr = this._getAttr(name);
			if (attr)
				attr.value = value;
		},
		
		/**
		 * Test if current tag is unary (no closing tag)
		 * @return {Boolean}
		 */
		isUnary: function() {
			if (this.type == 'snippet')
				return false;
				
			return (this.source._abbr && this.source._abbr.is_empty) 
				|| zen_coding.require('resources').isItemInCollection(this.source.syntax, 'empty', this.name);
		},
		
		/**
		 * Test if current tag is inline-level (like &lt;strong&gt;, &lt;img&gt;)
		 * @return {Boolean}
		 */
		isInline: function() {
			return this.type == 'text' || !this.source.name
				|| zen_coding.require('resources').isItemInCollection(this.source.syntax, 'inline_level', this.name);
		},
		
		/**
		 * Test if current element is block-level
		 * @return {Boolean}
		 */
		isBlock: function() {
			return this.type == 'snippet' || !this.isInline();
		},
		
		/**
		 * This function tests if current tags' content contains xHTML tags. 
		 * This function is mostly used for output formatting
		 */
		hasTagsInContent: function() {
			return zen_coding.require('utils').matchesTag(this.content);
		},
		
		/**
		 * Check if tag has child elements
		 * @return {Boolean}
		 */
		hasChildren: function() {
			return !!this.children.length;
		},
		
		/**
		 * Test if current tag contains block-level children
		 * @return {Boolean}
		 */
		hasBlockChildren: function() {
			return (this.hasTagsInContent() && this.isBlock()) 
				|| _.any(this.children, function(child) {
					return child.isBlock();
				});
		},
		
		/**
		 * Search for deepest and latest child of current element
		 * @return {ZenNode} Returns <code>null</code> if there's no children
		 */
		findDeepestChild: function() {
			if (!this.children.length)
				return null;
				
			var deepestChild = this;
			while (deepestChild.children.length) {
				deepestChild = _.last(deepestChild.children);
			}
			
			return deepestChild;
		},
		
		/**
		 * Returns string output for current node
		 * @return {String}
		 */
		toString: function() {
			var innerContent = _.map(this.children, function(child) {
				return child.toString();
			}).join('');
			
			return this.start + this.content + innerContent + this.end;
		},
		
		/**
		 * Test if current element contains output placeholder (aka $#)
		 * @return {Boolean}
		 */
		hasOutputPlaceholder: function() {
			if (hasOutputPlaceholder(this.content)) {
				return true;
			} else {
				// search inside attributes
				for (var i = 0, il = this.attributes.length; i < il; i++) {
					if (hasOutputPlaceholder(this.attributes[i].value))
						return true;
				}
			}
			
			return false;
		},
		
		/**
		 * Recursively search for elements with output placeholders (aka $#)
		 * inside current element (not included in result)
		 * @param {Array} receiver
		 * @return {Array} Array of elements with output placeholders.  
		 */
		findElementsWithOutputPlaceholder: function(receiver) {
			receiver = receiver || [];
			_.each(this.children, function(child) {
				if (child.hasOutputPlaceholder()) {
					receiver.push(child);
				}
				child.findElementsWithOutputPlaceholder(receiver);
			});
			
			return receiver;
		},
		
		/**
		 * Paste content in context of current node. Pasting is a special case
		 * of recursive adding content in node. 
		 * This function will try to find $# placeholder inside node's 
		 * attributes and text content and replace in with <code>text</code>.
		 * If it doesn't find $# placeholder, it will put <code>text</code>
		 * value as the deepest child content
		 * @param {String} text Text to paste
		 */
		pasteContent: function(text) {
			var symbol = '$#';
			var r = [symbol, text];
			var replaceFn = function() {return r;};
			var utils = zen_coding.require('utils');
			/** @type {ZenNode[]} */
			var items = [];
				
			if (this.hasOutputPlaceholder())
				items.push(this);
				
			items = items.concat(this.findElementsWithOutputPlaceholder());
			
			if (items.length) {
				_.each(items, function(item){
					item.content = utils.replaceUnescapedSymbol(item.content, symbol, replaceFn);
					_.each(item.attributes, function(a) {
						a.value = utils.replaceUnescapedSymbol(a.value, symbol, replaceFn);
					});
				});
			} else {
				// no placeholders found, add content to the deepest child
				var child = this.findDeepestChild() || this;
				child.content += text;
			}
		}
	};
	
	var elems = zen_coding.require('elements');
	elems.add('ZenNode', function(elem) {
		return new ZenNode(elem);
	});
})();