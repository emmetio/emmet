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
				var args = [zen_editor];
				if (arguments.length > 1)
					args = args.concat(Array.prototype.slice.call(arguments, 1));
				return zen_coding.runAction(name, args);
			} catch(e) {
				alert('Error while running Zen Coding action: ' + e.message);
			}
		}
	}
})();