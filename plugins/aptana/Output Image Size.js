/*
 * Menu: Zen Coding > Output Image Size 
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0 
 * Key: CTRL+I
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 */
 
function main(){
	var editor = editors.activeEditor,
		offset = editor.currentOffset;
		
	var image = findImage();
	if (image) {
		var size = getImageSize(image.tag);
		if (size) {
			var new_tag = replaceOrAppend(image.tag, 'width', size.width);
			new_tag = replaceOrAppend(new_tag, 'height', size.height);
			
			editor.applyEdit(image.start, image.end - image.start, new_tag);
			editor.currentOffset = offset;
		}
	}
}

/**
 * Replaces or adds attribute to the tag
 * @param {String} img_tag
 * @param {String} attr_name
 * @param {String} attr_value
 */
function replaceOrAppend(img_tag, attr_name, attr_value) {
	if (img_tag.toLowerCase().indexOf(attr_name) != -1) {
		// attribute exists
		var re = new RegExp(attr_name + '=([\'"])(.*?)([\'"])', 'i');
		return img_tag.replace(re, function(str, p1, p2){
			return attr_name + '=' + p1 + attr_value + p1;
		});
	} else {
		return img_tag.replace(/\s*(\/?>)$/, ' ' + attr_name + '="' + attr_value + '" $1');
	}
}

/**
 * Find image tag under caret
 * @return Image tag and its indexes inside editor source
 */
function findImage() {
	var editor = editors.activeEditor,
		caret_pos = editor.currentOffset,
		start_ix = -1,
		end_ix = -1;
	
	// find the beginning of the tag
	do {
		if (caret_pos < 0)
			break;
		if (editor.source.charAt(caret_pos) == '<') {
			if (editor.source.substring(caret_pos, caret_pos + 4).toLowerCase() == '<img') {
				// found the beginning of the image tag
				start_ix = caret_pos;
				break;
			} else {
				// found some other tag
				return null;
			}
		}
	}while(caret_pos--);
	
	// find the end of the tag 
	caret_pos = editor.currentOffset;
	do {
		if (caret_pos >= editor.sourceLength)
			break;
			
		if (editor.source.charAt(caret_pos) == '>') {
			end_ix = caret_pos + 1;
			break;
		}
	}while(caret_pos++);
	
	if (start_ix != -1 && end_ix != -1)
		
		return {
			start: start_ix,
			end: end_ix,
			tag: editor.source.substring(start_ix, end_ix)
		};
	
	return null;
}

/**
 * Returns size of image in &lt;img&gt; tag
 * @param {String} img Image tag
 * @return {Object|null} Object with <code>width</code> and <code>height</code> attributes
 */
function getImageSize(img) {
	var re = /\bsrc=(["'])(.+?)\1/i, m, src;
	if (m = re.exec(img))
		src = m[2];
	
	if (src) {
		var toolkit = Packages.java.awt.Toolkit.getDefaultToolkit();
		var image = toolkit.getImage(getAbsoluteUri(src));
		
		return {
			width: image.getWidth(),
			height: image.getHeight()
		};
	}
	
	return null;
}

function getAbsoluteUri(img_path) {
	var File = Packages.java.io.File;
	var f = new File(editors.activeEditor.uri.substring(5)),
		image_uri = '';
		
	// traverse upwards to find image uri
	while (f.getParent()) {
		var img = new File(f.getParent(), img_path);
		if (img.exists()) {
			image_uri = img.getCanonicalPath();
			break;
		}
		
		f = new File(f.getParent());
	}
	
	return image_uri;
}