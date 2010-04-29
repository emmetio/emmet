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
include('zen_tab_expander.js');

var use_tab_expander = true;

function main() {
	zen_editor.setContext(editors.activeEditor);
	zen_coding.runAction('expand_abbreviation', zen_editor);
	
	// try to install tab expander, if it wasn't installed automatically
	zen_tab_expander.install(editors.activeEditor);
}

function onLoad() {
	zen_tab_expander.isAllowed(use_tab_expander);
	zen_tab_expander.setListener();
}