/**
 * Module for storing Zen Coding preferences and its modules. This module 
 * provides general storage for all module preferences, their description and
 * default values.<br><br>
 * 
 * This module can also be used to list all available properties to create 
 * UI for updating properties
 * 
 * @memberOf __preferencesDefine
 * @constructor
 * @param {Function} require
 * @param {Underscore} _ 
 */
zen_coding.define('preferences', function(require, _) {
	var preferences = {};
	
	function isValueObj(obj) {
		return _.isObject(obj) 
			&& 'value' in obj 
			&& _.keys(obj).length < 3;
	}
	
	return {
		/**
		 * Updates/creates new preference item
		 * @param {String} name Preference name. You can also pass object
		 * with many options
		 * @param {Object} value Preference default value
		 * @param {String} description Item textual description
		 * @returns
		 */
		set: function(name, value, description) {
			var prefs = name;
			if (_.isString(name)) {
				prefs = {};
				prefs[name] = {
					value: value,
					description: description
				};
			}
			
			_.each(prefs, function(v, k) {
				preferences[k] = isValueObj(v) ? v : {value: v};
			});
		},
		
		/**
		 * Returns preference value
		 * @param {String} name
		 * @returns
		 */
		get: function(name) {
			return name in preferences ? preferences[name].value : void 0;
		},
		
		/**
		 * Removes specified preference(s)
		 * @param {String} name Preference name (or array of names)
		 */
		remove: function(name) {
			if (!_.isArray(name))
				name = [name];
			
			_.each(name, function(key) {
				if (key in preferences)
					delete preferences[key];
			});
		},
		
		/**
		 * Returns sorted list of all available properties
		 * @returns {Array}
		 */
		list: function() {
			return _.map(_.keys(preferences).sort(), function(key) {
				return {
					name: key,
					value: preferences[key].value,
					description: preferences[key].description
				};
			});
		}
	};
});