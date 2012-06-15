/**
 * Splits or joins tag, e.g. transforms it into a short notation and vice versa:<br>
 * &lt;div&gt;&lt;/div&gt; → &lt;div /&gt; : join<br>
 * &lt;div /&gt; → &lt;div&gt;&lt;/div&gt; : split
 * @param {Function} require
 * @param {Underscore} _
 * @memberOf __splitJoinTagAction
 * @constructor
 */
zen_coding.exec(function(require, _) {
	/**
	 * @param {IZenEditor} editor
	 * @param {Object} profile
	 * @param {Object} htmlMatch
	 */
	function joinTag(editor, profile, htmlMatch) {
		/** @type zen_coding.utils */
		var utils = require('utils');
		
		var closingSlash = (profile.self_closing_tag === true) ? '/' : ' /';
		var content = htmlMatch[0].full_tag.replace(/\s*>$/, closingSlash + '>');
		
		// add caret placeholder
		if (content.length + htmlMatch[0].start < editor.getCaretPos())
			content += utils.getCaretPlaceholder();
		else {
			var d = editor.getCaretPos() - htmlMatch[0].start;
			content = utils.replaceSubstring(content, utils.getCaretPlaceholder(), d);
		}
		
		editor.replaceContent(content, htmlMatch[0].start, htmlMatch[1].end);
		return true;
	}
	
	function splitTag(editor, profile, htmlMatch) {
		/** @type zen_coding.utils */
		var utils = require('utils');
		
		var nl = utils.getNewline();
		var pad = require('resources').getVariable('indentation');
		var caret = utils.getCaretPlaceholder();
		
		// define tag content depending on profile
		var tagContent = (profile.tag_nl === true) ? nl + pad + caret + nl : caret;
				
		var content = htmlMatch[0].full_tag.replace(/\s*\/>$/, '>') + tagContent + '</' + htmlMatch[0].name + '>';
		editor.replaceContent(content, htmlMatch[0].start, htmlMatch[0].end);
		return true;
	}
	
	require('actions').add('split_join_tag', function(editor, profileName) {
		var matcher = require('html_matcher');
		
		var info = require('editorUtils').outputInfo(editor, null, profileName);
		var profile = require('profile').get(info.profile);
		
		// find tag at current position
		var pair = matcher.getTags(info.content, editor.getCaretPos(), info.profile);
		if (pair && pair[0]) {
			if (pair[1]) { // join tag
				return joinTag(editor, profile, pair);
			}
			return splitTag(editor, profile, pair);
		}
		
		return false;
	}, {label: 'HTML/Split\\Join Tag Declaration'});
});