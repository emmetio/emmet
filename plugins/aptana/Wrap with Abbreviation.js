/*
 * Menu: Zen Coding > Wrap with Abbreviation
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0
 * Key: M1+M2+A
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 * @include "lib/core.js"
 * @include "settings.js"
 */

// init engine
try {
	include('my_zen_settings.js');
} catch(e){}

include('zencoding.js');

function main() {
	zen_editor.setContext(editors.activeEditor);
	var abbr = prompt('Enter abbreviation:');
	if (abbr)
		zen_coding.runAction('wrap_with_abbreviation', zen_editor, abbr);
}