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
			var textEditor = editor.textEditor,
				editor_id = textEditor.toString(),
				viewer = textEditor.viewer || textEditor.getTextViewer(),
				widget = viewer.getTextWidget(),
				document = textEditor.getDocumentProvider().getDocument(textEditor.getEditorInput());
				
			if (editor_id in installed_editors && !force)
				return;
				
			widget.addVerifyKeyListener(new JavaAdapter(Packages.org.eclipse.swt.custom.VerifyKeyListener, {
				verifyKey: function(event) {
					if (!is_allowed || !viewer || !document) {
						return;
					}
			
					// If the editor is linked editing mode - let it do the TAB key processing
					if (Packages.org.eclipse.jface.text.link.LinkedModeModel.hasInstalledModel(document)) {
						return;
					}
			
					if (event.doit && event.keyCode == 9) {
						var selection = textEditor.getSelectionProvider().getSelection();
						if (selection.getLength() == 0) {
							var offset = selection.getOffset();
							try {
								zen_editor.setContext(editors.activeEditor);
					
								var cur_line = zen_editor.getCurrentLineRange(),
									abbr = zen_coding.extractAbbreviation(zen_editor.getContent().substring(cur_line.start, offset));
									
								if (abbr) {
									var caret_pos = offset;
									var content = zen_coding.expandAbbreviation(abbr, zen_editor.getSyntax(), zen_editor.getProfileName());
									if (content) {
										zen_editor.replaceContent(content, offset - abbr.length, offset);
										event.doit = false;
									}
								}
							} catch (e) {
								return;
							}
						}
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