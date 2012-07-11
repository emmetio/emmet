/**
 * Runs Zen Coding action
 * @param {String} name Action name
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru */
function runZenCodingAction(name) {
	try {
		editorProxy.setContext(ko.views.manager.currentView);
		var args = [editorProxy];
		if (arguments.length > 1)
			args = args.concat(Array.prototype.slice.call(arguments, 1));
		
		return zen_coding.require('actions').run(name, args);
	} catch(e) {
		alert('Error while running Zen Coding action: ' + e.message);
	}
}