/**
 * Module describes and performs Zen Coding actions. The actions themselves are
 * defined in <i>actions</i> folder
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.define('actions', function(require, _, zc) {
	var actions = {};
	
	return {
		/**
		 * Registers new action
		 * @param {String} name Action name
		 * @param {Function} fn Action function
		 * @param {String} label Action label. May be used to build menus
		 * @memberOf zen_coding.actions
		 */
		add: function(name, fn, label) {
			name = name.toLowerCase();
			actions[name] = {
				name: name,
				fn: fn,
				label: label
			};
		},
		
		/**
		 * Returns action object
		 * @param {String} name Action name
		 * @returns {Object}
		 */
		get: function(name) {
			return actions[name.toLowerCase()];
		},
		
		/**
		 * Runs Zen Coding action. For list of available actions and their
		 * arguments see <i>actions</i> folder.
		 * @param {String} name Action name 
		 * @param {Array} args Additional arguments. It may be array of arguments
		 * or inline arguments. The first argument should be <code>zen_editor</code> instance
		 * @returns {Boolean} Status of performed operation, <code>true</code>
		 * means action was performed successfully.
		 * @example
		 * zen_coding.require('actions').run('expand_abbreviation', zen_editor);  
		 * zen_coding.require('actions').run('wrap_with_abbreviation', [zen_editor, 'div']);  
		 */
		run: function(name, args) {
			if (!_.isArray(args)) {
				args = _.rest(arguments);
			}
			
			var action = this.get(name);
			if (action) {
				return action.fn.apply(zen_coding, args);
			} else {
				zen_coding.log('Action "%s" is not defined', name);
				return false;
			}
		},
		
		/**
		 * Returns all registered actions as object
		 * @returns {Object}
		 */
		getAll: function() {
			return actions;
		},
		
		/**
		 * Returns all registered actions as array
		 * @returns {Array}
		 */
		getList: function() {
			return _.values(this.getAll());
		}
	};
});