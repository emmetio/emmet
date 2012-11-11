/**
 * AJAX module loader: loads undefined modules with synchronous AJAX request
 * and then evaluates it
 */
var ajaxLoader = (function(global) {
	function load(url) {
		var protocol = /^([\w-]+:)\/\//.test(url) ? RegExp.$1 : window.location.protocol;
		var xhr = new XMLHttpRequest();
		var result = null;
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				if ((xhr.status >= 200 && xhr.status < 300) || (xhr.status == 0 && protocol == 'file:')) {
					result = xhr.responseText;
				}
			}
		};
		
		xhr.open('GET', url, false);
		xhr.send(null);
		return result;
	}
	
	return {
		/**
		 * Creates module loader
		 * @returns {Function}
		 */
		moduleLoader: function() {
			var paths = _.toArray(arguments);
			return function(module) {
				_.find(paths, function(path) {
					var url = path + module + '.js';
					var result = load(url);
					if (result) {
						global['eval'](result);
					}
				});
			};
		},
		
		/**
		 * Loads JSON file synchronously
		 * @returns {Object}
		 */
		loadJSON: function(url) {
			var content = load(url);
			if (content)
				return JSON.parse(content);
		}
	};
})(this);