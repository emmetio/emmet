/**
 * Encodes/decodes image under cursor to/from base64
 * @param {IEmmetEditor} editor
 * @since 0.65
 * 
 * @memberOf __base64ActionDefine
 * @constructor
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	require('actions').add('encode_decode_data_url', function(editor) {
		var data = String(editor.getSelection());
		var caretPos = editor.getCaretPos();
			
		if (!data) {
			// no selection, try to find image bounds from current caret position
			var text = String(editor.getContent()),  m;
			while (caretPos-- >= 0) {
				if (startsWith('src=', text, caretPos)) { // found <img src="">
					if ((m = text.substr(caretPos).match(/^(src=(["'])?)([^'"<>\s]+)\1?/))) {
						data = m[3];
						caretPos += m[1].length;
					}
					break;
				} else if (startsWith('url(', text, caretPos)) { // found CSS url() pattern
					if ((m = text.substr(caretPos).match(/^(url\((['"])?)([^'"\)\s]+)\1?/))) {
						data = m[3];
						caretPos += m[1].length;
					}
					break;
				}
			}
		}
		
		if (data) {
			if (startsWith('data:', data))
				return decodeFromBase64(editor, data, caretPos);
			else
				return encodeToBase64(editor, data, caretPos);
		}
		
		return false;
	}, {label: 'Encode\\Decode data:URL image'});
	
	/**
	 * Test if <code>text</code> starts with <code>token</code> at <code>pos</code>
	 * position. If <code>pos</code> is omitted, search from beginning of text 
	 * @param {String} token Token to test
	 * @param {String} text Where to search
	 * @param {Number} pos Position where to start search
	 * @return {Boolean}
	 * @since 0.65
	 */
	function startsWith(token, text, pos) {
		pos = pos || 0;
		return text.charAt(pos) == token.charAt(0) && text.substr(pos, token.length) == token;
	}
	
	/**
	 * Encodes image to base64
	 * 
	 * @param {IEmmetEditor} editor
	 * @param {String} imgPath Path to image
	 * @param {Number} pos Caret position where image is located in the editor
	 * @return {Boolean}
	 */
	function encodeToBase64(editor, imgPath, pos) {
		var file = require('file');
		var actionUtils = require('actionUtils');
		
		var editorFile = editor.getFilePath();
		var defaultMimeType = 'application/octet-stream';
			
		if (editorFile === null) {
			throw "You should save your file before using this action";
		}
		
		// locate real image path
		var realImgPath = file.locateFile(editorFile, imgPath);
		if (realImgPath === null) {
			throw "Can't find " + imgPath + ' file';
		}
		
		file.read(realImgPath, function(err, content) {
			if (err) {
				throw 'Unable to read ' + realImgPath + ': ' + err;
			}
			
			var b64 = require('base64').encode(String(content));
			if (!b64) {
				throw "Can't encode file content to base64";
			}
			
			b64 = 'data:' + (actionUtils.mimeTypes[String(file.getExt(realImgPath))] || defaultMimeType) +
				';base64,' + b64;
				
			editor.replaceContent('$0' + b64, pos, pos + imgPath.length);
		});
		
		
		return true;
	}

	/**
	 * Decodes base64 string back to file.
	 * @param {IEmmetEditor} editor
	 * @param {String} data Base64-encoded file content
	 * @param {Number} pos Caret position where image is located in the editor
	 */
	function decodeFromBase64(editor, data, pos) {
		// ask user to enter path to file
		var filePath = String(editor.prompt('Enter path to file (absolute or relative)'));
		if (!filePath)
			return false;
			
		var file = require('file');
		var absPath = file.createPath(editor.getFilePath(), filePath);
		if (!absPath) {
			throw "Can't save file";
		}
		
		file.save(absPath, require('base64').decode( data.replace(/^data\:.+?;.+?,/, '') ));
		editor.replaceContent('$0' + filePath, pos, pos + data.length);
		return true;
	}
});
