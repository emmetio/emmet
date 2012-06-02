/**
 * Automatically updates image size attributes in HTML's &lt;img&gt; element or
 * CSS rule
 * @param {Function} require
 * @param {Underscore} _
 * @constructor
 * @memberOf __updateImageSizeAction
 */
zen_coding.exec(function(require, _) {
	/**
	 * Updates image size of &lt;img src=""&gt; tag
	 * @param {IZenEditor} editor
	 */
	function updateImageSizeHTML(editor) {
		var offset = editor.getCaretPos();
		
		// find tag from current caret position
		var info = require('editorUtils').outputInfo(editor);
		var xmlElem = require('xmlEditTree').parseFromPosition(info.content, offset, true);
		if (xmlElem && xmlElem.name().toLowerCase() == 'img') {
			
			var size = getImageSizeForSource(editor, xmlElem.value('src'));
			if (size) {
				var compoundData = xmlElem.range(true);
				xmlElem.value('width', size.width);
				xmlElem.value('height', size.height, xmlElem.indexOf('width') + 1);
				
				return _.extend(compoundData, {
					data: xmlElem.toString(),
					caret: offset
				});
			}
		}
		
		return null;
	}
	
	/**
	 * Updates image size of CSS property
	 * @param {IZenEditor} editor
	 */
	function updateImageSizeCSS(editor) {
		var offset = editor.getCaretPos();
		
		// find tag from current caret position
		var info = require('editorUtils').outputInfo(editor);
		var cssRule = require('cssEditTree').parseFromPosition(info.content, offset, true);
		if (cssRule) {
			// check if there is property with image under caret
			var prop = cssRule.itemFromPosition(offset, true), m;
			if (prop && (m = /url\((["']?)(.+?)\1\)/i.exec(prop.value() || ''))) {
				var size = getImageSizeForSource(editor, m[2]);
				if (size) {
					var compoundData = cssRule.range(true);
					cssRule.value('width', size.width + 'px');
					cssRule.value('height', size.height + 'px', cssRule.indexOf('width') + 1);
					
					return _.extend(compoundData, {
						data: cssRule.toString(),
						caret: offset
					});
				}
			}
		}
		
		return null;
	}
	
	/**
	 * Returns image dimensions for source
	 * @param {IZenEditor} editor
	 * @param {String} src Image source (path or data:url)
	 */
	function getImageSizeForSource(editor, src) {
		var fileContent;
		if (src) {
			// check if it is data:url
			if (/^data:/.test(src)) {
				fileContent = require('base64').decode( src.replace(/^data\:.+?;.+?,/, '') );
			} else {
				var file = require('file');
				var absPath = file.locateFile(editor.getFilePath(), src);
				if (absPath === null) {
					throw "Can't find " + src + ' file';
				}
				
				fileContent = String(file.read(absPath));
			}
			
			return require('actionUtils').getImageSize(fileContent);
		}
	}
	
	require('actions').add('update_image_size', function(editor) {
		var result;
		if (String(editor.getSyntax()) == 'css') {
			result = updateImageSizeCSS(editor);
		} else {
			result = updateImageSizeHTML(editor);
		}
		
		return require('actionUtils').compoundUpdate(editor, result);
	});
});