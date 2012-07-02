/**
 * <code>ZenNode</code> — an element in final transformation process which will 
 * be used to generate output
 * @author Sergey Chikuyonok (serge.che@gmail.com) <http://chikuyonok.ru>
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.exec(function(require, _) {
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
	 * Creates simplified element from parsed tree
	 * @param {ParsedElement} elem
	 */
	function ZenNode(elem, options) {
		var elems = require('elements');
		
		this.nodeType = elems.is(elem, 'parsedSnippet') ? 'snippet' : 'element';
		this.children = [];
		this.counter = elem.counter;
		this.options = _.extend({}, elem.options, options || {});
		
		// copy attributes
		_.each('name,real_name,is_repeating,repeat_by_lines,has_implicit_name,groupNumber'.split(','), function(p) {
			this[p] = elem[p];
		}, this);
		
		// create deep copy of attribute list so we can change
		// their values in runtime without affecting other nodes
		// created from the same element
		this.attributes = _.map(elem.attributes, function(a) {
			return _.clone(a);
		});
		
		/** @type {ParsedElement} Source element from which current element was created */
		this.source = elem;
		
		/** @type String Name of current node */
		this.name = elem.name;
		
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
		 * @param {ZenNode} node
		 */
		addChild: function(node) {
			node.parent = this;
			
			// check for implicit name
//			if (node.has_implicit_name && this.source.name && this.isInline()) {
//				node.name = 'span';
//			}
			
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
		 * Test if current element is unary (no closing tag)
		 * @return {Boolean}
		 */
		isUnary: function() {
			if (this.nodeType == 'snippet')
				return false;
				
			return (this.source._abbr && this.source._abbr.is_empty) 
				|| require('tagName').isEmptyElement(this.name);
		},
		
		/**
		 * Test if current element is inline-level (like &lt;strong&gt;, &lt;img&gt;)
		 * @return {Boolean}
		 */
		isInline: function() {
			return this.nodeType == 'text' || !this.name
				|| require('tagName').isInlineLevel(this.name);
		},
		
		/**
		 * Test if current element is block-level
		 * @return {Boolean}
		 */
		isBlock: function() {
			return this.nodeType == 'snippet' || !this.isInline();
		},
		
		/**
		 * This function tests if current elements' content contains xHTML tags. 
		 * This function is mostly used for output formatting
		 */
		hasTagsInContent: function() {
			return require('utils').matchesTag(this.content);
		},
		
		/**
		 * Check if element has child elements
		 * @return {Boolean}
		 */
		hasChildren: function() {
			return !!this.children.length;
		},
		
		/**
		 * Test if current element contains block-level children
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
			var utils = require('utils');
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
		},
		
		/**
		 * Check if current node name implied name (e.g. name is undefined,
		 * but it should exist in output)
		 * @returns {Boolean}
		 */
		hasImpliedName: function() {
			return !this.name && this.has_implicit_name && this.nodeType == 'element';
		}
	};
	
	require('elements').add('ZenNode', function(elem, options) {
		return new ZenNode(elem, options);
	});
});