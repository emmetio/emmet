/**
 * Output profile module.
 * Profile defines how XHTML output data should look like
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.define('profile', function(require, _) {
	var profiles = {};
	
	var defaultProfile = {
		tag_case: 'lower',
		attr_case: 'lower',
		attr_quotes: 'double',
		
		// each tag on new line
		tag_nl: 'decide',
		
		place_cursor: true,
		
		// indent tags
		indent: true,
		
		// how many inline elements should be to force line break 
		// (set to 0 to disable)
		inline_break: 3,
		
		// use self-closing style for writing empty elements, e.g. <br /> or <br>
		self_closing_tag: 'xhtml',
		
		// Profile-level output filters, re-defines syntax filters 
		filters: ''
	};
	
	/**
	 * Creates new output profile
	 * @param {String} name Profile name
	 * @param {Object} options Profile options
	 */
	function createProfile(name, options) {
		return profiles[name.toLowerCase()] = _.defaults(options || {}, defaultProfile);
	}
	
	// create default profiles
	createProfile('xhtml');
	createProfile('html', {self_closing_tag: false});
	createProfile('xml', {self_closing_tag: true, tag_nl: true});
	createProfile('plain', {tag_nl: false, indent: false, place_cursor: false});
	
	return  {
		/**
		 * Creates new output profile and adds it into internal dictionary
		 * @param {String} name Profile name
		 * @param {Object} options Profile options
		 * @memberOf zen_coding.profile
		 * @returns {Object} New profile
		 */
		create: function(name, options) {
			return createProfile(name, options);
		},
		
		/**
		 * Returns profile by its name. If profile wasn't found, returns
		 * 'plain' profile
		 * @param {String} name Profile name. Might be profile itself
		 * @returns {Object}
		 */
		get: function(name) {
			if (_.isString(name) && name.toLowerCase() in profiles)
				return profiles[name.toLowerCase()];
				
			return name && 'tag_case' in name ? name : profiles['plain'];
		},
		
		/**
		 * Deletes profile with specified name
		 * @param {String} name Profile name
		 */
		remove: function(name) {
			name = (name || '').toLowerCase();
			if (name in profiles)
				delete profiles[name];
		}
	};
});