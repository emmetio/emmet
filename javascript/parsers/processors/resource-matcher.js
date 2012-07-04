/**
 * Processor function that matches parsed <code>AbbreviationNode</code>
 * against resources defined in <code>resource</code> module
 * @param {Function} require
 * @param {Underscore} _
 */ 
zen_coding.exec(function(require, _) {
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
		_.each(_.clone(node.children), function(child) {
			var r = resources.getMatchedResource(child, syntax);
			if (_.isString(r)) {
				child.data('resource', elements.create('snippet', r));
			} else if (elements.is(r, 'reference')) {
				// it’s a reference to another abbreviation:
				// parse it and insert instead of current child
				var subtree = parser.parse(r.data, {
					syntax: syntax
				});
				
				// move child‘s children into the deepest child of new subtree
				var deepestChild = subtree.deepestChild();
				if (deepestChild) {
					_.each(child.children, function(c) {
						deepestChild.addChild(c);
					});
				}
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
		var syntax = options.syntax || zen_coding.defaultSyntax();
		matchResources(tree, syntax);
	});
	
});