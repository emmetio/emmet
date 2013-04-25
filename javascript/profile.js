/**
 * Output profile module.
 * Profile defines how XHTML output data should look like
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.define('profile', function(require, _) {
	var profiles = {};
	
	var defaultProfile = {
		tag_case: 'asis',
		attr_case: 'asis',
		attr_quotes: 'double',
		
		// each tag on new line
		tag_nl: 'decide',
		
		// with tag_nl === true, defines if leaf node (e.g. node with no children)
		// should have formatted line breaks
		tag_nl_leaf: false,
		
		place_cursor: true,
		
		// indent tags
		indent: true,
		
		// how many inline elements should be to force line break 
		// (set to 0 to disable)
		inline_break: 3,
		
		// use self-closing style for writing empty elements, e.g. <br /> or <br>
		self_closing_tag: 'xhtml',
		
		// Profile-level output filters, re-defines syntax filters 
		filters: '',
		
		// Additional filters applied to abbreviation.
		// Unlike "filters", this preference doesn't override default filters
		// but add the instead every time given profile is chosen
		extraFilters: ''
	};
	
	/**
	 * @constructor
	 * @type OutputProfile
	 * @param {Object} options
	 */
	function OutputProfile(options) {
		_.extend(this, defaultProfile, options);
	}
	
	OutputProfile.prototype = {
		/**
		 * Transforms tag name case depending on current profile settings
		 * @param {String} name String to transform
		 * @returns {String}
		 */
		tagName: function(name) {
			return stringCase(name, this.tag_case);
		},
		
		/**
		 * Transforms attribute name case depending on current profile settings 
		 * @param {String} name String to transform
		 * @returns {String}
		 */
		attributeName: function(name) {
			return stringCase(name, this.attr_case);
		},
		
		/**
		 * Returns quote character for current profile
		 * @returns {String}
		 */
		attributeQuote: function() {
			return this.attr_quotes == 'single' ? "'" : '"';
		},
		
		/**
		 * Returns self-closing tag symbol for current profile
		 * @returns {String}
		 */
		selfClosing: function() {
			if (this.self_closing_tag == 'xhtml')
				return ' /';
			
			if (this.self_closing_tag === true)
				return '/';
			
			return '';
		},
		
		/**
		 * Returns cursor token based on current profile settings
		 * @returns {String}
		 */
		cursor: function() {
			return this.place_cursor ? require('utils').getCaretPlaceholder() : '';
		}
	};
	
	/**
	 * Helper function that converts string case depending on 
	 * <code>caseValue</code> 
	 * @param {String} str String to transform
	 * @param {String} caseValue Case value: can be <i>lower</i>, 
	 * <i>upper</i> and <i>leave</i>
	 * @returns {String}
	 */
	function stringCase(str, caseValue) {
		switch (String(caseValue || '').toLowerCase()) {
			case 'lower':
				return str.toLowerCase();
			case 'upper':
				return str.toUpperCase();
		}
		
		return str;
	}
	
	/**
	 * Creates new output profile
	 * @param {String} name Profile name
	 * @param {Object} options Profile options
	 */
	function createProfile(name, options) {
		return profiles[name.toLowerCase()] = new OutputProfile(options);
	}
	
	function createDefaultProfiles() {
		createProfile('xhtml');
		createProfile('html', {self_closing_tag: false});
		createProfile('xml', {self_closing_tag: true, tag_nl: true});
		createProfile('plain', {tag_nl: false, indent: false, place_cursor: false});
		createProfile('line', {tag_nl: false, indent: false, extraFilters: 's'});
	}
	
	createDefaultProfiles();
	
	return  {
		/**
		 * Creates new output profile and adds it into internal dictionary
		 * @param {String} name Profile name
		 * @param {Object} options Profile options
		 * @memberOf emmet.profile
		 * @returns {Object} New profile
		 */
		create: function(name, options) {
			if (arguments.length == 2)
				return createProfile(name, options);
			else
				// create profile object only
				return new OutputProfile(_.defaults(name || {}, defaultProfile));
		},
		
		/**
		 * Returns profile by its name. If profile wasn't found, returns
		 * 'plain' profile
		 * @param {String} name Profile name. Might be profile itself
		 * @param {String} syntax. Optional. Current editor syntax. If defined,
		 * profile is searched in resources first, then in predefined profiles
		 * @returns {Object}
		 */
		get: function(name, syntax) {
			if (!name && syntax) {
				// search in user resources first
				var profile = require('resources').findItem(syntax, 'profile');
				if (profile) {
					name = profile;
				}
			}
			
			if (!name) {
				return profiles.plain;
			}
			
			if (name instanceof OutputProfile) {
				return name;
			}
			
			if (_.isString(name) && name.toLowerCase() in profiles) {
				return profiles[name.toLowerCase()];
			}
			
			return this.create(name);
		},
		
		/**
		 * Deletes profile with specified name
		 * @param {String} name Profile name
		 */
		remove: function(name) {
			name = (name || '').toLowerCase();
			if (name in profiles)
				delete profiles[name];
		},
		
		/**
		 * Resets all user-defined profiles
		 */
		reset: function() {
			profiles = {};
			createDefaultProfiles();
		},
		
		/**
		 * Helper function that converts string case depending on 
		 * <code>caseValue</code> 
		 * @param {String} str String to transform
		 * @param {String} caseValue Case value: can be <i>lower</i>, 
		 * <i>upper</i> and <i>leave</i>
		 * @returns {String}
		 */
		stringCase: stringCase
	};
});