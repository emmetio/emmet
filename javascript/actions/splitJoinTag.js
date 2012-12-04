/**
 * Splits or joins tag, e.g. transforms it into a short notation and vice versa:<br>
 * &lt;div&gt;&lt;/div&gt; → &lt;div /&gt; : join<br>
 * &lt;div /&gt; → &lt;div&gt;&lt;/div&gt; : split
 * @param {Function} require
 * @param {Underscore} _
 * @memberOf __splitJoinTagAction
 * @constructor
 */
emmet.exec(function(require, _) {
	/**
	 * @param {IEmmetEditor} editor
	 * @param {Object} profile
	 * @param {Object} tag
	 */
	function joinTag(editor, profile, tag) {
		/** @type emmet.utils */
		var utils = require('utils');
		
		// empty closing slash is a nonsense for this action
		var slash = profile.selfClosing() || ' /';
		var content = tag.open.range.substring(tag.source).replace(/\s*>$/, slash + '>');
		
		// add caret placeholder
		if (content.length + tag.outerRange.start < editor.getCaretPos())
			content += utils.getCaretPlaceholder();
		else {
			var d = editor.getCaretPos() - tag.outerRange.start;
			content = utils.replaceSubstring(content, utils.getCaretPlaceholder(), d);
		}
		
		editor.replaceContent(content, tag.outerRange.start, tag.outerRange.end);
		return true;
	}
	
	function splitTag(editor, profile, tag) {
		/** @type emmet.utils */
		var utils = require('utils');
		
		var nl = utils.getNewline();
		var pad = require('resources').getVariable('indentation');
		var caret = utils.getCaretPlaceholder();
		
		// define tag content depending on profile
		var tagContent = (profile.tag_nl === true) ? nl + pad + caret + nl : caret;
		var content = tag.outerContent().replace(/\s*\/>$/, '>') + tagContent + '</' + tag.open.name + '>';
				
		editor.replaceContent(content, tag.outerRange.start, tag.outerRange.end);
		return true;
	}
	
	require('actions').add('split_join_tag', function(editor, profileName) {
		var matcher = require('htmlMatcher');
		
		var info = require('editorUtils').outputInfo(editor, null, profileName);
		var profile = require('profile').get(info.profile);
		
		// find tag at current position
		var tag = matcher.tag(info.content, editor.getCaretPos());
		if (tag) {
			return tag.close 
				? joinTag(editor, profile, tag) 
				: splitTag(editor, profile, tag);
		}
		
		return false;
	}, {label: 'HTML/Split\\Join Tag Declaration'});
});