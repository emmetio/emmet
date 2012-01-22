/**
 * Automatically updates image size attributes in HTML's &lt;img&gt; element or
 * CSS rule
 * @constructor
 * @memberOf __zenUpdateImageSizeAction
 */
(function() {
	zen_coding.require('actions').add('update_image_size', function(editor) {
		var result;
		if (String(editor.getSyntax()) == 'css') {
			result = updateImageSizeCSS(editor);
		} else {
			result = updateImageSizeHTML(editor);
		}
		
		return zen_coding.require('actionUtils').compoundUpdate(editor, result);
	});
	
	/**
	 * Updates image size of &lt;img src=""&gt; tag
	 * @param {IZenEditor} editor
	 */
	function updateImageSizeHTML(editor) {
		var offset = editor.getCaretPos();
		/** @type zen_coding.actionUtils */
		var actionUtils = zen_coding.require('actionUtils');
			
		var image = findImage(editor);
		if (image) {
			var re = /\bsrc=(["'])(.+?)\1/i, m, src;
			if (m = re.exec(image.tag))
				src = m[2];
			
			if (src) {
				var size = getImageSizeForSource(editor, src);
				if (size) {
					var newTag = actionUtils.replaceOrAppendHTMLAttribute(image.tag, 'width', size.width);
					newTag = actionUtils.replaceOrAppendHTMLAttribute(newTag, 'height', size.height);
					
					return {
						'data': newTag,
						'start': image.start,
						'end': image.end,
						'caret': offset
					};
				}
			}
		}
		
		return null;
	}
	
	/**
	 * Find image tag under caret
	 * @param {IZenEditor} editor
	 * @return Image tag and its indexes inside editor source
	 */
	function findImage(editor) {
		var caretPos = editor.getCaretPos();
		var content = String(editor.getContent());
		var contentLen = content.length;
		var startIx = -1;
		var endIx = -1;
		
		// find the beginning of the tag
		do {
			if (caretPos < 0)
				break;
			if (content.charAt(caretPos) == '<') {
				if (content.substring(caretPos, caretPos + 4).toLowerCase() == '<img') {
					// found the beginning of the image tag
					startIx = caretPos;
					break;
				} else {
					// found some other tag
					return null;
				}
			}
		} while(caretPos--);
		
		// find the end of the tag 
		caretPos = editor.getCaretPos();
		do {
			if (caretPos >= contentLen)
				break;
				
			if (content.charAt(caretPos) == '>') {
				endIx = caretPos + 1;
				break;
			}
		} while(caretPos++);
		
		if (startIx != -1 && endIx != -1)
			
			return {
				start: startIx,
				end: endIx,
				tag: content.substring(startIx, endIx)
			};
		
		return null;
	}
	
	/**
	 * Returns image dimensions for source
	 * @param {IZenEditor} editor
	 * @param {String} src Image source (path or data:url)
	 */
	function getImageSizeForSource(editor, src) {
		var fileContent;
		var file = zen_coding.require('file');
		if (src) {
			// check if it is data:url
			if (startsWith('data:', src)) {
				fileContent = zen_coding.requie('base64').decode( src.replace(/^data\:.+?;.+?,/, '') );
			} else {
				var abs_path = file.locateFile(editor.getFilePath(), src);
				if (abs_path === null) {
					throw "Can't find " + src + ' file';
				}
				
				fileContent = String(file.read(abs_path));
			}
			
			return zen_coding.require('actionUtils').getImageSize(fileContent);
		}
	}
	
	/**
	 * Test if <code>text</code> starts with <code>token</code> at <code>pos</code>
	 * position. If <code>pos</code> is ommited, search from beginning of text 
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
	 * Replace substring of <code>text</code>, defined by <code>start</code> and 
	 * <code>end</code> indexes with <code>new_value</code>
	 * @param {String} text
	 * @param {Number} start
	 * @param {Number} end
	 * @param {String} new_value
	 * @return {String}
	 */
	function replaceSubstring(text, start, end, new_value) {
		return text.substring(0, start) + new_value + text.substring(end);
	}
	
	/**
	 * Updates image size of CSS rule
	 * @param {IZenEditor} editor
	 */
	function updateImageSizeCSS(editor) {
		var parserUtils = zen_coding.require('parserUtils');
		
		var caretPos = editor.getCaretPos();
		var content = String(editor.getContent());
		var rule = parserUtils.extractCSSRule(content, caretPos, true);
			
		
		if (rule) {
			var css = parserUtils.parseCSS(content.substring(rule[0], rule[1]), rule[0]);
			var curToken = parserUtils.findTokenFromPosition(css, caretPos, 'identifier');
			var value = parserUtils.findValueToken(css, curToken + 1);
				
			if (!value) return false;
			
			// find insertion point
			var insPoint = parserUtils.findCSSInsertionPoint(css, curToken);
				
			var m;
			if (m = /url\((["']?)(.+?)\1\)/i.exec(value.content)) {
				var size = getImageSizeForSource(editor, m[2]);
				if (size) {
					var wh = {width: null, height: null};
					var updates = [];
					var styler = parserUtils.learnCSSStyle(css, curToken);
						
					for (var i = 0, il = css.length; i < il; i++) {
						if (css[i].type == 'identifier' && css[i].content in wh)
							wh[css[i].content] = i;
					}
					
					function update(name, val) {
						var v;
						if (wh[name] !== null && (v = parserUtils.findValueToken(css, wh[name] + 1))) {
							updates.push([v.start, v.end, val + 'px']);
						} else {
							updates.push([insPoint.token.end, insPoint.token.end, styler(name, val + 'px')]);
						}
					}
					
					update('width', size.width);
					update('height', size.height);
					
					if (updates.length) {
						updates.sort(function(a, b){return a[0] - b[0];});
						
						// some editors do not provide easy way to replace multiple code 
						// fragments so we have to squash all replace operations into one
						var data = content.substring(updates[0][0], updates[updates.length - 1][1]),
							offset = updates[0][0];
							
						for (var i = updates.length - 1; i >= 0; i--) {
							var u = updates[i];
							data = replaceSubstring(data, u[0] - offset, u[1] - offset, u[2]);
								
							// also calculate new caret position
							if (u[0] < caretPos)
								caretPos += u[2].length - u[1] + u[0];
						}
						
						if (insPoint.need_col)
							data = replaceSubstring(data, insPoint.token.end - offset, insPoint.token.end - offset, ';');
						
						return {
							'data': data,
							'start': offset,
							'end': updates[updates.length - 1][1],
							'caret': caretPos
						};
						
					}
				}
			}
		}
			
		return false;
	}
})();