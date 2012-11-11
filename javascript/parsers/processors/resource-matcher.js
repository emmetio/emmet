/**
 * Processor function that matches parsed <code>AbbreviationNode</code>
 * against resources defined in <code>resource</code> module
 * @param {Function} require
 * @param {Underscore} _
 */ 
emmet.exec(function(require, _) {
	/**
	 * Finds matched resources for child nodes of passed <code>node</code> 
	 * element. A matched resource is a reference to <i>snippets.json</i> entry
	 * that describes output of parsed node 
	 * @param {AbbreviationNode} node
	 * @param {String} syntax
	 */
	function matchResources(node, syntax) {
		var resources = require('resources');
		var elements = require('elements');
		var parser = require('abbreviationParser');
		
		// do a shallow copy because the children list can be modified during
		// resource matching
		_.each(_.clone(node.children), /** @param {AbbreviationNode} child */ function(child) {
			var r = resources.getMatchedResource(child, syntax);
			if (_.isString(r)) {
				child.data('resource', elements.create('snippet', r));
			} else if (elements.is(r, 'reference')) {
				// it’s a reference to another abbreviation:
				// parse it and insert instead of current child
				/** @type AbbreviationNode */
				var subtree = parser.parse(r.data, {
					syntax: syntax
				});
				
				// if context element should be repeated, check if we need to 
				// transfer repeated element to specific child node
				if (child.repeatCount > 1) {
					var repeatedChildren = subtree.findAll(function(node) {
						return node.hasImplicitRepeat;
					});
					
					_.each(repeatedChildren, function(node) {
						node.repeatCount = child.repeatCount;
						node.hasImplicitRepeat = false;
					});
				}
				
				// move child‘s children into the deepest child of new subtree
				var deepestChild = subtree.deepestChild();
				if (deepestChild) {
					_.each(child.children, function(c) {
						deepestChild.addChild(c);
					});
				}
				
				// copy current attributes to children
				_.each(subtree.children, function(node) {
					_.each(child.attributeList(), function(attr) {
						node.attribute(attr.name, attr.value);
					});
				});
				
				child.replace(subtree.children);
			} else {
				child.data('resource', r);
			}
			
			matchResources(child, syntax);
		});
	}
	
	// XXX register abbreviation filter that creates references to resources
	// on abbreviation nodes
	/**
	 * @param {AbbreviationNode} tree
	 */
	require('abbreviationParser').addPreprocessor(function(tree, options) {
		var syntax = options.syntax || emmet.defaultSyntax();
		matchResources(tree, syntax);
	});
	
});