/**
 * A back-end bootstrap module with commonly used methods for loading user data
 * @param {Function} require
 * @param {Underscore} _  
 */
emmet.define('bootstrap', function(require, _) {
	
	/**
	 * Returns file name part from path
	 * @param {String} path Path to file
	 * @return {String}
	 */
	function getFileName(path) {
		var re = /([\w\.\-]+)$/i;
		var m = re.exec(path);
		return m ? m[1] : '';
	}
	
	/**
	 * Returns base path (path to folder of file)
	 * @param {String} path Path to file
	 * @return {String}
	 */
	function getBasePath(path) {
		return path.substring(0, path.length - getFileName(path).length);
	}
	
	return {
		/**
		 * Loads Emmet extensions. Extensions are simple .js files that
		 * uses Emmet modules and resources to create new actions, modify
		 * existing ones etc.
		 * @param {Array} fileList List of absolute paths to files in extensions 
		 * folder. Back-end app should not filter this list (e.g. by extension) 
		 * but return it "as-is" so bootstrap can decide how to load contents 
		 * of each file.
		 * This method requires a <code>file</code> module of <code>IEmmetFile</code> 
		 * interface to be implemented.
		 */
		loadExtensions: function(fileList) {
			var file = require('file');
			var payload = {};
			_.each(fileList, function(f) {
				switch (file.getExt(f)) {
					case 'js':
						try {
							eval(file.read(f));
						} catch (e) {
							emmet.log('Unable to eval "' + f + '" file: '+ e);
						}
						break;
					case 'json':
						var fileName = getFileName(f).toLowerCase().replace(/\.json$/, '');
						payload[fileName] = file.read(f);
						break;
				}
			});
			
			this.loadUserData(payload);
		},
		
		/**
		 * Loads preferences from JSON object (or string representation of JSON)
		 * @param {Object} data
		 * @returns
		 */
		loadPreferences: function(data) {
			require('preferences').load(this.parseJSON(data));
		},
		
		/**
		 * Loads user snippets and abbreviations. It doesn’t replace current
		 * user resource vocabulary but merges it with passed one. If you need 
		 * to <i>replaces</i> user snippets you should call 
		 * <code>resetSnippets()</code> method first
		 */
		loadSnippets: function(data) {
			data = this.parseJSON(data);
			
			var res = require('resources');
			var userData = res.getVocabulary('user') || {};
			res.setVocabulary(require('utils').deepMerge(userData, data), 'user');
		},
		
		/**
		 * Helper function that loads default snippets, defined in project’s
		 * <i>snippets.json</i>
		 * @param {Object} data
		 */
		loadSystemSnippets: function(data) {
			require('resources').setVocabulary(this.parseJSON(data), 'system');
		},
		
		/**
		 * Removes all user-defined snippets
		 */
		resetSnippets: function() {
			require('resources').setVocabulary({}, 'user');
		},
		
		/**
		 * Helper function that loads all user data (snippets and preferences)
		 * defined as a single JSON object. This is useful for loading data 
		 * stored in a common storage, for example <code>NSUserDefaults</code>
		 * @param {Object} data
		 */
		loadUserData: function(data) {
			data = this.parseJSON(data);
			if (data.snippets) {
				this.loadSnippets(data.snippets);
			}
			
			if (data.preferences) {
				this.loadPreferences(data.preferences);
			}
			
			if (data.profiles) {
				this.loadProfiles(data.profiles);
			}
			
			if (data.syntaxProfiles) {
				this.loadSyntaxProfiles(data.syntaxProfiles);
			}
		},
		
		/**
		 * Load syntax-specific output profiles. These are essentially 
		 * an extension to syntax snippets 
		 * @param {Object} profiles Dictionary of profiles
		 */
		loadSyntaxProfiles: function(profiles) {
			profiles = this.parseJSON(profiles);
			var snippets = {};
			_.each(profiles, function(options, syntax) {
				if (!(syntax in snippets)) {
					snippets[syntax] = {};
				}
				snippets[syntax].profile = options;
			});
			
			this.loadSnippets(snippets);
		},
		
		/**
		 * Load named profiles
		 * @param {Object} profiles
		 */
		loadProfiles: function(profiles) {
			var profile = require('profile');
			_.each(this.parseJSON(profiles), function(options, name) {
				profile.create(name, options);
			});
		},
		
		/**
		 * Dead simple string-to-JSON parser
		 * @param {String} str
		 * @returns {Object}
		 */
		parseJSON: function(str) {
			if (_.isObject(str))
				return str;
			
			try {
				return (new Function('return ' + str))();
			} catch(e) {
				return {};
			}
		}
	};
});