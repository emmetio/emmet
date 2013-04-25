/**
 * Module describes and performs Emmet actions. The actions themselves are
 * defined in <i>actions</i> folder
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.define('actions', function(require, _) {
	var actions = {};
	
	/**
	 * “Humanizes” action name, makes it more readable for people
	 * @param {String} name Action name (like 'expand_abbreviation')
	 * @return Humanized name (like 'Expand Abbreviation')
	 */
	function humanizeActionName(name) {
		return require('utils').trim(name.charAt(0).toUpperCase() 
			+ name.substring(1).replace(/_[a-z]/g, function(str) {
				return ' ' + str.charAt(1).toUpperCase();
			}));
	}
	
	return {
		/**
		 * Registers new action
		 * @param {String} name Action name
		 * @param {Function} fn Action function
		 * @param {Object} options Custom action options:<br>
		 * <b>label</b> : (<code>String</code>) – Human-readable action name. 
		 * May contain '/' symbols as submenu separators<br>
		 * <b>hidden</b> : (<code>Boolean</code>) – Indicates whether action
		 * should be displayed in menu (<code>getMenu()</code> method)
		 * 
		 * @memberOf actions
		 */
		add: function(name, fn, options) {
			name = name.toLowerCase();
			options = options || {};
			if (!options.label) {
				options.label = humanizeActionName(name);
			}
			
			actions[name] = {
				name: name,
				fn: fn,
				options: options
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
		 * Runs Emmet action. For list of available actions and their
		 * arguments see <i>actions</i> folder.
		 * @param {String} name Action name 
		 * @param {Array} args Additional arguments. It may be array of arguments
		 * or inline arguments. The first argument should be <code>IEmmetEditor</code> instance
		 * @returns {Boolean} Status of performed operation, <code>true</code>
		 * means action was performed successfully.
		 * @example
		 * emmet.require('actions').run('expand_abbreviation', editor);  
		 * emmet.require('actions').run('wrap_with_abbreviation', [editor, 'div']);  
		 */
		run: function(name, args) {
			if (!_.isArray(args)) {
				args = _.rest(arguments);
			}
			
			var action = this.get(name);
			if (action) {
				return action.fn.apply(emmet, args);
			} else {
				emmet.log('Action "%s" is not defined', name);
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
		},
		
		/**
		 * Returns actions list as structured menu. If action has <i>label</i>,
		 * it will be splitted by '/' symbol into submenus (for example: 
		 * CSS/Reflect Value) and grouped with other items
		 * @param {Array} skipActions List of action identifiers that should be 
		 * skipped from menu
		 * @returns {Array}
		 */
		getMenu: function(skipActions) {
			var result = [];
			skipActions = skipActions || [];
			_.each(this.getList(), function(action) {
				if (action.options.hidden || _.include(skipActions, action.name))
					return;
				
				var actionName = humanizeActionName(action.name);
				var ctx = result;
				if (action.options.label) {
					var parts = action.options.label.split('/');
					actionName = parts.pop();
					
					// create submenus, if needed
					var menuName, submenu;
					while ((menuName = parts.shift())) {
						submenu = _.find(ctx, function(item) {
							return item.type == 'submenu' && item.name == menuName;
						});
						
						if (!submenu) {
							submenu = {
								name: menuName,
								type: 'submenu',
								items: []
							};
							ctx.push(submenu);
						}
						
						ctx = submenu.items;
					}
				}
				
				ctx.push({
					type: 'action',
					name: action.name,
					label: actionName
				});
			});
			
			return result;
		},

		/**
		 * Returns action name associated with menu item title
		 * @param {String} title
		 * @returns {String}
		 */
		getActionNameForMenuTitle: function(title, menu) {
			var item = null;
			_.find(menu || this.getMenu(), function(val) {
				if (val.type == 'action') {
					if (val.label == title || val.name == title) {
						return item = val.name;
					}
				} else {
					return item = this.getActionNameForMenuTitle(title, val.items);
				}
			}, this);
			
			return item || null;
		}
	};
});