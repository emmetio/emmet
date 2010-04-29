/**
 * Zen Editor interface for EclipseMonkey  
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 * @include "../../javascript/zen_coding.js"
 */
var zen_editor = (function(){
	/** @type {editors.activeEditor} */
	var editor,
		is_filters_loaded = false;
	
	/**
	 * Returns whitrespace padding of string
	 * @param {String} str String line
	 * @return {String}
	 */
	function getStringPadding(str) {
		return (str.match(/^(\s+)/) || [''])[0];
	}
	
	/**
	 * Returns editor's content
	 * @return {String}
	 */
	function getContent() {
		return editor.source;
	}
	
	/**
	 * Get the type of the partition based on the current offset
	 * @param {Number} offset
	 * @return {String}
	 */
	function getPartition(offset){
		var class_name = String(editor.id || editor.textEditor.getClass()).toLowerCase();
		if (class_name.indexOf('xsleditor') != -1)
			return 'text/xsl';
		else if (class_name.indexOf('hamleditor') != -1)
			return 'text/haml';
		else if (class_name.indexOf('sasseditor') != -1)
			return 'text/css';
		else if (class_name.indexOf('.css.') != -1)
			return 'text/css';
		else if (class_name.indexOf('.html.') != -1)
			return 'text/html';
			
		try {
			var fileContext = editor.textEditor.getFileContext();
	
			if (fileContext !== null && fileContext !== undefined) {
				var partition = fileContext.getPartitionAtOffset(offset);
				return String(partition.getType());
			}
		} catch(e) {}
	
		return null;
	}
	
	/**
	 * Returns current editor type ('css', 'html', etc)
	 * @return {String|null}
	 */
	function getEditorType() {
		var content_types = {
			'text/html':  'html',
			'text/xml' :  'xml',
			'text/css' :  'css',
			'text/haml':  'haml',
			'text/xsl' :  'xsl'
		};
		
		return content_types[getPartition(editor.currentOffset)];
	}
	
	/**
	 * @return {LexemeList}
	 */
	function getLexemeList() {
		var result = null;
		var fileContext = getFileContext();
		
		if (fileContext !== null && fileContext !== undefined) {
			result = fileContext.getLexemeList();
		}
		
		return result;
	}
	
	/**
	 * @return {FileContext}
	 */
	function getFileContext() {
		var result = null;
		
		try	{
			result = editor.textEditor.getFileContext();
		} catch(e) {}
		
		return result;
	}
	
	/**
	 * Return lexeme from position
	 * @param {Number} pos Position where to get lexeme
	 * @return {Object}
	 */
	function getLexemeFromPosition(pos){
		var lexemeList = getLexemeList(), lx;
		if (lexemeList != null && lexemeList.size() > 0){
			for (var i = 0; i < lexemeList.size(); i++){
				lx = lexemeList.get(i);
				if(lx.getStartingOffset() <= pos && lx.getEndingOffset() >= pos){
					return lx;
				}
			}
		}
	
		return null;
	}
	
	/**
	 * Dynamically load Zen Coding filters
	 */
	function loadFilters() {
		if (is_filters_loaded)
			return;
			
		var File = Packages.java.io.File;
		var f = new File(location);
		var filter_dir = new File(f.getParent(), 'filters')
		
		if (filter_dir.exists()) {
			var files = filter_dir.listFiles();
			for (var i = 0, il = files.length; i < il; i++) {
				var file = files[i];
				if (file.getName().toLowerCase().endsWith('.js'))
					include(file);
			}
			
			is_filters_loaded = true
		}
	}
	
	/**
	 * Handle tab-stops (like $1 or ${1:label}) inside text: find them and create
	 * indexes for linked mode
	 * @param {String} text
	 * @return {Array} Array with new text and selection indexes (['...', -1,-1] 
	 * if there's no selection)
	 */
	function handleTabStops(text) {
		var re_tabstop = /\$(\d+)|\$\{(\d+):[^\}]+\}/g,
			carets = [],
			ranges = [];
			
		text = String(text);
		
		// find all carets
		var caret_placeholder = zen_coding.getCaretPlaceholder(),
			chunks = text.split(caret_placeholder),
			_offset = 0;
			
		if (chunks.length > 1) {
			for (var i = 0, il = chunks.length - 1; i < il; i++) {
				_offset += chunks[i].length;
				carets.push(_offset);
			}
			
			text = chunks.join('');
		}
		
		// now, process all tab-stops
		// we should process it in three iterations: find labels for tab-stops first,
		// then replace short notations (like $1) with labels (normalize), and 
		// finally save their positions
		var tabstop_labels = [];
		
		// find labels
		text.replace(/\$\{(\d+):([^\}]+)\}/g, function(str, p1, p2){
			tabstop_labels[parseInt(p1, 10)] = p2;
			return str;
		});
		
		// normalize tab-stops
		text = text.replace(re_tabstop, function(str, p1, p2) {
			var num = parseInt(p1 || p2, 10);
			if (tabstop_labels[num]) {
				return '${' + num + ':' + tabstop_labels[num] + '}';
			} else {
				return str;
				
			}
		});
		
		// save ranges
		re_tabstop.compile(re_tabstop.source, ''); // remove global flag
		var m;
		while (m = re_tabstop.exec(text)) {
			var pos = text.indexOf(m[0]),
				num = parseInt(m[1] || m[2], 10),
				label = tabstop_labels[num] || '';
				
			// replace tab-stop with label
			text = text.substring(0, pos) + label + text.substring(pos + m[0].length);
			re_tabstop.lastIndex = pos + label.length;
			
			// save range
			if (!ranges[num])
				ranges[num] = [];
				
			ranges[num].push([pos, pos + label.length]);
		}
		
		// add cursor positions to indexes
		for (var i = 0, il = carets.length; i < il; i++) {
			ranges.push([ [carets[i], carets[i]] ]);
		}
		
		ranges.sort(function(a, b) {
			return a[0][0] - b[0][0];
		});
		
		return [text, ranges];
	}
	
	return {
		/**
		 * Depreacted name of <code>setContext</code> method
		 * @deprecated
		 * @alias zen_editor#setContext
		 * @param {Object} obj Context editor
		 */
		setTarget: function(obj) {
			this.setContext(obj);
		},
		
		/**
		 * Setup underlying editor context. You should call this method 
		 * <code>before</code> using any Zen Coding action.
		 * @param {editors.activeEditor} context
		 */
		setContext: function(context) {
			editor = context;
			zen_coding.setNewline(editor.lineDelimiter);
			loadFilters();
		},
		
		/**
		 * Returns character indexes of selected text: object with <code>start</code>
		 * and <code>end</code> properties
		 * @return {Object}
		 * @example
		 * var selection = zen_editor.getSelectionRange();
		 * alert(selection.start + ', ' + selection.end); 
		 */
		getSelectionRange: function() {
			return {
				start: editor.selectionRange.startingOffset,
				end: editor.selectionRange.endingOffset
			};
		},
		
		/**
		 * Creates selection from <code>start</code> to <code>end</code> character
		 * indexes. If <code>end</code> is ommited, this method should place caret 
		 * and <code>start</code> index
		 * @param {Number} start
		 * @param {Number} [end]
		 * @example
		 * zen_editor.createSelection(10, 40);
		 * 
		 * //move caret to 15th character
		 * zen_editor.createSelection(15);
		 */
		createSelection: function(start, end) {
			if (arguments.length == 1)
				end = start;
			
			editor.selectAndReveal(start, end - start);
		},
		
		/**
		 * Returns current line's start and end indexes and object with <code>start</code>
		 * and <code>end</code> properties
		 * @return {Object}
		 * @example
		 * var range = zen_editor.getCurrentLineRange();
		 * alert(range.start + ', ' + range.end);
		 */
		getCurrentLineRange: function() {
			var range = this.getSelectionRange(),
				cur_line_num = editor.getLineAtOffset(range.start);
			
			return {
				start: editor.getOffsetAtLine(cur_line_num), 
				end: editor.getOffsetAtLine(cur_line_num + 1) - zen_coding.getNewline().length
			};
		},
		
		/**
		 * Returns current caret position
		 * @return {Number|null}
		 */
		getCaretPos: function(){
			return editor.currentOffset;
		},
		
		/**
		 * Set new caret position
		 */
		setCaretPos: function(pos){
			editor.currentOffset = pos;
		},
		
		/**
		 * Returns content of current line
		 * @return {String}
		 */
		getCurrentLine: function() {
			var range = this.getCurrentLineRange();
			return this.getContent().substring(range.start, range.end);
		},
		
		/**
		 * Replace editor's content or it's part (from <code>start</code> to 
		 * <code>end</code> index). If <code>value</code> contains 
		 * <code>caret_placeholder</code>, the editor will put caret into 
		 * this position. If you skip <code>start</code> and <code>end</code>
		 * arguments, the whole target's content will be replaced with 
		 * <code>value</code>. 
		 * 
		 * If you pass <code>start</code> argument only,
		 * the <code>value</code> will be placed at <code>start</code> string 
		 * index of current content. 
		 * 
		 * If you pass <code>start</code> and <code>end</code> arguments,
		 * the corresponding substring of current target's content will be 
		 * replaced with <code>value</code>. 
		 * @param {String} value Content you want to paste
		 * @param {Number} [start] Start index of editor's content
		 * @param {Number} [end] End index of editor's content
		 */
		replaceContent: function(value, start, end) {
			var content = this.getContent(),
				caret_pos = this.getCaretPos(),
				has_start = typeof(start) !== 'undefined',
				has_end = typeof(end) !== 'undefined',
				caret_placeholder = zen_coding.getCaretPlaceholder();
				
			// indent new value
			value = zen_coding.padString(value, getStringPadding(this.getCurrentLine()));
			var ts_result = handleTabStops(value),
				jface_link = Packages.org.eclipse.jface.text.link,
				links = ts_result[1];
			
			value = ts_result[0];
			start = start || 0;
			
			if (!links.length) {
				links.push([ [value.length, value.length] ]);
			}
			
//			editor.beginCompoundChange();
			try {
				if (has_start && has_end) {
					editor.applyEdit(start, end - start, value);
				} else if (has_start) {
					editor.applyEdit(start, 0, value);
				} else {
					editor.applyEdit(0, content.length, value);
				}
				
				if (links.length > 1 || links[0][0][0] != links[0][0][1]) {
					var viewer = editor.textEditor.viewer || editor.textEditor.getTextViewer(), 
						document = viewer.getDocument(),
						model = new jface_link.LinkedModeModel();
					
					for (var j = 0, jl = links.length; j < jl; j++) {
						var group = new jface_link.LinkedPositionGroup();
						for (var k = 0, kl = links[j].length; k < kl; k++) {
							group.addPosition(new jface_link.LinkedPosition(document, start + links[j][k][0], links[j][k][1] - links[j][k][0]));
						}
						model.addGroup(group);
					}
					
					model.forceInstall();
					
					var link_ui = new jface_link.LinkedModeUI(model, viewer);
					if (editor.textEditor.viewer)
						link_ui.setSimpleMode(true); // simple mode for Aptana
					link_ui.enter();
				} else {
					this.setCaretPos(start + links[0][0][0]);
				}
			} catch(e){
//				alert(e);
			}
//			editor.endCompoundChange();
		},
		
		/**
		 * Returns editor's content
		 * @return {String}
		 */
		getContent: getContent,
		
		/**
		 * Returns current editpr's syntax mode
		 * @return {String}
		 */
		getSyntax: function(){
			var syntax = getEditorType() || 'html';
			
			if (syntax == 'html') {
				// get the context tag
				var pair = zen_coding.html_matcher.getTags(this.getContent(), this.getCaretPos());
				if (pair && pair[0] && pair[0].type == 'tag' && pair[0].name.toLowerCase() == 'style') {
					// check that we're actually inside the tag
					if (pair[0].end <= caret_pos && pair[1].start >= caret_pos)
						syntax = 'css';
				}
			}
			
			return syntax;
		},
		
		/**
		 * Returns current output profile name (@see zen_coding#setupProfile)
		 * @return {String}
		 */
		getProfileName: function() {
			switch(getEditorType()) {
				 case 'xml':
				 case 'xsl':
				 	return 'xml';
				 case 'html':
				 	var profile = zen_coding.getVariable('profile');
				 	if (!profile) { // no forced profile, guess from content
					 	// html or xhtml?
				 		profile = this.getContent().search(/<!DOCTYPE[^>]+XHTML/) != -1 ? 'xhtml': 'html';
				 	}
				 	
				 	return profile;
			}
			
			return 'xhtml';
		}
	};
})();