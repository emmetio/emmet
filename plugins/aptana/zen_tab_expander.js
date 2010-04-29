/**
 * Almost native abbreviation expander with Tab key.
 * It doesn't block other Tab key usage like placeholder traversal etc. 
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */var zen_tab_expander = (function(){
	var is_allowed = true,
		installed_editors = {};
	
	return {
		install: function(editor, force) {
			var cur_editor = editor.textEditor,
				viewer = cur_editor.viewer || cur_editor.getTextViewer(), 
				document = viewer.getDocument(),
				editor_id = cur_editor.toString();
				
			if (editor_id in installed_editors && !force)
				return;
				
			document.addDocumentListener(new JavaAdapter(Packages.org.eclipse.jface.text.IDocumentListener, {
				documentChanged: function(evt) {
					if (is_allowed && !evt.getLength() && evt.getText() == '\t') {
						var offset = evt.getOffset();
						
						setTimeout(function() {
							zen_editor.setContext(editor);
							
							var cur_line = zen_editor.getCurrentLineRange(),
								abbr = zen_coding.extractAbbreviation(zen_editor.getContent().substring(cur_line.start, offset));
								
							if (abbr) {
								var caret_pos = offset;
								var content = zen_coding.expandAbbreviation(abbr, zen_editor.getSyntax(), zen_editor.getProfileName());
								if (content) {
									zen_editor.replaceContent(content, offset - abbr.length, offset + 1);
								}
							}
						}, 1);
					}
				}
			}));
			
			installed_editors[editor_id] = true;
		},
		
		/**
		 * Setup listener that will handle Tab keypress on newly created editor
		 */
		setListener: function() {
			var lst = new JavaAdapter(Packages.org.eclipse.ui.IPartListener, {
				partOpened: function(part) {
					setTimeout(function() {
						zen_tab_expander.install(editors.activeEditor);
					}, 200);
				}
			});
			window.getActivePage().addPartListener(lst);
			
			// try to install on active editor
			this.install(editors.activeEditor);
		},
		
		/**
		 * Is abbreviation expanding allowed. Set to 'false' will disable tab
		 * expander
		 */
		isAllowed: function(value) {
			if (arguments.length)
				is_allowed = Boolean(value);
				
			return is_allowed;
		}
	}
})();