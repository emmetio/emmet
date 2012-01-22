/**
 * 
 */
(function() {
	
	/**
	 * Wraps passed text with abbreviation. Text will be placed inside last
	 * expanded element
	 * @param {String} abbr Abbreviation
	 * @param {String} text Text to wrap
	 * @param {String} syntax Document type (html, xml, etc.). Default is 'html'
	 * @param {String} profile Output profile's name. Default is 'plain'
	 * @return {String}
	 */
	function wrap(abbr, text, syntax, profile) {
		/** @type zen_coding.filters */
		var filters = zen_coding.require('filters');
		/** @type zen_coding.utils */
		var utils = zen_coding.require('utils');
		/** @type zen_coding.transform */
		var transform = zen_coding.require('transform');
		/** @type zen_coding.parser */
		var parser = zen_coding.require('parser');
		
		var pasted = false;
		
//		try {
			var data = filters.extractFromAbbreviation(abbr);
			var parsedTree = transform.createParsedTree(data[0], syntax);
			if (parsedTree) {
				if (parsedTree.multiply_elem) {
					// we have a repeating element, put content in
					parsedTree.multiply_elem.setPasteContent(text);
					parsedTree.multiply_elem.repeat_by_lines = pasted = true;
				}
				
				var outputTree = transform.rolloutTree(parsedTree);
				if (!pasted) 
					outputTree.pasteContent(text);
				
				var filtersList = filters.composeList(syntax, profile, data[1]);
				filters.apply(outputTree, filtersList, profile);
				return utils.replaceVariables(outputTree.toString());
			}
//		} catch(e) {
//			zen_coding.log(e);
//		}
		
		return null;
	}
	
	/**
	 * Wraps content with abbreviation
	 * @param {IZenEditor} Editor instance
	 * @param {String} abbr Abbreviation to wrap with
	 * @param {String} syntax Syntax type (html, css, etc.)
	 * @param {String} profile Output profile name (html, xml, xhtml)
	 */
	zen_coding.require('actions').add('wrap_with_abbreviation', function(editor, abbr, syntax, profile) {
		var info = zen_coding.require('editorUtils').outputInfo(editor, syntax, profile);
		var utils = zen_coding.require('utils');
		/** @type zen_coding.editorUtils */
		var editorUtils = zen_coding.require('editorUtils');
		var matcher = zen_coding.require('html_matcher');
		
		abbr = abbr || editor.prompt("Enter abbreviation");
		
		var range = editor.getSelectionRange();
		var startOffset = range.start;
		var endOffset = range.end;
			
		if (!abbr || typeof abbr == 'undefined')
			return null; 
			
		abbr = String(abbr);
		
		if (startOffset == endOffset) {
			// no selection, find tag pair
			range = matcher(info.content, startOffset, info.profile);
			
			if (!range || range[0] == -1) // nothing to wrap
				return false;
			
			var narrowedSel = editorUtils.narrowToNonSpace(info.content, range[0], range[1]);
			startOffset = narrowedSel[0];
			endOffset = narrowedSel[1];
		}
		
		var newContent = utils.escapeText(info.content.substring(startOffset, endOffset));
		var result = wrap(abbr, editorUtils.unindent(editor, newContent), info.syntax, info.profile);
		
		if (result) {
			editor.setCaretPos(endOffset);
			editor.replaceContent(result, startOffset, endOffset);
			return true;
		}
		
		return false;
	});
})();