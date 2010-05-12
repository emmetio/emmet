/*
 * Menu: Zen Coding > Encode/Decode image in data:url
 * Kudos: Sergey Chikuyonok (http://chikuyonok.ru)
 * License: EPL 1.0
 * Key: M1+5
 * DOM: http://download.eclipse.org/technology/dash/update/org.eclipse.eclipsemonkey.lang.javascript
 * 
 * @include "/EclipseMonkey/scripts/monkey-doc.js"
 */

include('zencoding.js');

function main() {
	zen_editor.setContext(editors.activeEditor);
	zen_coding.runAction('encode_decode_data_url', zen_editor);
}