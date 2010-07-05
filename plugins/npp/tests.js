/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */

function charsInSelection() {
	var context = Editor.currentView,
		text = context.selection,
		result = [];
		
	for (var i = 0, il = text.length; i < il; i++) {
		result.push(text.charCodeAt(i));
	}
		
	alert(result.join(', '));
}

var testMenu = Editor.addMenu("Tests");
testMenu.addItem({
	text:"get file",
	cmd:charsInSelection
});