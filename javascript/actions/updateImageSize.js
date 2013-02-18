/**
 * Automatically updates image size attributes in HTML's &lt;img&gt; element or
 * CSS rule
 * @param {Function} require
 * @param {Underscore} _
 * @constructor
 * @memberOf __updateImageSizeAction
 */
emmet.exec(function(require, _) {
	/**
	 * Updates image size of &lt;img src=""&gt; tag
	 * @param {IEmmetEditor} editor
	 */
	function updateImageSizeHTML(editor) {
		var offset = editor.getCaretPos();
		
		// find tag from current caret position
		var info = require('editorUtils').outputInfo(editor);
		var xmlElem = require('xmlEditTree').parseFromPosition(info.content, offset, true);
		if (xmlElem && (xmlElem.name() || '').toLowerCase() == 'img') {
			getImageSizeForSource(editor, xmlElem.value('src'), function(size) {
				if (size) {
					var compoundData = xmlElem.range(true);
					xmlElem.value('width', size.width);
					xmlElem.value('height', size.height, xmlElem.indexOf('width') + 1);
					
					require('actionUtils').compoundUpdate(editor, _.extend(compoundData, {
						data: xmlElem.toString(),
						caret: offset
					}));
				}
			});
		}
	}
	
	/**
	 * Updates image size of CSS property
	 * @param {IEmmetEditor} editor
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
				getImageSizeForSource(editor, m[2], function(size) {
					if (size) {
						var compoundData = cssRule.range(true);
						cssRule.value('width', size.width + 'px');
						cssRule.value('height', size.height + 'px', cssRule.indexOf('width') + 1);
						
						require('actionUtils').compoundUpdate(editor, _.extend(compoundData, {
							data: cssRule.toString(),
							caret: offset
						}));
					}
				});
			}
		}
	}
	
	/**
	 * Returns image dimensions for source
	 * @param {IEmmetEditor} editor
	 * @param {String} src Image source (path or data:url)
	 */
	function getImageSizeForSource(editor, src, callback) {
		var fileContent;
		var au = require('actionUtils');
		if (src) {
			// check if it is data:url
			if (/^data:/.test(src)) {
				fileContent = require('base64').decode( src.replace(/^data\:.+?;.+?,/, '') );
				return callback(au.getImageSize(fileContent));
			}
			
			var file = require('file');
			var absPath = file.locateFile(editor.getFilePath(), src);
			if (absPath === null) {
				throw "Can't find " + src + ' file';
			}
			
			file.read(absPath, function(err, content) {
				if (err) {
					throw 'Unable to read ' + absPath + ': ' + err;
				}
				
				content = String(content);
				callback(au.getImageSize(content));
			});
		}
	}
	
	require('actions').add('update_image_size', function(editor) {
		// this action will definitely won’t work in SASS dialect,
		// but may work in SCSS or LESS
		if (_.include(['css', 'less', 'scss'], String(editor.getSyntax()))) {
			updateImageSizeCSS(editor);
		} else {
			updateImageSizeHTML(editor);
		}
		
		return true;
	});
});