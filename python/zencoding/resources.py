#!/usr/bin/env python
# -*- coding: utf-8 -*-
'''
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import re
import types
from zencoding.zen_settings import zen_settings
import imp
import os.path

TYPE_ABBREVIATION = 'zen-tag'
TYPE_EXPANDO = 'zen-expando'

TYPE_REFERENCE = 'zen-reference'
"Reference to another abbreviation or tag"

VOC_SYSTEM = 'system'
VOC_USER = 'user'

re_tag = re.compile(r'^<(\w+\:?[\w\-]*)((?:\s+[\w\:\-]+\s*=\s*([\'"]).*?\3)*)\s*(\/?)>')
"Regular expression for XML tag matching"
re_attrs = re.compile(r'([\w\-]+)\s*=\s*([\'"])(.*?)\2')

vocabularies = {}
vocabularies[VOC_SYSTEM] = {}
vocabularies[VOC_USER] = {}

def is_parsed(obj):
	"""
	Check if specified resource is parsed by Zen Coding
	@return: bool
	"""
	return obj and not isinstance(obj, types.StringTypes)

def get_vocabulary(name):
	"""
	Returns resource vocabulary by its name
	@param name: Vocabulary name ('system' or 'user')
	@type name: str
	"""
	return name in vocabularies and vocabularies[name] or vocabularies[VOC_USER]

def has_deep_key(obj, key):
	"""
	Check if <code>obj</code> dictionary contains deep key. For example,
	example, it will allow you to test existance of my_dict[key1][key2][key3],
	testing existance of my_dict[key1] first, then my_dict[key1][key2],
	and finally my_dict[key1][key2][key3]
	@param obj: Dictionary to test
	@param obj: dict
	@param key: Deep key to test. Can be list (like ['key1', 'key2', 'key3']) or
	string (like 'key1.key2.key3')
	@type key: list, tuple, str
	@return: bool
	"""
	if isinstance(key, str):
		key = key.split('.')

	last_obj = obj
	for v in key:
		if hasattr(last_obj, v):
			last_obj = getattr(last_obj, v)
		elif last_obj.has_key(v):
			last_obj = last_obj[v]
		else:
			return False

	return True


def create_resource_chain(vocabulary, syntax, name):
	"""
	Creates resource inheritance chain for lookups
	@param voc: Resource vocabulary
	@type voc: str
	@param syntax: Syntax name
	@type syntax: str
	@param name: Resource name
	@type name: str
	@return: list
	"""
	voc = get_vocabulary(vocabulary)
	result = []
	resource = None

	if voc and syntax in voc:
		resource = voc[syntax]
		if name in resource:
			result.append(resource[name])


	# get inheritance definition
	# in case of user-defined vocabulary, resource dependency
	# may be defined in system vocabulary only, so we have to correctly
	# handle this case
	chain_source = None
	if resource and 'extends' in resource:
		chain_source = resource
	elif vocabulary == VOC_USER and has_deep_key(get_vocabulary(VOC_SYSTEM), [syntax, 'extends']):
		chain_source = get_vocabulary(VOC_SYSTEM)[syntax]

	if chain_source:
		if not is_parsed(chain_source['extends']):
			chain_source['extends'] = [v.strip() for v in chain_source['extends'].split(',')]

		# find resource in ancestors
		for type in chain_source['extends']:
			if has_deep_key(voc, [type, name]):
				result.append(voc[type][name])

	return result

def _get_subset(vocabulary, syntax, name):
	"""
	Get resource collection from settings vocbulary for specified syntax.
	It follows inheritance chain if resource wasn't directly found in
	syntax settings
	@param voc: Resource vocabulary
	@type voc: str
	@param syntax: Syntax name
	@type syntax: str
	@param name: Resource name
	@type name: str
	"""
	chain = create_resource_chain(vocabulary, syntax, name)
	return chain and chain[0] or None

def get_parsed_item(vocabulary, syntax, name, item):
	"""
	Returns parsed item located in specified vocabulary by its syntax and
	name
	@param voc: Resource vocabulary
	@type voc: str
	@param syntax: Syntax name
	@type syntax: str
	@param name: Resource name
	@type name: str
	@param item: Abbreviation or snippet name
	@type item: str
	@return {Object|null}
	"""
	chain = create_resource_chain(vocabulary, syntax, name)

	for res in chain:
		if item in res:
			if name == 'abbreviations' and not is_parsed(res[item]):
				# parse abbreviation
				res[item] = parse_abbreviation(item, res[item])

			return res[item]

	return None

def make_expando(key, value):
	"""
	Make expando from string
	@type key: str
	@type value: str
	@return: Entry
	"""
	return Entry(TYPE_EXPANDO, key, value)

def make_abbreviation(key, tag_name, attrs, is_empty=False):
	"""
	Make abbreviation from string
	@param key: Abbreviation key
	@type key: str
	@param tag_name: Expanded element's tag name
	@type tag_name: str
	@param attrs: Expanded element's attributes
	@type attrs: str
	@param is_empty: Is expanded element empty or not
	@type is_empty: bool
	@return: dict
	"""
	result = {
		'name': tag_name,
		'is_empty': is_empty
	};

	if attrs:
		result['attributes'] = [];
		for m in re_attrs.findall(attrs):
			result['attributes'].append({
				'name': m[0],
				'value': m[2]
			})

	return Entry(TYPE_ABBREVIATION, key, result)

def parse_abbreviation(key, value):
	"""
	Parses single abbreviation
	@param key: Abbreviation name
	@type key: str
	@param value: Abbreviation value
	@type value: str
	"""
	key = key.strip()
	if key[-1] == '+':
#		this is expando, leave 'value' as is
		return make_expando(key, value)
	else:
		m = re_tag.search(value)
		if m:
			return make_abbreviation(key, m.group(1), m.group(2), (m.group(4) == '/'))
		else:
#			assume it's reference to another abbreviation
			return Entry(TYPE_REFERENCE, key, value)

def set_vocabulary(data, type):
	"""
	Sets new unparsed data for specified settings vocabulary
	@type data: object
	@param type: Vocabulary type ('system' or 'user')
	@type type: str
	"""
	if type == VOC_SYSTEM:
		vocabularies[VOC_SYSTEM] = data
	else:
		vocabularies[VOC_USER] = data

def get_resource(syntax, name, item):
	"""
	Returns resource value from data set with respect of inheritance
	@param syntax: Resource syntax (html, css, ...)
	@type syntax: str
	@param name: Resource name ('snippets' or 'abbreviation')
	@type name: str
	@param abbr: Abbreviation name
	@type abbr: str name
	"""
	return get_parsed_item(VOC_USER, syntax, name, item) \
		or get_parsed_item(VOC_SYSTEM, syntax, name, item)

def get_abbreviation(syntax, name):
	"""
	Returns abbreviation value from data set
	@param syntax: Resource syntax (html, css, ...)
	@type syntax: str
	@param name: Abbreviation name
	@type name: str
	"""
	if name is None:
		return False

	return get_resource(syntax, 'abbreviations', name) \
		or get_resource(syntax, 'abbreviations', name.replace('-', ':'))

def get_snippet(syntax, name):
	"""
	Returns snippet value from data set
	@param syntax: Resource syntax (html, css, ...)
	@type syntax: str
	@param name: Snippet name
	@type name: str
	"""
	if name is None:
		return False

	return get_resource(syntax, 'snippets', name) \
		or get_resource(syntax, 'snippets', name.replace('-', ':'))

def get_variable(name):
	"""
	Returns variable value
	@param name: Variable name
	@type name: str
	"""
	return _get_subset(VOC_USER, 'variables', name) \
		or _get_subset(VOC_SYSTEM, 'variables', name)

def get_subset(syntax, name):
	"""
	Returns resource subset from settings vocabulary
	@param syntax: Syntax name
	@type syntax: str
	@param name: Resource name
	@type name: str
	"""
	return _get_subset(VOC_USER, syntax, name) \
		or _get_subset(VOC_SYSTEM, syntax, name)

def is_item_in_collection(syntax, collection, item):
	"""
	Check if specified item exists in specified resource collection
	(like 'empty', 'block_level')
	@param {String} syntax
	@param {String} collection Collection name
	@param {String} item Item name
	"""
	user_voc = get_vocabulary(VOC_USER)
	if syntax in user_voc and item in get_elements_collection(user_voc[syntax], collection):
		return True
	try:
		return item in get_elements_collection(get_vocabulary(VOC_SYSTEM)[syntax], collection)
	except:
		return False

def get_elements_collection(resource, name):
	"""
	Returns specified elements collection (like 'empty', 'block_level') from
	<code>resource</code>. If collections wasn't found, returns empty object
	@type resource: object
	@type name: str
	"""
	if resource and has_deep_key(resource, ['element_types', name]):
		# if it's not parsed yet -- do it
		res = resource['element_types']
		if not is_parsed(res[name]):
			res[name] = [el.strip() for el in res[name].split(',')]

		return res[name]
	else:
		return {}
	
def has_syntax(syntax):
	"""
	Check if there are resources for specified syntax
	@type syntax: str
	@returns: bool
	"""
	return syntax in get_vocabulary(VOC_USER) or syntax in get_vocabulary(VOC_SYSTEM)

class Entry:
	"""
	Unified object for parsed data
	"""
	def __init__(self, entry_type, key, value):
		"""
		@type entry_type: str
		@type key: str
		@type value: dict
		"""
		self.type = entry_type
		self.key = key
		self.value = value

	def __repr__(self):
		return 'Entry[type=%s, key=%s, value=%s]' % (self.type, self.key, self.value)

# init vocabularies
set_vocabulary(zen_settings, VOC_SYSTEM)
user_settings = None

# try to load settings from user's home folder
fp = None

try:
	fp, pathname, description = imp.find_module('my_zen_settings', [os.path.expanduser('~')])
	module = imp.load_module('my_zen_settings', fp, pathname, description)
	user_settings = module.my_zen_settings
except:
	pass
finally:
	# Since we may exit via an exception, close fp explicitly.
	if fp: fp.close()

if not user_settings:
	# try to load local module
	try:
		from my_zen_settings import my_zen_settings
		user_settings = my_zen_settings
	except:
		pass
	
if user_settings:
	set_vocabulary(user_settings, VOC_USER)