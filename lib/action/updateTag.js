/**
 * Update Tag action: allows users to update existing HTML tags and add/remove
 * attributes or even tag name
 */
if (typeof module === 'object' && typeof define !== 'function') {
	var define = function (factory) {
		module.exports = factory(require, exports, module);
	};
}

define(function(require, exports, module) {
	var _ = require('lodash');
	var xmlEditTree = require('../editTree/xml');
	var editorUtils = require('../utils/editor');
	var actionUtils = require('../utils/action');
	var parser = require('../parser/abbreviation');

	function updateAttributes(tag, abbrNode, ix) {
		var classNames = (abbrNode.attribute('class') || '').split(/\s+/g);
		if (ix) {
			classNames.push('+' + abbrNode.name());
		}

		// update class
		_.each(classNames, function(className) {
			if (!className) {
				return;
			}

			var ch = className.charAt(0);
			if (ch == '+') {
				tag.addClass(className.substr(1));
			} else if (ch == '-') {
				tag.removeClass(className.substr(1));
			} else {
				tag.value('class', className);
			}
		});

		// update attributes
		_.each(abbrNode.attributeList(), function(attr) {
			if (attr.name.toLowerCase() == 'class') {
				return;
			}

			var ch = attr.name.charAt(0);
			if (ch == '+') {
				var attrName = attr.name.substr(1);
				var tagAttr = tag.get(attrName);
				if (tagAttr) {
					tagAttr.value(tagAttr.value() + atr.value);
				} else {
					tag.value(attrName, attr.value);
				}
			} else if (ch == '-') {
				tag.remove(attr.name.substr(1));
			} else {
				tag.value(attr.name, attr.value);
			}
		});
	}
	
	return {
		/**
		 * Matches HTML tag under caret and updates its definition
		 * according to given abbreviation
		 * @param {IEmmetEditor} Editor instance
		 * @param {String} abbr Abbreviation to update with
		 * @param {String} syntax Syntax type (html, css, etc.)
		 * @param {String} profile Output profile name (html, xml, xhtml)
		 */
		updateTagAction: function(editor, abbr, syntax, profile) {
			var info = editorUtils.outputInfo(editor, syntax, profile);
			abbr = abbr || editor.prompt("Enter abbreviation");
			
			if (!abbr) {
				return false;
			}
			
			abbr = String(abbr);
			var ctx = actionUtils.captureContext(editor);

			if (!ctx) {
				// nothing to update
				return false;
			}

			var tree = parser.parse(abbr);

			// for this action some characters in abbreviation has special
			// meaning. For example, `.-c2` means “remove `c2` class from
			// element” and `.+c3` means “append class `c3` to exising one.
			// 
			// But `.+c3` abbreviation will actually produce two elements:
			// <div class=""> and <c3>. Thus, we have to walk on each element
			// of parsed tree and use their definitions to update current element
			var tag = xmlEditTree.parse(ctx.match.open.range.substring(info.content), {
				offset: ctx.match.outerRange.start
			});

			_.each(tree.children, function(node, i) {
				updateAttributes(tag, node, i);
			});

			// check if tag name was updated
			var newName = tree.children[0].name();
			if (tag.name() != newName && ctx.match.close) {
				editor.replaceContent('</' + newName + '>', ctx.match.close.range.start, ctx.match.close.range.end, true);
				tag.name(newName);
			}

			editor.replaceContent(tag.source, ctx.match.open.range.start, ctx.match.open.range.end, true);
			return true;
		}
	};
});