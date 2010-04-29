/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */function installTabExpander(editor) {
	var viewer = editor.textEditor.viewer || editor.textEditor.getTextViewer(), 
		document = viewer.getDocument();
		
	document.addDocumentListener(new JavaAdapter(Packages.org.eclipse.jface.text.IDocumentListener, {
		documentChanged: function(evt) {
			if (!evt.getLength() && evt.getText() == '\t') {
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
}