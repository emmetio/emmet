/*
 * Menu: Zen Coding > Content Assist
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0
 * Key: M3+CTRL+ARROW_DOWN
 * OnLoad: onLoad()
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 */

try {
	include('my_zen_settings.js'); 
} catch(e){}
include('zencoding.js');

/**
 * Zen Coding content assistant routines for Eclipse editors.
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * 
 * @include "../../javascript/zen_coding.js"
 * @include "zen_editor.js"
 */var zen_content_assist = (function(){
	/** Cached code assist proposals for different syntaxes */
	var proposal_index = {},
		/** Currently installed content assistants */
		assistants = {},
		
		/** Content assist activation characters (typing one of these characters will call CA) */
		activation_chars = 'abcdefghijklmnopqrstuvwxyz!@$',
		TYPE = {
			ABBREVIATION: 1,
			SNIPPET: 2,
			TAG: 3
		},
		
		/** 
		 * A list of known editor ID's that will receive auto-activated 
		 * content assistants when opened. In unknown editors user have to 
		 * manually call and install CA  
		 */
		known_editors = [
			'org.eclipse.wst.css.core.csssource.source',
			'org.eclipse.wst.html.core.htmlsource.source',
			'org.eclipse.wst.xsl.ui.XSLEditor',
			'com.aptana.ide.editors.HTMLEditor',
			'com.aptana.ide.editors.CSSEditor'
		],
		
		/**
		 * Additional completition proposals for syntaxes
		 */
		additional = {
			'html': splitStr('address,applet,blockquote,button,dd,div,dl,dt,fieldset,form,frameset,hr,iframe,isindex,li,map,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul,a,abbr,acronym,applet,b,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,select,small,span,strike,strong,sub,sup,textarea,tt,u,var')
		};
	
	// translate activation characters into array
	var _chars = activation_chars;
	activation_chars = [];
	for (var i = 0, il = _chars.length; i < il; i++) {
		activation_chars.push(_chars.charAt(i));
	}
	
	function splitStr(str) {
		return str.split(',');
	}
		
	/**
	 * Internal code complete proposal object
	 * @param {Number} type Resource type (abbreviation, snippet)
	 * @param {Object|String} name Resource name (abbreviation)
	 * @param {Object|String} value Resource value (abbreviation value)
	 */
	function proposal(type, name, value) {
		value = value || name;
		
		return {
			type: type, 
			name: name,
			value: value
		};
	}
	
	function isAllowedChar(ch) {
		ch = String(ch);
		var char_code = ch.charCodeAt(0),
			special_chars = ':';
		
		return (char_code > 64 && char_code < 91)       // uppercase letter
				|| (char_code > 96 && char_code < 123)  // lowercase letter
				|| (char_code > 47 && char_code < 58)   // number
				|| special_chars.indexOf(ch) != -1;     // special character
	}
		
	/**
	 * Creates code-complete index for specified syntax
	 * @param {String} syntax
	 * @return {Object|null} First-letter indexed hash
	 */
	function createIndex(syntax) {
		var abbreviations = zen_coding.getResource(syntax, 'abbreviations'),
			snippets = zen_coding.getResource(syntax, 'snippets'),
			/** @type {proposal[]} */
			items = [],
			result = null;
			
		// fill cache
		var _exists = {};
		for (var p in abbreviations) if (abbreviations.hasOwnProperty(p)) {
			items.push(proposal(TYPE.ABBREVIATION, p, abbreviations[p].__ref));
			_exists[p] = true;
		}
		
		for (var p in snippets) if (snippets.hasOwnProperty(p)) {
			items.push(proposal(TYPE.SNIPPET, p, snippets[p]));
			_exists[p] = true;
		}
		
		// carefully add additional proposals: if it already exists — skip it
		if (syntax in additional) {
			var _add = additional[syntax]
			for (var i = 0, il = _add.length; i < il; i++) {
				if (!(_add[i] in _exists)) {
					items.push(proposal(TYPE.TAG, _add[i], 'Tag <' + _add[i] + '>'));
					_exists[_add[i]] = true;
				}
			}
		}
		
		items.sort(function(a, b){
			return a.name > b.name ? 1 : -1;
		});
		
		// split items by first letter for faster search
		if (items.length) {
			result = {};
			var item, cur_letter;
			for (var i = 0, il = items.length; i < il; i++) {
				item = items[i];
				if (item.name) {
					cur_letter = item.name.charAt(0);
					if (!(cur_letter in result)) {
						result[cur_letter] = [];
					}
					result[cur_letter].push(item);
				}
			}
		}
		
		return result;
	}
	
	/**
	 * Get all available and indexed proposals for code symtax
	 * @param {String} syntax
	 */
	function getProposalIndex(syntax) {
		if (!(syntax in proposal_index))
			proposal_index[syntax] = createIndex(syntax);
			
		return proposal_index[syntax];
	}
	
	/**
	 * Get content assist proposals for current document state
	 * @param {ITextViewer} viewer
	 * @param {Number} offset Caret position in document
	 * @param {String} syntax Code syntax
	 */
	function createProposals(viewer, offset, syntax) {
		var document = viewer.getDocument(),
			cur_offset = offset - 1,
			cur_word = '',
			cur_char = '';
			
		while (cur_offset > 0 && isAllowedChar(cur_char = String.fromCharCode(document.getChar(cur_offset)))) {
			cur_word = cur_char + cur_word;
			cur_offset--;
		}
		
		var proposals = null,
			suggestions = suggestWords(cur_word, syntax);
			
		if (suggestions.length) {
			proposals = [];
			var J_CA = Packages.org.eclipse.jface.text.contentassist;
			
			for (var i = 0, il = suggestions.length; i < il; i++) {
				/** @type {proposal} */
				var s = suggestions[i];
				var proposal = new J_CA.CompletionProposal(s.name, offset - cur_word.length, cur_word.length, s.name.length,
					getImage(s.type), s.name, null, s.value);
				
				proposals.push(proposal);
			}
		}
		return proposals;
	}
	
	/**
	 * Returs suggested code assist proposals for prefix
	 * @param {String} prefix Abbreviation prefix
	 * @param {String} syntax Code syntax
	 * @return {proposal[]}
	 */
	function suggestWords(prefix, syntax) {
		prefix = String(prefix);
		
		var proposals = getProposalIndex(syntax),
			result = [];
			
		if (prefix && proposals) {
			// narrow down search by first letter
			var first_letter = prefix.charAt();
			if (first_letter in proposals) {
				var items = proposals[first_letter];
				for (var i = 0, il = items.length; i < il; i++) {
					if (items[i].name.indexOf(prefix) == 0) {
						result.push(items[i]);
					}
				}
			}
		}
		
		return result;
	}
	
	function getInformationControlCreator() {
		return new JavaAdapter(Packages.org.eclipse.jface.text.IInformationControlCreator, {
			createInformationControl: function(shell) {
				return new Packages.org.eclipse.jface.text.DefaultInformationControl(shell);
			}
		});
	}
	
	function installContentAssistant(editor) {
		try{
		var J_TEXT = Packages.org.eclipse.jface.text;
		var J_CA = Packages.org.eclipse.jface.text.contentassist;
		
		
		var CompletionProcessor = new JavaAdapter(J_CA.IContentAssistProcessor, {
			computeCompletionProposals: function(viewer, offset) {
				zen_editor.setContext(editor);
				return createProposals(viewer, offset, zen_editor.getSyntax());
			},
		
			getCompletionProposalAutoActivationCharacters: function() {
				return activation_chars;
			}
		});
		
		var ca = new J_CA.ContentAssistant();
		ca.setContentAssistProcessor(CompletionProcessor, J_TEXT.IDocument.DEFAULT_CONTENT_TYPE);
		ca.setAutoActivationDelay(0);
		ca.enableAutoActivation(isKnownEditor(editor));
		ca.setInformationControlCreator(getInformationControlCreator());
		ca.install(editor.textEditor.viewer || editor.textEditor.getTextViewer());
		}catch(e){alert(e);}
		return ca;
	}
	
	function isKnownEditor(editor) {
		var id = String(editor.id).toLowerCase();
		for (var i = 0, il = known_editors.length; i < il; i++) {
			if (id == known_editors[i].toLowerCase())
				return true;
		}
		
		return false;
	}
	
	var img = null;
	function getImage() {
		if (!img) {
			img = new Packages.org.eclipse.swt.graphics.Image(window.getShell().getDisplay(), getAbsoluteUri('zc-icon.png'));
		}
		
		return img;
	}
	
	function getAbsoluteUri(img_path) {
		var File = Packages.java.io.File;
		var f = new File(location), // location is global property
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
	
	function printMessage(message) {
		out.println(message);
	}
	
	function inspect(obj) {
		var result = [];
		for (var p in obj) {
			result.push(p + ': ' + typeof(obj[p]));
		}
	
		printMessage(result.join('\n'));
	}
	
	return {
		/**
		 * Install content assist for specified editor
		 */
		install: function(editor, force) {
			var cur_editor = editor.textEditor,
				editor_id = cur_editor.toString();
		
			if (!(editor_id in assistants) && (force || isKnownEditor(editor))) {
				assistants[editor_id] = installContentAssistant(editor);
//				printMessage('content assist installed');
			}
		},
		
		/**
		 * Show currently available content assist proposals
		 */
		show: function(editor) {
			var cur_editor = editor.textEditor,
				editor_id = cur_editor.toString();
			
			if (!(editor_id in assistants))
				this.install(editor, true); // force CA install
				
			if (assistants[editor_id])
				assistants[editor_id].showPossibleCompletions();
		},
		
		isKnown: isKnownEditor,
		
		/**
		 * Auto-activate content assist for current editor and
		 * automatically add it to newly opened editors
		 */
		setListener: function() {
			var lst = new JavaAdapter(Packages.org.eclipse.ui.IPartListener, {
				partOpened: function(part) {
					setTimeout(function() {
						zen_content_assist.install(editors.activeEditor);
					}, 200);
				}
			});
			window.getActivePage().addPartListener(lst);
			
			// try to install on active editor
			this.install(editors.activeEditor);
		}
	};
})();

function main() {
	zen_content_assist.show(editors.activeEditor);
}

function onLoad() {
	zen_content_assist.setListener();
}