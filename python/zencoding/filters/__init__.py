import os.path
import sys

# import all filters
__sub_modules = []
__prefix = 'zencoding.filters'
__filter_dir = os.path.dirname(__file__)
sys.path.append(__filter_dir)

filter_map = {}
for file in os.listdir(__filter_dir):
	name, ext = os.path.splitext(file)
	if ext.lower() == '.py':
		__sub_modules.append(name)
		
__filters = __import__(__prefix, globals(), locals(), __sub_modules)
for key in dir(__filters):
	__module = getattr(__filters, key)
	if hasattr(__module, '__name__') and __module.__name__.startswith(__prefix + '.') and hasattr(__module, 'process'):
		if hasattr(__module, 'alias'):
			filter_map[__module.alias] = __module.process
		else:
			filter_map[__module.__name__[len(__prefix) + 1:]] = __module.process
