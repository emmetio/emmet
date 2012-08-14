/**
 * Runs Zen Coding action
 * @param {String} name Action name
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */
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

/**
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.exec(function(require, _) {
	function getContents(aURL) {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);
		var scriptableStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
				.getService(Components.interfaces.nsIScriptableInputStream);

		var channel = ioService.newChannel(aURL, null, null);
		var input = channel.open();
		scriptableStream.init(input);
		var str = scriptableStream.read(input.available());
		scriptableStream.close();
		input.close();
		return str;
	}
	
//	window.openDialog('chrome://global/content/console.xul', '_blank');
	
	// Load snippets
	var snippets = getContents('chrome://zencoding/content/js/snippets.json') || '{}';
	require('bootstrap').loadSystemSnippets(snippets);
	
	// Load extensions
	var extPath = require('file').createPath(DirIO.get('Home').path, 'zencoding');
	var rootDir = FileIO.open(extPath);
	
	if (rootDir.exists() && rootDir.isDirectory()) {
		var extFiles = _.reject(DirIO.read(rootDir, true), function(f) {
			return f.isDirectory();
		});
		
		extFiles = _.map(extFiles, function(f) {
			return FileIO.path(f);
		});
		
		require('bootstrap').loadExtensions(extFiles);
	}
});
