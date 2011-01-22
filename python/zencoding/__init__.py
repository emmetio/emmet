import zen_actions
from zencoding.parsers import actions, traverse_actions

zen_actions = {}
__all__ = ('action', 'get_action')

def action(name=None, filter_func=None):
	"Decorator for Zen Coding actions"
	if name == None and filter_func == None:
		# @zencoding.action()
		return action_function
	elif filter_func == None:
		if(callable(name)):
			# @zencoding.action
			return action_function(name)
		else:
			# @zencoding.action('somename') or @zencoding.action(name='somename')
			def dec(func):
				return action(name, func)
			return dec
	elif name != None and filter_func != None:
		# zencoding.action('somename', somefunc)
		zen_actions[name] = filter_func
		return filter_func
	else:
		raise "Unsupported arguments to Zen Action: (%r, %r)", (name, filter_func)

def action_function(func):
	zen_actions[getattr(func, "_decorated_function", func).__name__] = func
	return func

def get_action(name):
	return zen_actions[name] if name in zen_actions else None
