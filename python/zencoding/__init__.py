import utils
import re
import os
import imp

__actions = {}
__filters = {}
__imported = []

def action(name=None, action_func=None):
	"Decorator for Zen Coding actions"
	if name == None and action_func == None:
		# @zencoding.action()
		return action_function
	elif action_func == None:
		if(callable(name)):
			# @zencoding.action
			return action_function(name)
		else:
			# @zencoding.action('somename') or @zencoding.action(name='somename')
			def dec(func):
				return action(name, func)
			return dec
	elif name != None and action_func != None:
		# zencoding.action('somename', somefunc)
		__actions[name] = action_func
		return action_func
	else:
		raise "Unsupported arguments to Zen Action: (%r, %r)", (name, action_func)

def action_function(func):
	__actions[getattr(func, "_decorated_function", func).__name__] = func
	return func

def filter(name=None, filter_func=None):
	"Decorator for Zen Coding filters"
	if name == None and filter_func == None:
		# @zencoding.filter()
		return filter_function
	elif filter_func == None:
		if(callable(name)):
			# @zencoding.filter
			return filter_function(name)
		else:
			# @zencoding.filter('somename') or @zencoding.filter(name='somename')
			def dec(func):
				return filter(name, func)
			return dec
	elif name != None and filter_func != None:
		# zencoding.filter('somename', somefunc)
		__filters[name] = filter_func
		return filter_func
	else:
		raise "Unsupported arguments to Zen Filter: (%r, %r)", (name, filter_func)

def filter_function(func):
	__filters[getattr(func, "_decorated_function", func).__name__] = func
	return func

def run_action(name, *args, **kwargs):
	"""
	 Runs Zen Coding action. For list of available actions and their
	 arguments see zen_actions.py file.
	 @param name: Action name 
	 @type name: str 
	 @param args: Additional arguments. It may be array of arguments
	 or inline arguments. The first argument should be <code>zen_editor</code> instance
	 @type args: list
	 @example
	 zencoding.run_actions('expand_abbreviation', zen_editor)
	 zencoding.run_actions('wrap_with_abbreviation', zen_editor, 'div')  
	"""
	import zencoding.actions
	if name in __actions:
		return __actions[name](*args, **kwargs)
	
	return False
		
def run_filters(tree, profile, filter_list):
	"""
	Runs filters on tree
	@type tree: ZenNode
	@param profile: str, object
	@param filter_list: str, list
	@return: ZenNode
	"""
	import zencoding.filters
	
	profile = utils.process_profile(profile)
		
	if isinstance(filter_list, basestring):
		filter_list = re.split(r'[\|,]', filter_list)
		
	for name in filter_list:
		name = name.strip()
		if name and name in __filters:
			tree = __filters[name](tree, profile)
			
	return tree

def expand_abbreviation(abbr, syntax='html', profile_name='plain'):
	"""
	Expands abbreviation into a XHTML tag string
	@type abbr: str
	@return: str
	"""
	tree_root = utils.parse_into_tree(abbr, syntax)
	if tree_root:
		tree = utils.rollout_tree(tree_root)
		utils.apply_filters(tree, syntax, profile_name, tree_root.filters)
		return utils.replace_variables(tree.to_string())
	
	return ''

def wrap_with_abbreviation(abbr, text, syntax='html', profile='plain'):
	"""
	Wraps passed text with abbreviation. Text will be placed inside last
	expanded element
	@param abbr: Abbreviation
	@type abbr: str
	
	@param text: Text to wrap
	@type text: str
	
	@param syntax: Document type (html, xml, etc.)
	@type syntax: str
	
	@param profile: Output profile's name.
	@type profile: str
	@return {String}
	"""
	tree_root = utils.parse_into_tree(abbr, syntax)
	pasted = False
	
	if tree_root:
		if tree_root.multiply_elem:
			# we have a repeating element, put content in
			tree_root.multiply_elem.set_paste_content(text)
			tree_root.multiply_elem.repeat_by_lines = pasted = True
			
		
		tree = utils.rollout_tree(tree_root)
		
		if not pasted:
			tree.paste_content(text)
		
		utils.apply_filters(tree, syntax, profile, tree_root.filters)
		return utils.replace_variables(tree.to_string())
	
	return None