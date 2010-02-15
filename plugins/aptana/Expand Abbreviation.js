/*
 * Menu: Zen Coding > Expand Abbreviation
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0
 * Key: M1+E
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 * @include "../../javascript/zen_editor.js"
 * @include "../../javascript/zen_coding.js"
 * @include "../../javascript/zen_actions.js"
 */

// init engine
try {
	include('my_zen_settings.js');
} catch(e){}
include('zencoding.js');

function main() {
	zen_editor.setContext(editors.activeEditor);
	zen_coding.runAction('expand_abbreviation', zen_editor);
}