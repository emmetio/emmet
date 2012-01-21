/**
 * Splits or joins tag, e.g. transforms it into a short notation and vice versa:<br>
 * &lt;div&gt;&lt;/div&gt; → &lt;div /&gt; : join<br>
 * &lt;div /&gt; → &lt;div&gt;&lt;/div&gt; : split
 * @param {IZenEditor} editor Editor instance
 * @param {String} profileName Profile name
 */
zen_coding.require('actions').add('split_join_tag', function(editor, profileName) {
	/** @type zen_coding.profile */
	var profiles = zen_coding.require('profile');
	var matcher = zen_coding.require('html_matcher');
	var utils = zen_coding.require('utils');
	var editorUtils = zen_coding.require('editorUtils');
	
	var info = editorUtils.outputInfo(editor, null, profileName);
	var caretPos = editor.getCaretPos();
	var profile = profiles.get(info.profile);
	var caret = utils.getCaretPlaceholder();
	
	// find tag at current position
	var pair = matcher.getTags(info.content, caretPos, info.profile);
	if (pair && pair[0]) {
		var newContent = pair[0].full_tag;
		
		if (pair[1]) { // join tag
			var closingSlash = ' /';
			if (profile.self_closing_tag === true)
				closingSlash = '/';
				
			newContent = newContent.replace(/\s*>$/, closingSlash + '>');
			
			// add caret placeholder
			if (newContent.length + pair[0].start < caretPos)
				newContent += caret;
			else {
				var d = caretPos - pair[0].start;
				newContent = newContent.substring(0, d) + caret + newContent.substring(d);
			}
			
			editor.replaceContent(newContent, pair[0].start, pair[1].end);
		} else { // split tag
			var nl = utils.getNewline();
			var pad = zen_coding.require('resources').getVariable('indentation');
			
			// define tag content depending on profile
			var tagContent = (profile.tag_nl === true) ? nl + pad + caret + nl : caret;
					
			newContent = newContent.replace(/\s*\/>$/, '>') + tagContent + '</' + pair[0].name + '>';
			editor.replaceContent(newContent, pair[0].start, pair[0].end);
		}
		
		return true;
	}
	
	return false;
});