/**
 * Core library that do all Zen Coding magic
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * @include "settings.js"
 * @include "zen_parser.js"
 */var zen_coding = (function(){
	
	var re_tag = /<\/?[\w:\-]+(?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*\s*(\/?)>$/;
	
	var TYPE_ABBREVIATION = 'zen-tag',
		TYPE_EXPANDO = 'zen-expando',
	
		/** Reference to another abbreviation or tag */
		TYPE_REFERENCE = 'zen-reference',
		
		caret_placeholder = '{%::zen-caret::%}',
		newline = '\n',
		default_tag = 'div',
		user_variables = {};
		
	var default_profile = {
		tag_case: 'lower',
		attr_case: 'lower',
		attr_quotes: 'double',
		
		// each tag on new line
		tag_nl: 'decide',
		
		place_cursor: true,
		
		// indent tags
		indent: true,
		
		// how many inline elements should be to force line break 
		// (set to 0 to disable)
		inline_break: 3,
		
		// use self-closing style for writing empty elements, e.g. <br /> or <br>
		self_closing_tag: 'xhtml',
		
		// Profile-level output filters, re-defines syntax filters 
		filters: ''
	};
	
	var profiles = {};
	
	/** List of registered filters */
	var filters = {},
		/** Filters that will be applied for unknown syntax */
		basic_filters = 'html';
		
	function isNumeric(ch) {
		if (typeof(ch) == 'string')
			ch = ch.charCodeAt(0);
			
		return (ch && ch > 47 && ch < 58);
	}
	
	/**
	 * Проверяет, является ли символ допустимым в аббревиатуре
	 * @param {String} ch
	 * @return {Boolean}
	 */
	function isAllowedChar(ch) {
		ch = String(ch); // convert Java object to JS
		var char_code = ch.charCodeAt(0),
			special_chars = '#.>+*:$-_!@[]()|';
		
		return (char_code > 64 && char_code < 91)       // uppercase letter
				|| (char_code > 96 && char_code < 123)  // lowercase letter
				|| isNumeric(ch)                        // number
				|| special_chars.indexOf(ch) != -1;     // special character
	}
	
	/**
	 * Возвращает символ перевода строки, используемый в редакторе
	 * @return {String}
	 */
	function getNewline() {
		return zen_coding.getNewline();
	}
	
	/**
	 * Split text into lines. Set <code>remove_empty</code> to true to filter
	 * empty lines
	 * @param {String} text
	 * @param {Boolean} [remove_empty]
	 * @return {Array}
	 */
	function splitByLines(text, remove_empty) {
		// IE fails to split string by regexp, 
		// need to normalize newlines first
		// Also, Mozilla's Rhiho JS engine has a wierd newline bug
		var nl = getNewline();
		var lines = (text || '')
			.replace(/\r\n/g, '\n')
			.replace(/\n\r/g, '\n')
			.replace(/\r/g, '\n')
			.replace(/\n/g, nl)
			.split(nl);
		
		if (remove_empty) {
			for (var i = lines.length; i >= 0; i--) {
				if (!trim(lines[i]))
					lines.splice(i, 1);
			}
		}
		
		return lines;
	}
	
	/**
	 * Trim whitespace from string
	 * @param {String} text
	 * @return {String}
	 */
	function trim(text) {
		return (text || "").replace( /^\s+|\s+$/g, "" );
	}
	
	function createProfile(options) {
		var result = {};
		for (var p in default_profile)
			result[p] = (p in options) ? options[p] : default_profile[p];
		
		return result;
	}
	
	function setupProfile(name, options) {
		profiles[name.toLowerCase()] = createProfile(options || {});
	}
	
	/**
	 * Helper function that transforms string into hash
	 * @return {Object}
	 */
	function stringToHash(str){
		var obj = {}, items = str.split(",");
		for ( var i = 0; i < items.length; i++ )
			obj[ items[i] ] = true;
		return obj;
	}
	
	/**
	 * Repeats string <code>how_many</code> times
	 * @param {String} str
	 * @param {Number} how_many
	 * @return {String}
	 */
	function repeatString(str, how_many) {
		var result = '';
		for (var i = 0; i < how_many; i++) 
			result += str;
			
		return result;
	}
	
	/**
	 * Indents text with padding
	 * @param {String} text Text to indent
	 * @param {String|Number} pad Padding size (number) or padding itself (string)
	 * @return {String}
	 */
	function padString(text, pad) {
		var pad_str = (typeof(pad) == 'number') 
				? repeatString(getIndentation(), pad) 
				: pad, 
			result = '';
		
		var lines = splitByLines(text),
			nl = getNewline();
			
		result += lines[0];
		for (var j = 1; j < lines.length; j++) 
			result += nl + pad_str + lines[j];
			
		return result;
	}
	
	/**
	 * Class inheritance method
	 * @param {Function} derived Derived class
	 * @param {Function} from Base class
	 */
	function inherit(derived, from) {
		var Inheritance = function(){};
	
		Inheritance.prototype = from.prototype;
	
		derived.prototype = new Inheritance();
		derived.prototype.constructor = derived;
		derived.baseConstructor = from;
		derived.superClass = from.prototype;
	};
	
	/**
	 * Check if passed abbreviation is snippet
	 * @param {String} abbr
	 * @param {String} type
	 * @return {Boolean}
	 */
	function isShippet(abbr, type) {
		return getSnippet(type, abbr) ? true : false;
	}
	
	/**
	 * Test if passed string ends with XHTML tag. This method is used for testing
	 * '>' character: it belongs to tag or it's a part of abbreviation? 
	 * @param {String} str
	 * @return {Boolean}
	 */
	function isEndsWithTag(str) {
		return re_tag.test(str);
	}
	
	/**
	 * Returns specified elements collection (like 'empty', 'block_level') from
	 * <code>resource</code>. If collections wasn't found, returns empty object
	 * @param {Object} resource
	 * @param {String} type
	 * @return {Object}
	 */
	function getElementsCollection(resource, type) {
		if (resource && resource.element_types)
			return resource.element_types[type] || {}
		else
			return {};
	}
	
	/**
	 * Replace variables like ${var} in string
	 * @param {String} str
	 * @param {Object|Function} [vars] Variable set (default is <code>zen_settings.variables</code>) 
	 * @return {String}
	 */
	function replaceVariables(str, vars) {
		var callback;
		
		if (typeof vars == 'function')
			callback = vars;
		else if (vars)
			callback = function(str, p1) {
				return (p1 in vars) ? vars[p1] : str;
			};
		else 
			callback = function(str, p1) {
				var v = getVariable(p1);
				return (v !== null && typeof v != 'undefined') ? v : str;
			}
		
		return str.replace(/\$\{([\w\-]+)\}/g, callback);
	}
	
	/**
	 * Tag
	 * @class
	 * @param {zen_parser.TreeNode} node Parsed tree node
	 * @param {String} type Tag type (html, xml)
	 */
	function Tag(node, type) {
		type = type || 'html';
		
		var abbr = null;
		if (node.name) {
			abbr = getAbbreviation(type, node.name);
			if (abbr && abbr.type == TYPE_REFERENCE)
				abbr = getAbbreviation(type, abbr.value);
		}
		
		this.name = (abbr) ? abbr.value.name : node.name;
		this.count = node.count || 1;
		this._abbr = abbr;
		this._res = zen_settings[type];
		this._content = '';
		this._paste_content = '';
		this.repeat_by_lines = node.is_repeating;
		this.parent = null;
		
		this.setContent(node.text);
		
		// add default attributes
		if (this._abbr)
			this.copyAttributes(this._abbr.value);
		
		this.copyAttributes(node);
	}
	
	Tag.prototype = {
		/**
		 * Adds new child tag to current one
		 * @param {Tag} tag
		 */
		addChild: function(tag) {
			if (!this.children)
				this.children = [];
				
			tag.parent = this;
			this.children.push(tag);
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
			value = replaceUnescapedSymbol(value, '|', caret_placeholder);
			
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
				this._attr_hash[name] = a
				this.attributes.push(a);
			}
		},
		
		/**
		 * Copy attributes from parsed node
		 */
		copyAttributes: function(node) {
			if (node && node.attributes)
				for (var i = 0, il = node.attributes.length; i < il; i++) {
					var attr = node.attributes[i];
					this.addAttribute(attr.name, attr.value);
				}
		},
		
		/**
		 * This function tests if current tags' content contains xHTML tags. 
		 * This function is mostly used for output formatting
		 */
		hasTagsInContent: function() {
			return this.getContent() && re_tag.test(this.getContent());
		},
		
		/**
		 * Set textual content for tag
		 * @param {String} str Tag's content
		 */
		setContent: function(str) {
			this._content = replaceUnescapedSymbol(str || '', '|', caret_placeholder);
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
			this._paste_content = val;
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
				
			var deepest_child = this;
			while (true) {
				deepest_child = deepest_child.children[ deepest_child.children.length - 1 ];
				if (!deepest_child.children || !deepest_child.children.length)
					break;
			}
			
			return deepest_child;
		}
	};
	
	/**
	 * Snippet
	 * @param {zen_parser.TreeNode} node
	 * @param {String} type Tag type (html, xml)
	 */
	function Snippet(node, type) {
		/** @type {String} */
		this.name = node.name;
		this.count = node.count;
		this.children = [];
		this._content = node.text || '';
		this.repeat_by_lines = node.is_repeating;
		this.attributes = {'id': caret_placeholder, 'class': caret_placeholder};
		this.value = replaceUnescapedSymbol(getSnippet(type, this.name), '|', caret_placeholder);
		this.parent = null;
		
		this.copyAttributes(node);
	}
	
	inherit(Snippet, Tag);
	
	/**
	 * Returns abbreviation value from data set
	 * @param {String} type Resource type (html, css, ...)
	 * @param {String} abbr Abbreviation name
	 * @return {Object|null}
	 */
	function getAbbreviation(type, abbr) {
		return getSettingsResource(type, abbr, 'abbreviations');
	}
	
	/**
	 * Returns snippet value from data set
	 * @param {String} type Resource type (html, css, ...)
	 * @param {String} snippet_name Snippet name
	 * @return {Object|null}
	 */
	function getSnippet(type, snippet_name) {
		return getSettingsResource(type, snippet_name, 'snippets');
	}
	
	/**
	 * Returns variable value
	 * @return {String}
	 */
	function getVariable(name) {
		return (name in user_variables)
			? user_variables[name]
			: zen_settings.variables[name];
	}
	
	/**
	 * Returns indentation string
	 * @return {String}
	 */
	function getIndentation() {
		return getVariable('indentation');
	}
	
	/**
	 * Creates resource inheritance chain for lookups
	 * @param {String} syntax Syntax name
	 * @param {String} name Resource name
	 * @return {Array}
	 */
	function createResourceChain(syntax, name) {
		var resource = zen_settings[syntax],
			result = [];
		
		if (resource) {
			if (name in resource)
				result.push(resource[name]);
			if ('extends' in resource) {
				// find resource in ancestors
				for (var i = 0; i < resource['extends'].length; i++) {
					var type = resource['extends'][i];
					if (zen_settings[type] && zen_settings[type][name])
						result.push(zen_settings[type][name]);
				}
			}
		}
		
		return result;
	}
	
	/**
	 * Get resource collection from settings file for specified syntax. 
	 * It follows inheritance chain if resource wasn't directly found in
	 * syntax settings
	 * @param {String} syntax Syntax name
	 * @param {String} name Resource name
	 */
	function getResource(syntax, name) {
		var chain = createResourceChain(syntax, name);
		return chain[0];
	}
	
	/**
	 * Returns resource value from data set with respect of inheritance
	 * @param {String} syntax Resource syntax (html, css, ...)
	 * @param {String} abbr Abbreviation name
	 * @param {String} name Resource name ('snippets' or 'abbreviation')
	 * @return {Object|null}
	 */
	function getSettingsResource(syntax, abbr, name) {
		var result = getUserDefinedResource(syntax, abbr, name);
		if (result)
			return result;
			
		var chain = createResourceChain(syntax, name);
		for (var i = 0, il = chain.length; i < il; i++) {
			if (abbr in chain[i])
				return chain[i][abbr];
		}
		
		return null;
	}
	
	/**
	 * Returns user defined resource
	 * @param {String} syntax Resource syntax (html, css, ...)
	 * @param {String} abbr Abbreviation name
	 * @param {String} name Resource name ('snippets' or 'abbreviation')
	 * @return {Object|null}
	 */
	function getUserDefinedResource(syntax, abbr, name) {
		var storage = zen_coding.user_resources;
		if (storage && syntax in storage && name in storage[syntax]) {
			return storage[syntax][name][abbr] || null;
		}
		
		return null;
	}
	
	/**
	 * @class
	 * Creates simplified tag from Zen Coding tag
	 * @param {Tag} tag
	 */
	function ZenNode(tag) {
		this.type = (tag instanceof Snippet) ? 'snippet' : 'tag';
		this.name = tag.name;
		this.children = [];
		this.counter = 1;
		
		// create deep copy of attribute list so we can change
		// their values in runtime without affecting other nodes
		// created from the same tag
		this.attributes = [];
		if (tag.attributes) {
			for (var i = 0, il = tag.attributes.length; i < il; i++) {
				var a =  tag.attributes[i];
				this.attributes.push({
					name: a.name,
					value: a.value
				});
			}
		}
		
		/** @type {Tag} Source element from which current tag was created */
		this.source = tag;
		
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
		this.content = tag.getContent() || '';
		this.padding = '';
	}
	
	ZenNode.prototype = {
		/**
		 * @type {ZenNode} tag
		 */
		addChild: function(tag) {
			tag.parent = this;
			var last_child = this.children[this.children.length - 1];
			if (last_child) {
				tag.previousSibling = last_child;
				last_child.nextSibling = tag;
			}
			
			this.children.push(tag);
		},
		
		/**
		 * Get attribute's value.
		 * @param {String} name
		 * @return {String|null} Returns <code>null</code> if attribute wasn't found
		 */
		getAttribute: function(name) {
			name = name.toLowerCase();
			for (var i = 0, il = this.attributes.length; i < il; i++) {
				if (this.attributes[i].name.toLowerCase() == name)
					return this.attributes[i].value;
			}
			
			return null;
		},
		
		/**
		 * Test if current tag is unary (no closing tag)
		 * @return {Boolean}
		 */
		isUnary: function() {
			if (this.type == 'snippet')
				return false;
				
			return (this.source._abbr && this.source._abbr.value.is_empty) || (this.name in getElementsCollection(this.source._res, 'empty'));
		},
		
		/**
		 * Test if current tag is inline-level (like &lt;strong&gt;, &lt;img&gt;)
		 * @return {Boolean}
		 */
		isInline: function() {
			return this.type == 'text' || (this.name in getElementsCollection(this.source._res, 'inline_level'));
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
			return this.content && re_tag.test(this.content);
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
			if (this.hasTagsInContent() && this.isBlock()) {
				return true;
			}
			
			for (var i = 0; i < this.children.length; i++) {
				if (this.children[i].isBlock())
					return true;
			}
			
			return false;
		},
		
		/**
		 * Search for deepest and latest child of current element
		 * @return {ZenNode|null} Returns <code>null</code> if there's no children
		 */
		findDeepestChild: function() {
			if (!this.children.length)
				return null;
				
			var deepest_child = this;
			while (true) {
				deepest_child = deepest_child.children[ deepest_child.children.length - 1 ];
				if (!deepest_child.children.length)
					break;
			}
			
			return deepest_child;
		},
		
		/**
		 * @return {String}
		 */
		toString: function() {
			var content = '';
			for (var i = 0, il = this.children.length; i < il; i++) {
				content += this.children[i].toString();
			}
			
			return this.start + this.content + content + this.end;
		},
		
		/**
		 * Paste content in context of current node. Pasting is a special case
		 * of recursive adding content in node. 
		 * This function will try to find ${output} variable inside node's 
		 * attributes and text content and replace in with <code>text</code>.
		 * If it doesn't find ${output} variable, it will put <code>text</code>
		 * value as the deepest child content
		 * @param {String} text Test to paste
		 * @param {Number} [had_var] Flag indicating that previous function run
		 * (basically, on node's parent) had replaced ${output} variable (1),
		 * pasted as node content (2) or did nothing (0)
		 * @return {Number} Is text was pasted as ${output} variable
		 */
		pasteContent: function(text, had_var) {
			had_var = had_var || 0;
			var fn = function(str, p1) {
				if (p1 == 'output') {
					had_var = 1;
					return text;
				}
				
				return str;
			};
			
			for (var i = 0, il = this.attributes.length; i < il; i++) {
				var a = this.attributes[i];
				a.value = replaceVariables(a.value, fn);
			}
			
			this.content = replaceVariables(this.content, fn);
			if (this.hasChildren()) {
				for (var i = 0, il = this.children.length; i < il; i++) {
					had_var = this.children[i].pasteContent(text, had_var);
					if (had_var === 2) return had_var;
				}
			} else if (had_var == 0) {
				// put text as node content
				this.content += text;
				return 2;
			}
			
			return had_var;
		}
	}
	
	/**
	 * Roll outs basic Zen Coding tree into simplified, DOM-like tree.
	 * The simplified tree, for example, represents each multiplied element 
	 * as a separate element sets with its own content, if exists.
	 * 
	 * The simplified tree element contains some meta info (tag name, attributes, 
	 * etc.) as well as output strings, which are exactly what will be outputted
	 * after expanding abbreviation. This tree is used for <i>filtering</i>:
	 * you can apply filters that will alter output strings to get desired look
	 * of expanded abbreviation.
	 * 
	 * @param {Tag} tree
	 * @param {ZenNode} [parent]
	 */
	function rolloutTree(tree, parent) {
		parent = parent || new ZenNode(tree);
		
		var how_many = 1,
			tag_content = '';
			
		if (tree.children) {
			for (var i = 0, il = tree.children.length; i < il; i++) {
				/** @type {Tag} */
				var child = tree.children[i];
				how_many = child.count;
				
				if (child.repeat_by_lines) {
					// it's a repeating element
					tag_content = splitByLines(child.getPasteContent(), true);
					how_many = Math.max(tag_content.length, 1);
				} else {
					tag_content = child.getPasteContent();
				}
				
				for (var j = 0; j < how_many; j++) {
					var tag = new ZenNode(child);
					parent.addChild(tag);
					tag.counter = j + 1;
					
					if (child.children && child.children.length)
						rolloutTree(child, tag);
						
					if (tag_content) {
						var text = (typeof(tag_content) == 'string') 
							? tag_content 
							: (tag_content[j] || '');
						tag.pasteContent(text);
					}
				}
			}
		}
		
		return parent;
	}
	
	/**
	 * Runs filters on tree
	 * @param {ZenNode} tree
	 * @param {String|Object} profile
	 * @param {String[]|String} filter_list
	 * @return {ZenNode}
	 */
	function runFilters(tree, profile, filter_list) {
		profile = processProfile(profile);
		
		if (typeof(filter_list) == 'string')
			filter_list = filter_list.split(/[\|,]/g);
			
		for (var i = 0, il = filter_list.length; i < il; i++) {
			var name = trim(filter_list[i].toLowerCase());
			if (name && name in filters) {
				tree = filters[name](tree, profile);
			}
		}
		
		return tree;
	}
	
	/**
	 * Transforms abbreviation into a primary internal tree. This tree should'n 
	 * be used ouside of this scope
	 * @param {zen_parser.TreeNode} abbr Parsed tree node
	 * @param {String} [type] Document type (xsl, html, etc.)
	 * @return {Tag}
	 */
	function transformTreeNode(node, type) {
		type = type || 'html';
		if (node.isEmpty()) return null;
		
		return isShippet(node.name, type) 
				? new Snippet(node, type)
				: new Tag(node, type);
	}
	
	/**
	 * Process single tree node: expand it and its children 
	 * @param {zen_parser.TreeNode} node
	 * @param {String} type
	 * @param {Tag} parent
	 */
	function processParsedNode(node, type, parent) {
		var t_node = transformTreeNode(node, type);
		parent.addChild(t_node);
			
		// set repeating element to the topmost node
		var root = parent;
		while (root.parent)
			root = root.parent;
		
		root.last = t_node;
		if (t_node.repeat_by_lines)
			root.multiply_elem = t_node;
			
		// process child groups
		for (var j = 0, jl = node.children.length; j < jl; j++) {
			processParsedNode(node.children[j], type, t_node);
		}
	}
	
	/**
	 * Replaces expando nodes by its parsed content
	 * @param {zen_parser.TreeNode}
	 * @param {String} type
	 */
	function replaceExpandos(node, type) {
		for (var i = 0, il = node.children.length; i < il; i++) {
			var n = node.children[i];
			if (!n.isEmpty() && !n.isTextNode() && n.name.indexOf('+') != -1) {
				// it's expando
				var a = getAbbreviation(type, n.name);
				if (a)
					node.children[i] = zen_parser.parse(a.value);
			}
			replaceExpandos(node.children[i], type);
		}
	}
	
	/**
	 * Replaces expandos and optimizes tree structure by removing empty nodes
	 * @param {zen_parser.TreeNode} tree
	 * @param {String} type
	 */
	function preprocessParsedTree(tree, type) {
		replaceExpandos(tree, type);
		return zen_parser.optimizeTree(tree);
	}
	
	/**
	 * Pad string with zeroes
	 * @param {String} str
	 * @param {Number} pad
	 */
	function zeroPadString(str, pad) {
		var padding = '', 
			il = str.length;
			
		while (pad > il++) padding += '0';
		return padding + str; 
	}
	
	/**
	 * Replaces unescaped symbols in <code>str</code>. For example, the '$' symbol
	 * will be replaced in 'item$count', but not in 'item\$count'.
	 * @param {String} str Original string
	 * @param {String} symbol Symbol to replace
	 * @param {String|Function} replace Symbol replacement
	 * @return {String}
	 */
	function replaceUnescapedSymbol(str, symbol, replace) {
		var i = 0,
			il = str.length,
			sl = symbol.length,
			match_count = 0;
			
		while (i < il) {
			if (str.charAt(i) == '\\') {
				// escaped symbol, skip next character
				i += sl + 1;
			} else if (str.substr(i, sl) == symbol) {
				// have match
				var cur_sl = sl;
				match_count++;
				var new_value = replace;
				if (typeof(replace) !== 'string') {
					var replace_data = replace(str, symbol, i, match_count);
					if (replace_data) {
						cur_sl = replace_data[0].length;
						new_value = replace_data[1];
					} else {
						new_value = false;
					}
				}
				
				if (new_value === false) { // skip replacement
					i++;
					continue;
				}
				
				str = str.substring(0, i) + new_value + str.substring(i + cur_sl);
				// adjust indexes
				il = str.length;
				i += new_value.length;
			} else {
				i++;
			}
		}
		
		return str;
	}
	
	/**
	 * Porcesses profile argument, returning, if possible, profile object
	 */
	function processProfile(profile) {
		var _profile = profile;
		if (typeof(profile) == 'string' && profile in profiles)
			_profile = profiles[profile];
		
		if (!_profile)
			_profile = profiles['plain'];
			
		return _profile;
	}
	
	// create default profiles
	setupProfile('xhtml');
	setupProfile('html', {self_closing_tag: false});
	setupProfile('xml', {self_closing_tag: true, tag_nl: true});
	setupProfile('plain', {tag_nl: false, indent: false, place_cursor: false});
	
	
	return {
		/** Hash of all available actions */
		actions: {},
		
		/** User-defined snippets and abbreviations */
		user_resources: {},
		
		/**
		 * Adds new Zen Coding action. This action will be available in
		 * <code>zen_settings.actions</code> object.
		 * @param {String} name Action's name
		 * @param {Function} fn Action itself. The first argument should be
		 * <code>zen_editor</code> instance.
		 */
		registerAction: function(name, fn) {
			this.actions[name] = fn;
		},
		
		/**
		 * Runs Zen Coding action. For list of available actions and their
		 * arguments see <code>zen_actions.js</code> file.
		 * @param {String} name Action name 
		 * @param {Array} args Additional arguments. It may be array of arguments
		 * or inline arguments. The first argument should be <code>zen_editor</code> instance
		 * @example
		 * zen_coding.runActions('expand_abbreviation', zen_editor);  
		 * zen_coding.runActions('wrap_with_abbreviation', [zen_editor, 'div']);  
		 */
		runAction: function(name, args) {
			if (!(args instanceof Array))
				args = Array.prototype.slice.call(arguments, 1);
				
			try {
				if (name in this.actions)
					return this.actions[name].apply(this, args);
			} catch(e){
				if (window && window.console)
					console.error(e);
				return false; 
			}
		},
		
		expandAbbreviation: function(abbr, type, profile) {
			type = type || 'html';
			var parsed_tree = this.parseIntoTree(abbr, type);
			
			if (parsed_tree) {
				var tree = rolloutTree(parsed_tree);
				this.applyFilters(tree, type, profile, parsed_tree.filters);
				return replaceVariables(tree.toString());
			}
			
			return '';
		},
		
		/**
		 * Extracts abbreviations from text stream, starting from the end
		 * @param {String} str
		 * @return {String} Abbreviation or empty string
		 */
		extractAbbreviation: function(str) {
			var cur_offset = str.length,
				start_index = -1,
				brace_count = 0,
				text_count = 0;
			
			while (true) {
				cur_offset--;
				if (cur_offset < 0) {
					// moved to the beginning of the line
					start_index = 0;
					break;
				}
				
				var ch = str.charAt(cur_offset);
				
				if (ch == ']')
					brace_count++;
				else if (ch == '[')
					brace_count--;
				if (ch == '}')
					text_count++;
				else if (ch == '{')
					text_count--;
				else {
					if (brace_count || text_count) 
						// respect all characters inside attribute sets or text nodes
						continue;
					else if (!isAllowedChar(ch) || (ch == '>' && isEndsWithTag(str.substring(0, cur_offset + 1)))) {
						// found stop symbol
						start_index = cur_offset + 1;
						break;
					}
				}
			}
			
			if (start_index != -1) 
				// found somethind, return abbreviation
				return str.substring(start_index);
			else
				return '';
		},
		
		/**
		 * Parses abbreviation into a node set
		 * @param {String} abbr Abbreviation
		 * @param {String} type Document type (xsl, html, etc.)
		 * @return {Tag}
		 */
		parseIntoTree: function(abbr, type) {
			type = type || 'html';
			// remove filters from abbreviation
			var filter_list = '';
			abbr = abbr.replace(/\|([\w\|\-]+)$/, function(str, p1){
				filter_list = p1;
				return '';
			});
			
			// split abbreviation by groups
			var abbr_tree = zen_parser.parse(abbr),
				tree_root = new Tag({}, type);
				
			abbr_tree = preprocessParsedTree(abbr_tree, type);
				
			// then recursively expand each group item
			for (var i = 0, il = abbr_tree.children.length; i < il; i++) {
				processParsedNode(abbr_tree.children[i], type, tree_root);
			}
			
			tree_root.filters = filter_list;
			return tree_root;
		},
		
		/**
		 * Indents text with padding
		 * @param {String} text Text to indent
		 * @param {String|Number} pad Padding size (number) or padding itself (string)
		 * @return {String}
		 */
		padString: padString,
		setupProfile: setupProfile,
		getNewline: function(){
			return newline;
		},
		
		setNewline: function(str) {
			newline = str;
		},
		
		/**
		 * Wraps passed text with abbreviation. Text will be placed inside last
		 * expanded element
		 * @param {String} abbr Abbreviation
		 * @param {String} text Text to wrap
		 * @param {String} [type] Document type (html, xml, etc.). Default is 'html'
		 * @param {String} [profile] Output profile's name. Default is 'plain'
		 * @return {String}
		 */
		wrapWithAbbreviation: function(abbr, text, type, profile) {
			type = type || 'html';
			var tree_root = this.parseIntoTree(abbr, type);
			if (tree_root) {
				var repeat_elem = tree_root.multiply_elem || tree_root.last;
				repeat_elem.setPasteContent(text);
				repeat_elem.repeat_by_lines = !!tree_root.multiply_elem;
				
				var tree = rolloutTree(tree_root);
				this.applyFilters(tree, type, profile, tree_root.filters);
				return replaceVariables(tree.toString());
			}
			
			return null;
		},
		
		splitByLines: splitByLines,
		
		/**
		 * Check if cursor is placed inside xHTML tag
		 * @param {String} html Contents of the document
		 * @param {Number} cursor_pos Current caret position inside tag
		 * @return {Boolean}
		 */
		isInsideTag: function(html, cursor_pos) {
			var re_tag = /^<\/?\w[\w\:\-]*.*?>/;
			
			// search left to find opening brace
			var pos = cursor_pos;
			while (pos > -1) {
				if (html.charAt(pos) == '<') 
					break;
				pos--;
			}
			
			if (pos != -1) {
				var m = re_tag.exec(html.substring(pos));
				if (m && cursor_pos > pos && cursor_pos < pos + m[0].length)
					return true;
			}
			
			return false;
		},
		
		/**
		 * Returns caret placeholder
		 * @return {String}
		 */
		getCaretPlaceholder: function() {
			return (typeof(caret_placeholder) != 'string') 
				? caret_placeholder()
				: caret_placeholder
		},
		
		/**
		 * Set caret placeholder: a string (like '|') or function.
		 * You may use a function as a placeholder generator. For example,
		 * TextMate uses ${0}, ${1}, ..., ${n} natively for quick Tab-switching
		 * between them.
		 * @param {String|Function} value
		 */
		setCaretPlaceholder: function(value) {
			caret_placeholder = value;
		},
		
		rolloutTree: rolloutTree,
		
		/**
		 * Register new filter
		 * @param {String} name Filter name
		 * @param {Function} fn Filter function
		 */
		registerFilter: function(name, fn) {
			filters[name] = fn;
		},
		
		/**
		 * Factory method that produces <code>ZenNode</code> instance
		 * @param {String} name Node name
		 * @param {Array} [attrs] Array of attributes as key/value objects  
		 * @return {ZenNode}
		 */
		nodeFactory: function(name, attrs) {
			return new ZenNode({name: name, attributes: attrs || []});
		},
		
		/**
		 * Applies filters to tree according to syntax
		 * @param {ZenNode} tree Tag tree to apply filters to
		 * @param {String} syntax Syntax name ('html', 'css', etc.)
		 * @param {String|Object} profile Profile or profile's name
		 * @param {String|Array} [additional_filters] List or pipe-separated 
		 * string of additional filters to apply
		 * 
		 * @return {ZenNode}
		 */
		applyFilters: function(tree, syntax, profile, additional_filters) {
			profile = processProfile(profile);
			var _filters = profile.filters;
			if (!_filters)
				_filters = getResource(syntax, 'filters') || basic_filters;
				
			if (additional_filters)
				_filters += '|' + ((typeof(additional_filters) == 'string') 
					? additional_filters 
					: additional_filters.join('|'));
				
			if (!_filters)
				// looks like unknown syntax, apply basic filters
				_filters = basic_filters;
				
			return runFilters(tree, profile, _filters);
		},
		
		runFilters: runFilters,
		
		repeatString: repeatString,
		getVariable: getVariable,
		setVariable: function(name, value) {
			user_variables[name] = value;
		},
		
		/**
		 * Removes all user-defined variables
		 */
		resetVariables: function() {
			user_variables = {};
		},
		
		replaceVariables: replaceVariables,
		
		/**
		 * Escapes special characters used in Zen Coding, like '$', '|', etc.
		 * Use this method before passing to actions like "Wrap with Abbreviation"
		 * to make sure that existing spacial characters won't be altered
		 * @param {String} text
		 * @return {String}
		 */
		escapeText: function(text) {
			return text.replace(/([\$\|\\])/g, '\\$1');
		},
		
		/**
		 * Unescapes special characters used in Zen Coding, like '$', '|', etc.
		 * @param {String} text
		 * @return {String}
		 */
		unescapeText: function(text) {
			return text.replace(/\\(.)/g, '$1');
		},
		
		/**
		 * Replaces '$' character in string assuming it might be escaped with '\'
		 * @param {String} str
		 * @param {String|Number} value
		 * @return {String}
		 */
		replaceCounter: function(str, value) {
			var symbol = '$';
			value = String(value);
			return replaceUnescapedSymbol(str, symbol, function(str, symbol, pos, match_num){
				if (str.charAt(pos + 1) == '{' || isNumeric(str.charAt(pos + 1)) ) {
					// it's a variable, skip it
					return false;
				}
				
				// replace sequense of $ symbols with padded number  
				var j = pos + 1;
				while(str.charAt(j) == '$' && str.charAt(j + 1) != '{') j++;
				return [str.substring(pos, j), zeroPadString(value, j - pos)];
			});
		},
		
		/**
		 * Upgrades tabstops in zen node in order to prevent naming conflicts
		 * @param {ZenNode} node
		 * @param {Number} offset Tab index offset
		 * @returns {Number} Maximum tabstop index in element
		 */
		upgradeTabstops: function(node, offset) {
			var max_num = 0,
				props = ['start', 'end', 'content'];
				
			for (var i = 0, il = props.length; i < il; i++) {
				node[props[i]] = node[props[i]].replace(/\$(\d+)|\$\{(\d+)(\:[^\}]+)?\}/g, function(str, p1, p2){
					var num = parseInt(p1 || p2, 10);
					if (num > max_num)
						max_num = num;
						
					return str.replace(/\d+/, num + offset);
				});
			}
			
			return max_num;
		},
		
		getResource: getResource,
		
		/**
		 * Get profile by it's name. If profile wasn't found, returns 'plain'
		 * profile
		 */
		getProfile: function(name) {
			return (name in profiles) ? profiles[name] : profiles['plain'];
		},
		
		/**
		 * Gets image size from image byte stream.
		 * @author http://romeda.org/rePublish/
		 * @param {String} stream Image byte stream (use <code>zen_file.read()</code>)
		 * @return {Object} Object with <code>width</code> and <code>height</code> properties
		 */
		getImageSize: function(stream) {
			var pngMagicNum = "\211PNG\r\n\032\n",
				jpgMagicNum = "\377\330",
				gifMagicNum = "GIF8",
				nextByte = function() {
					return stream.charCodeAt(pos++);
				};
		
			if (stream.substr(0, 8) === pngMagicNum) {
				// PNG. Easy peasy.
				var pos = stream.indexOf('IHDR') + 4;
			
				return { width:  (nextByte() << 24) | (nextByte() << 16) |
								 (nextByte() <<  8) | nextByte(),
						 height: (nextByte() << 24) | (nextByte() << 16) |
								 (nextByte() <<  8) | nextByte() };
			
			} else if (stream.substr(0, 4) === gifMagicNum) {
				pos = 6;
			
				return {
					width:  nextByte() | (nextByte() << 8),
					height: nextByte() | (nextByte() << 8)
				};
			
			} else if (stream.substr(0, 2) === jpgMagicNum) {
				// TODO need testing
				pos = 2;
			
				var l = stream.length;
				while (pos < l) {
					if (nextByte() != 0xFF) return;
				
					var marker = nextByte();
					if (marker == 0xDA) break;
				
					var size = (nextByte() << 8) | nextByte();
				
					if (marker >= 0xC0 && marker <= 0xCF && !(marker & 0x4) && !(marker & 0x8)) {
						pos += 1;
						return { height:  (nextByte() << 8) | nextByte(),
								 width: (nextByte() << 8) | nextByte() };
				
					} else {
						pos += size - 2;
					}
				}
			}
		},
		
		settings_parser: (function(){
			/**
			 * Unified object for parsed data
			 */
			function entry(type, key, value) {
				return {
					type: type,
					key: key,
					value: value
				};
			}
			
			/** Regular expression for XML tag matching */
			var re_tag = /^<(\w+\:?[\w\-]*)((?:\s+[\w\:\-]+\s*=\s*(['"]).*?\3)*)\s*(\/?)>/,
				re_attrs = /([\w\-]+)\s*=\s*(['"])(.*?)\2/g;
			
			/**
			 * Make expando from string
			 * @param {String} key
			 * @param {String} value
			 * @return {Object}
			 */
			function makeExpando(key, value) {
				return entry(TYPE_EXPANDO, key, value);
			}
			
			/**
			 * Make abbreviation from string
			 * @param {String} key Abbreviation key
			 * @param {String} tag_name Expanded element's tag name
			 * @param {String} attrs Expanded element's attributes
			 * @param {Boolean} is_empty Is expanded element empty or not
			 * @return {Object}
			 */
			function makeAbbreviation(key, tag_name, attrs, is_empty) {
				var result = {
					name: tag_name,
					is_empty: Boolean(is_empty)
				};
				
				if (attrs) {
					var m;
					result.attributes = [];
					while (m = re_attrs.exec(attrs)) {
						result.attributes.push({
							name: m[1],
							value: m[3]
						});
					}
				}
				
				return entry(TYPE_ABBREVIATION, key, result);
			}
			
			/**
			 * Parses single abbreviation
			 * @param {String} key Abbreviation name
			 * @param {String} value = Abbreviation value
			 * @return {Object}
			 */
			function parseAbbreviation(key, value) {
				key = trim(key);
				var m;
				if (key.substr(-1) == '+') {
					// this is expando, leave 'value' as is
					return makeExpando(key, value);
				} else if (m = re_tag.exec(value)) {
					return makeAbbreviation(key, m[1], m[2], m[4] == '/');
				} else {
					// assume it's reference to another abbreviation
					return entry(TYPE_REFERENCE, key, value);
				}
			}
			
			/**
			 * Parses all abbreviations inside object
			 * @param {Object} obj
			 */
			function parseAbbreviations(obj) {
				for (var key in obj) {
					var value = obj[key];
					obj[key] = parseAbbreviation(trim(key), value);
					obj[key].__ref = value;
				}
			}
			
			return {
				/**
				 * Parse user's settings
				 * @param {Object} settings
				 */
				parse: function(settings) {
					for (var p in settings) {
						if (p == 'abbreviations')
							parseAbbreviations(settings[p]);
						else if (p == 'extends') {
							var ar = settings[p].split(',');
							for (var i = 0; i < ar.length; i++) 
								ar[i] = trim(ar[i]);
							settings[p] = ar;
						}
						else if (typeof(settings[p]) == 'object')
							arguments.callee(settings[p]);
					}
				},
				
				parseAbbreviation: parseAbbreviation,
				
				extend: function(parent, child) {
					for (var p in child) {
						if (typeof(child[p]) == 'object' && parent.hasOwnProperty(p))
							arguments.callee(parent[p], child[p]);
						else
							parent[p] = child[p];
					}
				},
				
				/**
				 * Create hash maps on certain string properties
				 * @param {Object} obj
				 */
				createMaps: function(obj) {
					for (var p in obj) {
						if (p == 'element_types') {
							for (var k in obj[p]) 
								obj[p][k] = stringToHash(obj[p][k]);
						} else if (typeof(obj[p]) == 'object') {
							arguments.callee(obj[p]);
						}
					}
				},
				
				TYPE_ABBREVIATION: TYPE_ABBREVIATION,
				TYPE_EXPANDO: TYPE_EXPANDO,
				
				/** Reference to another abbreviation or tag */
				TYPE_REFERENCE: TYPE_REFERENCE
			}
		})()
	}
	
})();

if ('zen_settings' in this || zen_settings) {
	// first we need to expand some strings into hashes
	zen_coding.settings_parser.createMaps(zen_settings);
	if ('my_zen_settings' in this) {
		// we need to extend default settings with user's
		zen_coding.settings_parser.createMaps(my_zen_settings);
		zen_coding.settings_parser.extend(zen_settings, my_zen_settings);
	}
	
	// now we need to parse final set of settings
	zen_coding.settings_parser.parse(zen_settings);
}