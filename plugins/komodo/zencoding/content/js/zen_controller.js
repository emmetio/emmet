/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */var zen_controller = (function(){
	return {
		/**
		 * Runs Zen Coding action
		 * @param {String} name Action name
		 */
		runAction: function(name) {
			try {
				zen_editor.setContext(ko.views.manager.currentView);
				if (name == 'wrap_with_abbreviation') {
					var abbr = ko.dialogs.prompt('Enter abbreviation:');
					if (abbr)
						return zen_coding.runAction(name, zen_editor, abbr);
				} else {
					return zen_coding.runAction(name, zen_editor);
				}
			} catch(e) {
				alert(e);
			}
		}
	}
})();