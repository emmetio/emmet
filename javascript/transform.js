/**
 * Module used to transform parsed abbreviation tree into a final 
 * <code>ZenNode</code> tree that will be used for output
 * @param {Function} require
 * @param {Underscore} _
 * @author Sergey Chikuyonok (serge.che@gmail.com) <http://chikuyonok.ru>
 */
zen_coding.define('transform', function(require, _) {
	/**
	 * Resolves abbreviation node into parsed data
	 * @param {TreeNode} node
	 * @param {String} syntax
	 * @returns {ParsedElement}
	 */
	function resolveNode(node, syntax) {
		if (node.isEmpty()) return null;
		
		/** @type zen_coding.elements */
		var elements = require('elements');
		
		var test = function(elem) {
			if (_.isString(elem) || elements.is(elem, 'snippet'))
				return elements.create('parsedSnippet', node, syntax, elem);
			if (elements.is(elem, 'element'))
				return elements.create('parsedElement', node, syntax, elem);
			if (elements.is(elem, 'ZenNode'))
				throw '"ZenNode" is internal class and should not be used by resolvers';
			if (elements.is(elem, 'parsedElement') || elements.is(elem, 'parsedSnippet') || elements.is(elem, 'empty'))
				return elem;
			
			return null;
		};
		
		var result = require('resources').getMatchedResource(node, syntax);
		// a little sugar here: if matched resource is a subtree (e.g. parsed
		// abbreviation , like in 'expando' generator), retrieve children
		// only for easier tree transform
		if (elements.is(result, 'parsedElement') && result.isRoot) {
			result = _.clone(result.children);
		}
		
		if (_.isArray(result)) {
			// received a set of elements, make sure it contains valid elements only
			result = _.map(result, function(elem) {
				var data = test(elem);
				if (!data)
					throw 'Elements list contains unparsed data';
				
				return data;
			});
			
			return result;
		}
		
		return test(result) || elements.create('parsedElement', node, syntax);
	}
	
	/**
	 * Process single tree node: expand it and its children 
	 * @param {TreeNode} node
	 * @param {String} syntax
	 * @param {ParsedElement} parent
	 */
	function parseNodes(node, syntax, parent) {
		var resolvedData = resolveNode(node, syntax);
		/** @type zen_coding.elements */
		var elements = require('elements');
		
		if (!resolvedData) 
			return;
		
		_.each(_.isArray(resolvedData) ? resolvedData : [resolvedData], function(item) {
			if (elements.is(item, 'empty')) // skip empty elements
				return;
			
			parent.addChild(item);
			
			// set repeating element to the topmost node
			var root = parent;
			while (root.parent)
				root = root.parent;
			
			root.last = item;
			if (item.repeat_by_lines)
				root.multiply_elem = item;
				
			// process child groups
			_.each(node.children, function(child) {
				parseNodes(child, syntax, item);
			});
		});
	}
	
	return  {
		/**
		 * Transforms parsed abbreviation tree into final output tree 
		 * @param {TreeNode} abbrTree Parsed abbreviation, returned by 
		 * <code>zen_parser.parse</code>
		 * @param {String} syntax
		 * @param {TreeNode} contextNode Contextual node (XHTML under current 
		 * caret position), for better abbreviation expansion
		 * @returns {ZenNode}
		 * @memberOf zen_coding.transform
		 */
		transform: function(abbrTree, syntax, contextNode) {
			return this.rolloutTree(this.createParsedTree(abbrTree, syntax, contextNode));
		},
		
		/**
		 * Transforms abbreviation tree into parsed elements tree.
		 * The parsed tree consists for resolved elements and snippets, defined 
		 * in <code>zen_settings</code> file mostly. This is an intermediate tree
		 * structure that can be used to produce final output tree.
		 * @param {TreeNode} abbrTree Parsed abbreviation or abbreviation string 
		 * (it will be parsed automatically)
		 * @param {String} syntax
		 * @param {TreeNode} contextNode Contextual node (XHTML element under current 
		 * caret position), for better abbreviation expansion
		 * @returns {ZenNode}
		 * @returns {ParsedElement}
		 */
		createParsedTree: function(abbrTree, syntax, contextNode) {
			var elems = require('elements');
			var parser = require('abbreviationParser');
			
			/** @type ParsedElement */
			var treeRoot = elems.create('parsedElement', contextNode || {}, syntax);
			treeRoot.isRoot = true;
			if (_.isString(abbrTree))
				abbrTree = parser.parse(abbrTree);
			
			if (!abbrTree)
				return null;
			abbrTree = parser.optimizeTree(abbrTree);
			
			// recursively expand each group item
			_.each(abbrTree.children, function(child) {
				parseNodes(child, syntax, treeRoot);
			});
			
			return treeRoot;
		},

		/**
		 * Resolves abbreviation node into parsed data
		 * @param {TreeNode} node
		 * @param {String} syntax
		 * @returns {ParsedElement}
		 */
		resolve: function(node, syntax) {
			return resolveNode(node, syntax);
		},
		
		/**
		 * Rolls out basic Zen Coding tree into simplified, DOM-like tree.
		 * The simplified tree, for example, represents each multiplied element 
		 * as a separate element with its own content, if exists.
		 * 
		 * The simplified tree element contains some meta info (tag name, attributes, 
		 * etc.) as well as output strings, which are exactly what will be outputted
		 * after expanding abbreviation. This tree can be used for <i>filtering</i>:
		 * you can apply filters that will alter output strings to get desired look
		 * of expanded abbreviation.
		 * 
		 * @param {ParsedElement} tree
		 * @param {ZenNode} parent
		 */
		rolloutTree: function(tree, parent) {
			var elements = require('elements');
			var utils = require('utils');
			var howMany = 1;
			var tagContent = '';
			
			parent = parent || elements.create('ZenNode', tree);
			_.each(tree.children, function(child) {
				howMany = child.count;
				
				if (child.repeat_by_lines) {
					// it's a repeating element
					tagContent = utils.splitByLines(child.getPasteContent(), true);
					howMany = Math.max(tagContent.length, 1);
				} else {
					tagContent = child.getPasteContent();
				}
				
				for (var j = 0; j < howMany; j++) {
					var elem = elements.create('ZenNode', child);
					parent.addChild(elem);
					elem.counter = j + 1;
					
					if (child.hasChildren())
						this.rolloutTree(child, elem);
						
					if (tagContent) {
						var text = _.isString(tagContent) ? tagContent : tagContent[j];
						elem.pasteContent(utils.trim(text || ''));
					}
				}
			}, this);
			
			return parent;
		}
	};
});