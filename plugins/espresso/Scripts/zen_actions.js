var zen = loadLibrary('zen');

action.performWithContext = function(context, outError) {
	var response = zen.engine.runAction(action.setup.action, new zen.ZenEditor(context));
	return response;
}