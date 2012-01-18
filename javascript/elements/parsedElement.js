/**
 * Parsed element
 */

/**
 * Tag
 * @param {zen_parser.TreeNode} node Parsed tree node
 * @param {String} syntax Tag type (html, xml)
 * @param {__zenDataElement} resource Matched element resource from <code>zen_settings</code>
 */
function ParsedElement(node, syntax, resource) {
	this._abbr = resource;
	
	this.name = this._abbr ? this._abbr.name : node.name;
	this.real_name = node.name;
	this.count = node.count || 1;
	this.syntax = syntax;
	this._content = '';
	this._paste_content = '';
	this.repeat_by_lines = node.is_repeating;
	this.is_repeating = node.count > 1;
	this.parent = null;
	this.has_implicit_name = node.has_implict_name;
	
	this.setContent(node.text);
	
	// add default attributes
	if (this._abbr)
		this.copyAttributes(this._abbr);
	
	this.copyAttributes(node);
}

ParsedElement.prototype = {
	/**
	 * Adds new child tag to current one
	 * @param {ParsedElement} elem
	 */
	addChild: function(elem) {
		if (!this.children)
			this.children = [];
			
		elem.parent = this;
		this.children.push(elem);
	},
	
	/**
	 * Adds new attribute
	 * @param {String} name Attribute's name
	 * @param {String} value Attribute's value
	 */
	addAttribute: function(name, value) {
		if (!this.attributes)
			this.attributes = [];
			
		if (!this._attr_hash)
			this._attr_hash = {};
		
		// escape pipe (caret) character with internal placeholder
		value = replaceUnescapedSymbol(value, '|', getCaretPlaceholder());
		
		var a;
		if (name in this._attr_hash) {
			// attribute already exists, decide what to do
			a = this._attr_hash[name];
			if (name == 'class') {
				// 'class' is a magic attribute
				a.value += ((a.value) ? ' ' : '') + value;
			} else {
				a.value = value;
			}
		} else {
			a = {name: name, value: value};
			this._attr_hash[name] = a;
			this.attributes.push(a);
		}
	},
	
	/**
	 * Copy attributes from parsed node
	 */
	copyAttributes: function(node) {
		if (node && node.attributes) {
			var that = this;
			_.each(node.attributes, function(attr) {
				that.addAttribute(attr.name, attr.value);
			});
		}
	},
	
	/**
	 * This function tests if current tags' content contains xHTML tags. 
	 * This function is mostly used for output formatting
	 */
	hasTagsInContent: function() {
		return this.getContent() && zen_coding.utils.reTag.test(this.getContent());
	},
	
	/**
	 * Set textual content for tag
	 * @param {String} str Tag's content
	 */
	setContent: function(str) {
		this._content = replaceUnescapedSymbol(str || '', '|', getCaretPlaceholder());
	},
	
	/**
	 * Returns tag's textual content
	 * @return {String}
	 */
	getContent: function() {
		return this._content || '';
	},
	
	/**
	 * Set content that should be pasted to the output
	 * @param {String} val
	 */
	setPasteContent: function(val) {
		this._paste_content = zen_coding.escapeText(val);
	},
	
	/**
	 * Get content that should be pasted to the output
	 * @return {String}
	 */
	getPasteContent: function() {
		return this._paste_content;
	},
	
	/**
	 * Search for deepest and latest child of current element
	 * @return {Tag|null} Returns null if there's no children
	 */
	findDeepestChild: function() {
		if (!this.children || !this.children.length)
			return null;
			
		var deepestChild = this;
		while (true) {
			deepestChild = deepestChild.children[ deepestChild.children.length - 1 ];
			if (!deepestChild.children || !deepestChild.children.length)
				break;
		}
		
		return deepestChild;
	}
};