/**
 * Utility functions to work with <code>AbbreviationNode</code> as HTML element
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.define('abbreviationUtils', function(require, _) {
	return {
		/**
		 * Check if passed abbreviation node has matched snippet resource
		 * @param {AbbreviationNode} node
		 * @returns {Boolean}
		 * @memberOf abbreviationUtils
		 */
		isSnippet: function(node) {
			return require('elements').is(node.matchedResource(), 'snippet');
		},
		
		/**
		 * Test if passed node is unary (no closing tag)
		 * @param {AbbreviationNode} node
		 * @return {Boolean}
		 */
		isUnary: function(node) {
			var r = node.matchedResource();
			if (node.children.length || this.isSnippet(node))
				return false;
			
			return r && r.is_empty || require('tagName').isEmptyElement(node.name());
		},
		
		/**
		 * Test if passed node is inline-level (like &lt;strong&gt;, &lt;img&gt;)
		 * @param {AbbreviationNode} node
		 * @return {Boolean}
		 */
		isInline: function(node) {
			return node.isTextNode() 
				|| !node.name() 
				|| require('tagName').isInlineLevel(node.name());
		},
		
		/**
		 * Test if passed node is block-level
		 * @param {AbbreviationNode} node
		 * @return {Boolean}
		 */
		isBlock: function(node) {
			return require('elements').is(node.matchedResource(), 'snippet') 
				|| !this.isInline(node);
		},
		
		/**
		 * This function tests if passed node content contains HTML tags. 
		 * This function is mostly used for output formatting
		 * @param {AbbreviationNode} node
		 * @returns {Boolean}
		 */
		hasTagsInContent: function(node) {
			return require('utils').matchesTag(node.content());
		},
		
		/**
		 * Test if current element contains block-level children
		 * @param {AbbreviationNode} node
		 * @return {Boolean}
		 */
		hasBlockChildren: function(node) {
			return (this.hasTagsInContent(node) && this.isBlock(node)) 
				|| _.any(node.children, function(child) {
					return this.isBlock(child);
				}, this);
		}
	};
});