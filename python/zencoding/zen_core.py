#!/usr/bin/env python
# -*- coding: utf-8 -*-
'''
Core Zen Coding library. Contains various text manipulation functions:

== Expand abbreviation
Expands abbreviation like ul#nav>li*5>a into a XHTML string.
=== How to use
First, you have to extract current string (where cursor is) from your test 
editor and use <code>find_abbr_in_line()</code> method to extract abbreviation. 
If abbreviation was found, this method will return it as well as position index
of abbreviation inside current line. If abbreviation wasn't 
found, method returns empty string. With abbreviation found, you should call
<code>parse_into_tree()</code> method to transform abbreviation into a tag tree. 
This method returns <code>Tag</code> object on success, None on failure. Then
simply call <code>to_string()</code> method of returned <code>Tag</code> object
to transoform tree into a XHTML string

You can setup output profile using <code>setup_profile()</code> method 
(see <code>default_profile</code> definition for available options) 

 
Created on Apr 17, 2009

@author: Sergey Chikuyonok (http://chikuyonok.ru)
'''
from zen_settings import zen_settings
import re
import stparser

newline = '\n'
"Newline symbol"

caret_placeholder = '{%::zen-caret::%}'

default_tag = 'div'

re_tag = re.compile(r'<\/?[\w:\-]+(?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:\'[^\']*\')|[^>\s]+))?)*\s*(\/?)>$')

profiles = {}
"Available output profiles"

default_profile = {
	'tag_case': 'lower',         # values are 'lower', 'upper'
	'attr_case': 'lower',        # values are 'lower', 'upper'
	'attr_quotes': 'double',     # values are 'single', 'double'
	
	'tag_nl': 'decide',          # each tag on new line, values are True, False, 'decide'
	
	'place_cursor': True,        # place cursor char — | (pipe) — in output
	
	'indent': True,              # indent tags
	
	'inline_break': 3,           # how many inline elements should be to force line break (set to 0 to disable)
	
	'self_closing_tag': 'xhtml'  # use self-closing style for writing empty elements, e.g. <br /> or <br>. 
                                 # values are True, False, 'xhtml'
}

basic_filters = 'html';
"Filters that will be applied for unknown syntax"

max_tabstop = 0
"Maximum tabstop index for current session"

def char_at(text, pos):
	"""
	Returns character at specified index of text.
	If index if out of range, returns empty string
	"""
	return text[pos] if pos < len(text) else ''

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
		

def is_allowed_char(ch):
	"""
	Test if passed symbol is allowed in abbreviation
	@param ch: Symbol to test
	@type ch: str
	@return: bool
	"""
	return ch.isalnum() or ch in "#.>+*:$-_!@[]()|"

def split_by_lines(text, remove_empty=False):
	"""
	Split text into lines. Set <code>remove_empty</code> to true to filter out
	empty lines
	@param text: str
	@param remove_empty: bool
	@return list
	"""
	lines = text.splitlines()
	
	return remove_empty and [line for line in lines if line.strip()] or lines

def make_map(prop):
	"""
	Helper function that transforms string into dictionary for faster search
	@param prop: Key name in <code>zen_settings['html']</code> dictionary
	@type prop: str
	"""
	obj = {}
	for a in zen_settings['html'][prop].split(','):
		obj[a] = True
		
	zen_settings['html'][prop] = obj

def create_profile(options):
	"""
	Create profile by adding default values for passed optoin set
	@param options: Profile options
	@type options: dict
	"""
	for k, v in default_profile.items():
		options.setdefault(k, v)
	
	return options

def setup_profile(name, options = {}):
	"""
	@param name: Profile name
	@type name: str
	@param options: Profile options
	@type options: dict
	"""
	profiles[name.lower()] = create_profile(options);

def get_newline():
	"""
	Returns newline symbol which is used in editor. This function must be 
	redefined to return current editor's settings 
	@return: str
	"""
	return newline

def set_newline(char):
	"""
	Sets newline character used in Zen Coding
	"""
	global newline
	newline = char

def string_to_hash(text):
	"""
	Helper function that transforms string into hash
	@return: dict
	"""
	obj = {}
	items = text.split(",")
	for i in items:
		obj[i] = True
		
	return obj

def pad_string(text, pad):
	"""
	Indents string with space characters (whitespace or tab)
	@param text: Text to indent
	@type text: str
	@param pad: Indentation level (number) or indentation itself (string)
	@type pad: int, str
	@return: str
	"""
	pad_str = ''
	result = ''
	if isinstance(pad, basestring):
		pad_str = pad
	else:
		pad_str = get_indentation() * pad
		
	nl = get_newline()
	
	lines = split_by_lines(text)
	
	if lines:
		result += lines[0]
		for line in lines[1:]:
			result += nl + pad_str + line
			
	return result

def is_snippet(abbr, doc_type = 'html'):
	"""
	Check is passed abbreviation is a snippet
	@return bool
	"""
	return get_snippet(doc_type, abbr) and True or False

def is_ends_with_tag(text):
	"""
	Test is string ends with XHTML tag. This function used for testing if '<'
	symbol belogs to tag or abbreviation 
	@type text: str
	@return: bool
	"""
	return re_tag.search(text) != None

def get_elements_collection(resource, type):
	"""
	Returns specified elements collection (like 'empty', 'block_level') from
	<code>resource</code>. If collections wasn't found, returns empty object
	@type resource: dict
	@type type: str
	@return: dict
	"""
	if 'element_types' in resource and type in resource['element_types']:
		return resource['element_types'][type]
	else:
		return {}
	
def replace_variables(text, vars=zen_settings['variables']):
	"""
	Replace variables like ${var} in string
	@param text: str
	@return: str
	"""
	return re.sub(r'\$\{([\w\-]+)\}', lambda m: m.group(1) in vars and vars[m.group(1)] or m.group(0), text)

def get_abbreviation(res_type, abbr):
	"""
	Returns abbreviation value from data set
	@param res_type: Resource type (html, css, ...)
	@type res_type: str
	@param abbr: Abbreviation name
	@type abbr: str
	@return dict, None
	"""
	return get_settings_resource(res_type, abbr, 'abbreviations')

def get_snippet(res_type, snippet_name):
	"""
	Returns snippet value from data set
	@param res_type: Resource type (html, css, ...)
	@type res_type: str
	@param snippet_name: Snippet name
	@type snippet_name: str
	@return dict, None
	"""
	return get_settings_resource(res_type, snippet_name, 'snippets');

def get_variable(name):
	"""
	Returns variable value
	 @return: str
	"""
	return zen_settings['variables'][name]

def set_variable(name, value):
	"""
	Set variable value
	"""
	zen_settings['variables'][name] = value

def get_indentation():
	"""
	Returns indentation string
	@return {String}
	"""
	return get_variable('indentation');

def create_resource_chain(syntax, name):
	"""
	Creates resource inheritance chain for lookups
	@param syntax: Syntax name
	@type syntax: str
	@param name: Resource name
	@type name: str
	@return: list
	"""
	result = []
	
	if syntax in zen_settings:
		resource = zen_settings[syntax]
		if name in resource:
			result.append(resource[name])
		if 'extends' in resource:
			# find resource in ancestors
			for type in resource['extends']:
				if  has_deep_key(zen_settings, [type, name]):
					result.append(zen_settings[type][name])
				
	return result

def get_resource(syntax, name):
	"""
	Get resource collection from settings file for specified syntax. 
	It follows inheritance chain if resource wasn't directly found in
	syntax settings
	@param syntax: Syntax name
	@type syntax: str
	@param name: Resource name
	@type name: str
	"""
	chain = create_resource_chain(syntax, name)
	return chain[0] if chain else None

def get_settings_resource(syntax, abbr, name):
	"""
	Returns resurce value from data set with respect of inheritance
	@param syntax: Resource syntax (html, css, ...)
	@type syntax: str
	@param abbr: Abbreviation name
	@type abbr: str
	@param name: Resource name ('snippets' or 'abbreviation')
	@type name: str
	@return dict, None
	"""
	for item in create_resource_chain(syntax, name):
		if abbr in item:
			return item[abbr]
		
	return None

def get_word(ix, text):
	"""
	Get word, starting at <code>ix</code> character of <code>text</code>
	@param ix: int
	@param text: str
	"""
	m = re.match(r'^[\w\-:\$]+', text[ix:])
	return m.group(0) if m else ''
	
def extract_attributes(attr_set):
	"""
	Extract attributes and their values from attribute set 
 	@param attr_set: str
	"""
	attr_set = attr_set.strip()
	loop_count = 100 # endless loop protection
	re_string = r'^(["\'])((?:(?!\1)[^\\]|\\.)*)\1'
	result = []
		
	while attr_set and loop_count:
		loop_count -= 1
		attr_name = get_word(0, attr_set)
		attr = None
		if attr_name:
			attr = {'name': attr_name, 'value': ''}
			
			# let's see if attribute has value
			ch = attr_set[len(attr_name)] if len(attr_set) > len(attr_name) else ''
			if ch == '=':
				ch2 = attr_set[len(attr_name) + 1]
				if ch2 in '"\'':
					# we have a quoted string
					m = re.match(re_string, attr_set[len(attr_name) + 1:])
					if m:
						attr['value'] = m.group(2)
						attr_set = attr_set[len(attr_name) + len(m.group(0)) + 1:].strip()
					else:
						# something wrong, break loop
						attr_set = ''
				else:
					# unquoted string
					m = re.match(r'^(.+?)(\s|$)', attr_set[len(attr_name) + 1:])
					if m:
						attr['value'] = m.group(1)
						attr_set = attr_set[len(attr_name) + len(m.group(1)) + 1:].strip()
					else:
						# something wrong, break loop
						attr_set = ''
				
			else:
				attr_set = attr_set[len(attr_name):].strip()
		else:
			# something wrong, can't extract attribute name
			break
		
		if attr: result.append(attr)
		
	return result

def parse_attributes(text):
	"""
	Parses tag attributes extracted from abbreviation
	"""
	
#	Example of incoming data:
#	#header
#	.some.data
#	.some.data#header
#	[attr]
#	#item[attr=Hello other="World"].class

	result = []
	class_name = None
	char_map = {'#': 'id', '.': 'class'}
	
	# walk char-by-char
	i = 0
	il = len(text)
		
	while i < il:
		ch = text[i]
		
		if ch == '#': # id
			val = get_word(i, text[1:])
			result.append({'name': char_map[ch], 'value': val})
			i += len(val) + 1
			
		elif ch == '.': #class
			val = get_word(i, text[1:])
			if not class_name:
				# remember object pointer for value modification
				class_name = {'name': char_map[ch], 'value': ''}
				result.append(class_name)
			
			if class_name['value']:
				class_name['value'] += ' ' + val
			else:
				class_name['value'] = val
			
			i += len(val) + 1
				
		elif ch == '[': # begin attribute set
			# search for end of set
			end_ix = text.find(']', i)
			if end_ix == -1:
				# invalid attribute set, stop searching
				i = len(text)
			else:
				result.extend(extract_attributes(text[i + 1:end_ix]))
				i = end_ix
		else:
			i += 1
		
		
	return result

class AbbrGroup(object):
	"""
	Abreviation's group element
	"""
	def __init__(self, parent=None):
		"""
		@param parent: Parent group item element
		@type parent: AbbrGroup
		"""
		self.expr = ''
		self.parent = parent
		self.children = []
		
	def add_child(self):
		child = AbbrGroup(self)
		self.children.append(child)
		return child
	
	def clean_up(self):
		for item in self.children:
			expr = item.expr
			if not expr:
				self.children.remove(item)
			else:
				# remove operators at the and of expression
				item.clean_up()

def split_by_groups(abbr):
	"""
	Split abbreviation by groups
	@type abbr: str
	@return: AbbrGroup
	"""
	root = AbbrGroup()
	last_parent = root
	cur_item = root.add_child()
	stack = []
	i = 0
	il = len(abbr)
	
	while i < il:
		ch = abbr[i]
		if ch == '(':
			# found new group
			operator = i and abbr[i - 1] or ''
			if operator == '>':
				stack.append(cur_item)
				last_parent = cur_item
			else:
				stack.append(last_parent)
			cur_item = None
		elif ch == ')':
			last_parent = stack.pop()
			cur_item = None
			next_char = char_at(abbr, i + 1)
			if next_char == '+' or next_char == '>': 
				# next char is group operator, skip it
				i += 1
		else:
			if ch == '+' or ch == '>':
				# skip operator if it's followed by parenthesis
				next_char = char_at(abbr, i + 1)
				if next_char == '(':
					i += 1 
					continue
			
			if not cur_item:
				cur_item = last_parent.add_child()
			cur_item.expr += ch
			
		i += 1
	
	root.clean_up()
	return root

def rollout_tree(tree, parent=None):
	"""
	Roll outs basic Zen Coding tree into simplified, DOM-like tree.
	The simplified tree, for example, represents each multiplied element 
	as a separate element sets with its own content, if exists.
	 
	The simplified tree element contains some meta info (tag name, attributes, 
	etc.) as well as output strings, which are exactly what will be outputted
	after expanding abbreviation. This tree is used for <i>filtering</i>:
	you can apply filters that will alter output strings to get desired look
	of expanded abbreviation.
	 
	@type tree: Tag
	@param parent: ZenNode
	"""
	if not parent:
		parent = ZenNode(tree)
		
	how_many = 1
	tag_content = ''
	
	for child in tree.children:
		how_many = child.count
		
		if child.repeat_by_lines:
			# it's a repeating element
			tag_content = split_by_lines(child.get_content(), True)
			how_many = max(len(tag_content), 1)
		else:
			tag_content = child.get_content()
		
		for j in range(how_many):
			tag = ZenNode(child)
			parent.add_child(tag)
			tag.counter = j + 1
			
			if child.children:
				rollout_tree(child, tag)
				
			add_point = tag.find_deepest_child() or tag
			
			if tag_content:
				if isinstance(tag_content, basestring):
					add_point.content = tag_content
				else:
					add_point.content = tag_content[j] or ''
					
	return parent

def run_filters(tree, profile, filter_list):
	"""
	Runs filters on tree
	@type tree: ZenNode
	@param profile: str, object
	@param filter_list: str, list
	@return: ZenNode
	"""
	import filters
	
	if isinstance(profile, basestring) and profile in profiles:
		profile = profiles[profile];
	
	if not profile:
		profile = profiles['plain']
		
	if isinstance(filter_list, basestring):
		filter_list = re.split(r'[\|,]', filter_list)
		
	for name in filter_list:
		name = name.strip()
		if name and name in filters.filter_map:
			tree = filters.filter_map[name](tree, profile)
			
	return tree

def abbr_to_primary_tree(abbr, doc_type='html'):
	"""
	Transforms abbreviation into a primary internal tree. This tree should'n 
	be used ouside of this scope
	@param abbr: Abbreviation to transform
	@type abbr: str
	@param doc_type: Document type (xsl, html), a key of dictionary where to
	search abbreviation settings
	@type doc_type: str
	@return: Tag
	"""
	root = Tag('', 1, doc_type)
	token = re.compile(r'([\+>])?([a-z@\!\#\.][\w:\-\$]*)((?:(?:[#\.][\w\-\$]+)|(?:\[[^\]]+\]))+)?(\*(\d*))?(\+$)?', re.IGNORECASE)
	
	if not abbr:
		return None
	
	def expando_replace(m):
		ex = m.group(0)
		a = get_abbreviation(doc_type, ex)
		return a and a.value or ex
		
	def token_expander(operator, tag_name, attrs, has_multiplier, multiplier, has_expando):
		multiply_by_lines = (has_multiplier and not multiplier)
		multiplier = multiplier and int(multiplier) or 1
		
		tag_ch = tag_name[0]
		if tag_ch == '#' or tag_ch == '.':
			if attrs: attrs = tag_name + attrs
			else: attrs = tag_name
			tag_name = default_tag
		
		if has_expando:
			tag_name += '+'
		
		current = is_snippet(tag_name, doc_type) and Snippet(tag_name, multiplier, doc_type) or Tag(tag_name, multiplier, doc_type)
		
		if attrs:
			attrs = parse_attributes(attrs)
			for attr in attrs:
				current.add_attribute(attr['name'], attr['value'])
			
		# dive into tree
		if operator == '>' and token_expander.last:
			token_expander.parent = token_expander.last;
			
		token_expander.parent.add_child(current)
		token_expander.last = current
		
		if multiply_by_lines:
			root.multiply_elem = current
		
		return ''
		
	# replace expandos
	abbr = re.sub(r'([a-z][a-z0-9]*)\+$', expando_replace, abbr)
	
	token_expander.parent = root
	token_expander.last = None
	
	
#	abbr = re.sub(token, lambda m: token_expander(m.group(1), m.group(2), m.group(3), m.group(4), m.group(5), m.group(6), m.group(7)), abbr)
	# Issue from Einar Egilsson
	abbr = token.sub(lambda m: token_expander(m.group(1), m.group(2), m.group(3), m.group(4), m.group(5), m.group(6)), abbr)
	
	root.last = token_expander.last
	
	# empty 'abbr' variable means that abbreviation was expanded successfully, 
	# non-empty variable means there was a syntax error
	return not abbr and root or None;

def expand_group(group, doc_type, parent):
	"""
	Expand single group item 
	@param group: AbbrGroup
	@param doc_type: str
	@param parent: Tag
	"""
	tree = abbr_to_primary_tree(group.expr, doc_type)
	last_item = None
		
	if tree:
		for item in tree.children:
			last_item = item
			parent.add_child(last_item)
	else:
		raise Exception('InvalidGroup')
	
	
	# set repeating element to the topmost node
	root = parent
	while root.parent:
		root = root.parent
	
	root.last = tree.last
	if tree.multiply_elem:
		root.multiply_elem = tree.multiply_elem
		
	# process child groups
	if group.children:
		add_point = last_item.find_deepest_child() or last_item
		for child in group.children:
			expand_group(child, doc_type, add_point)

def replace_unescaped_symbol(text, symbol, replace):
	"""
	Replaces unescaped symbols in <code>text</code>. For example, the '$' symbol
	will be replaced in 'item$count', but not in 'item\$count'.
	@param text: Original string
	@type text: str
	@param symbol: Symbol to replace
	@type symbol: st
	@param replace: Symbol replacement
	@type replace: str, function 
	@return: str
	"""
	i = 0
	il = len(text)
	sl = len(symbol)
	match_count = 0
		
	while i < il:
		if text[i] == '\\':
			# escaped symbol, skip next character
			i += sl + 1
		elif text[i:i + sl] == symbol:
			# have match
			cur_sl = sl
			match_count += 1
			new_value = replace
			if callable(new_value):
				replace_data = replace(text, symbol, i, match_count)
				if replace_data:
					cur_sl = len(replace_data[0])
					new_value = replace_data[1]
				else:
					new_value = False
			
			if new_value is False: # skip replacement
				i += 1
				continue
			
			text = text[0:i] + new_value + text[i + cur_sl:]
			# adjust indexes
			il = len(text)
			i += len(new_value)
		else:
			i += 1
	
	return text
	
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
	 zen_coding.run_actions('expand_abbreviation', zen_editor)
	 zen_coding.run_actions('wrap_with_abbreviation', zen_editor, 'div')  
	"""
	import zen_actions
	
	if hasattr(zen_actions, name):
		return getattr(zen_actions, name)(*args, **kwargs)

def expand_abbreviation(abbr, syntax='html', profile_name='plain'):
	"""
	Expands abbreviation into a XHTML tag string
	@type abbr: str
	@return: str
	"""
	tree_root = parse_into_tree(abbr, syntax);
	if tree_root:
		tree = rollout_tree(tree_root)
		apply_filters(tree, syntax, profile_name, tree_root.filters)
		return replace_variables(tree.to_string())
	
	return ''

def extract_abbreviation(text):
	"""
	Extracts abbreviations from text stream, starting from the end
	@type text: str
	@return: Abbreviation or empty string
	"""
	cur_offset = len(text)
	start_index = -1
	brace_count = 0
	
	while True:
		cur_offset -= 1
		if cur_offset < 0:
			# moved at string start
			start_index = 0
			break
		
		ch = text[cur_offset]
		
		if ch == ']':
			brace_count += 1
		elif ch == '[':
			brace_count -= 1
		else:
			if brace_count: 
				# respect all characters inside attribute sets
				continue
			if not is_allowed_char(ch) or (ch == '>' and is_ends_with_tag(text[0:cur_offset + 1])):
				# found stop symbol
				start_index = cur_offset + 1
				break
		
	return text[start_index:] if start_index != -1 else ''

def parse_into_tree(abbr, doc_type='html'):
	"""
	Parses abbreviation into a node set
	@param abbr: Abbreviation to transform
	@type abbr: str
	@param doc_type: Document type (xsl, html), a key of dictionary where to
	search abbreviation settings
	@type doc_type: str
	@return: Tag
	"""
	# remove filters from abbreviation
	filter_list = []
	
	def filter_replace(m):
		filter_list.append(m.group(1))
		return ''
	
	re_filter = re.compile(r'\|([\w\|\-]+)$')
	abbr = re_filter.sub(filter_replace, abbr)
	
	# split abbreviation by groups
	group_root = split_by_groups(abbr)
	tree_root = Tag('', 1, doc_type)
	
	# then recursively expand each group item
	try:
		for item in group_root.children:
			expand_group(item, doc_type, tree_root)
	except:
		# there's invalid group, stop parsing
		return None
	
	tree_root.filters = ''.join(filter_list)
	return tree_root

def is_inside_tag(html, cursor_pos):
	re_tag = re.compile(r'^<\/?\w[\w\:\-]*.*?>')
	
	# search left to find opening brace
	pos = cursor_pos
	while pos > -1:
		if html[pos] == '<': break
		pos -= 1
	
	
	if pos != -1:
		m = re_tag.match(html[pos:]);
		if m and cursor_pos > pos and cursor_pos < pos + len(m.group(0)):
			return True

	return False

def wrap_with_abbreviation(abbr, text, doc_type='html', profile='plain'):
	"""
	Wraps passed text with abbreviation. Text will be placed inside last
	expanded element
	@param abbr: Abbreviation
	@type abbr: str
	
	@param text: Text to wrap
	@type text: str
	
	@param doc_type: Document type (html, xml, etc.)
	@type doc_type: str
	
	@param profile: Output profile's name.
	@type profile: str
	@return {String}
	"""
	tree_root = parse_into_tree(abbr, doc_type)
	if tree_root:
		repeat_elem = tree_root.multiply_elem or tree_root.last
		repeat_elem.set_content(text)
		repeat_elem.repeat_by_lines = bool(tree_root.multiply_elem)
		
		tree = rollout_tree(tree_root)
		apply_filters(tree, doc_type, profile, tree_root.filters);
		return replace_variables(tree.to_string())
	
	return None

def get_caret_placeholder():
	"""
	Returns caret placeholder
	@return: str
	"""
	if callable(caret_placeholder):
		return caret_placeholder()
	else:
		return caret_placeholder

def set_caret_placeholder(value):
	"""
	Set caret placeholder: a string (like '|') or function.
	You may use a function as a placeholder generator. For example,
	TextMate uses ${0}, ${1}, ..., ${n} natively for quick Tab-switching
	between them.
	@param {String|Function}
	"""
	global caret_placeholder
	caret_placeholder = value

def apply_filters(tree, syntax, profile, additional_filters=None):
	"""
	Applies filters to tree according to syntax
	@param tree: Tag tree to apply filters to
	@type tree: ZenNode
	@param syntax: Syntax name ('html', 'css', etc.)
	@type syntax: str
	@param profile: Profile or profile's name
	@type profile: str, object
	@param additional_filters: List or pipe-separated string of additional filters to apply
	@type additional_filters: str, list 
	 
	@return: ZenNode
	"""
	_filters = get_resource(syntax, 'filters') or basic_filters
		
	if additional_filters:
		_filters += '|'
		if isinstance(additional_filters, basestring):
			_filters += additional_filters
		else:
			_filters += '|'.join(additional_filters)
		
	if not _filters:
		# looks like unknown syntax, apply basic filters
		_filters = basic_filters
		
	return run_filters(tree, profile, _filters)

def replace_counter(text, value):
	"""
	 Replaces '$' character in string assuming it might be escaped with '\'
	 @type text: str
	 @type value: str, int
	 @return: str
	"""
	symbol = '$'
	value = str(value)
	
	def replace_func(tx, symbol, pos, match_num):
		if char_at(tx, pos + 1) == '{' or char_at(tx, pos + 1).isdigit():
			# it's a variable, skip it
			return False
		
		# replace sequense of $ symbols with padded number  
		j = pos + 1
		if j < len(text):
			while tx[j] == '$' and char_at(tx, j + 1) != '{': j += 1
		
		return (tx[pos:j], value.zfill(j - pos))
	
	return replace_unescaped_symbol(text, symbol, replace_func)

def upgrade_tabstops(node):
	"""
	Upgrades tabstops in zen node in order to prevent naming conflicts
	@type node: ZenNode
	@param offset: Tab index offset
	@type offset: int
	@returns Maximum tabstop index in element
	"""
	max_num = [0]
	props = ('start', 'end', 'content')
	
	def _replace(m):
		num = int(m.group(1) or m.group(2))
		if num > max_num[0]: max_num[0] = num
		return re.sub(r'\d+', str(num + max_tabstop), m.group(0), 1)
	
	for prop in props:
		node.__setattr__(prop, re.sub(r'\$(\d+)|\$\{(\d+):[^\}]+\}', _replace, node.__getattribute__(prop)))
		
	globals()['max_tabstop'] += max_num[0] + 1
		
	return max_num[0]

def unescape_text(text):
	"""
	Unescapes special characters used in Zen Coding, like '$', '|', etc.
	@type text: str
	@return: str
	"""
	return re.sub(r'\\(.)', r'\1', text)


def get_profile(name):
	"""
	Get profile by it's name. If profile wasn't found, returns 'plain' profile
	"""
	return profiles[name] if name in profiles else profiles['plain']

def get_image_size(stream):
	"""
	Gets image size from image byte stream.
	@author http://romeda.org/rePublish/
	@param stream: Image byte stream (use <code>zen_file.read()</code>)
	@type stream: str
	@return: dict with <code>width</code> and <code>height</code> properties
	""" 
	png_magic_num = "\211PNG\r\n\032\n"
	jpg_magic_num = "\377\330"
	gif_magic_num = "GIF8"
	pos = [0]
	
	def next_byte():
		char = char_at(stream, pos[0])
		pos[0] += 1
		return ord(char)

	if stream.startswith(png_magic_num):
		# PNG. Easy peasy.
		pos[0] = stream.find('IHDR') + 4
	
		return {
			'width':  (next_byte() << 24) | (next_byte() << 16) | (next_byte() <<  8) | next_byte(),
			'height': (next_byte() << 24) | (next_byte() << 16) | (next_byte() <<  8) | next_byte()
		}
	
	elif stream.startswith(gif_magic_num):
		pos[0] = 6
	
		return {
			'width': next_byte() | (next_byte() << 8),
			'height': next_byte() | (next_byte() << 8)
		}
	
	elif stream.startswith(jpg_magic_num):
		hex_list = ["%02X" % ord(ch) for ch in stream]
		
		for k in range(len(hex_list) - 1):
			if hex_list[k] == 'FF' and (hex_list[k + 1] == 'C0' or hex_list[k + 1] == 'C2'):
				#print k, hex(k)  # test
				return {
					'height': int(hex_list[k + 5], 16) * 256 + int(hex_list[k + 6], 16),
					'width': int(hex_list[k + 7], 16) * 256 + int(hex_list[k + 8], 16)
				}
	else:
		return {
			'width': -1,
			'height': -1
		}

def update_settings(settings):
	globals()['zen_settings'] = settings
	
class Tag(object):
	def __init__(self, name, count=1, doc_type='html'):
		"""
		@param name: Tag name
		@type name: str
		@param count:  How many times this tag must be outputted
		@type count: int
		@param doc_type: Document type (xsl, html)
		@type doc_type: str
		"""
		name = name.lower()
		
		abbr = get_abbreviation(doc_type, name)
		
		if abbr and abbr.type == stparser.TYPE_REFERENCE:
			abbr = get_abbreviation(doc_type, abbr.value)
		
		self.name = abbr and abbr.value['name'] or name.replace('+', '')
		self.count = count
		self.children = []
		self.attributes = []
		self.multiply_elem = None
		self.__attr_hash = {}
		self._abbr = abbr
		self.__content = ''
		self.repeat_by_lines = False
		self._res = zen_settings.has_key(doc_type) and zen_settings[doc_type] or {}
		self.parent = None
		
		# add default attributes
		if self._abbr and 'attributes' in self._abbr.value:
			for a in self._abbr.value['attributes']:
				self.add_attribute(a['name'], a['value'])
		
	def add_child(self, tag):
		"""
		Add new child
		@type tag: Tag
		"""
		tag.parent = self
		self.children.append(tag)
		
	def add_attribute(self, name, value):
		"""
		Add attribute to tag. If the attribute with the same name already exists,
		it will be overwritten, but if it's name is 'class', it will be merged
		with the existed one
		@param name: Attribute nama
		@type name: str
		@param value: Attribute value
		@type value: str
		"""
		
		# the only place in Tag where pipe (caret) character may exist
		# is the attribute: escape it with internal placeholder
		value = replace_unescaped_symbol(value, '|', get_caret_placeholder());
		
		if name in self.__attr_hash:
#			attribue already exists
			a = self.__attr_hash[name]
			if name == 'class':
#				'class' is a magic attribute
				if a['value']:
					value = ' ' + value
				a['value'] += value
			else:
				a['value'] = value
		else:
			a = {'name': name, 'value': value}
			self.__attr_hash[name] = a
			self.attributes.append(a)
	
	def has_tags_in_content(self):
		"""
		This function tests if current tags' content contains XHTML tags. 
	 	This function is mostly used for output formatting
		"""
		return self.get_content() and re_tag.search(self.get_content())
	
	def get_content(self):
		return self.__content
	
	def set_content(self, value):
		self.__content = value
		
	def set_content(self, content): #@DuplicatedSignature
		self.__content = content
		
	def get_content(self): #@DuplicatedSignature
		return self.__content
	
	def find_deepest_child(self):
		"""
		Search for deepest and latest child of current element.
		Returns None if there's no children
	 	@return Tag or None 
		"""
		if not self.children:
			return None
			
		deepest_child = self
		while True:
			deepest_child = deepest_child.children[-1]
			if not deepest_child.children:
				break
		
		return deepest_child
	
class Snippet(Tag):
	def __init__(self, name, count=1, doc_type='html'):
		super(Snippet, self).__init__(name, count, doc_type)
		self.value = replace_unescaped_symbol(get_snippet(doc_type, name), '|', get_caret_placeholder())
		self.attributes = {'id': get_caret_placeholder(), 'class': get_caret_placeholder()}
		self._res = zen_settings[doc_type]		
	
	def is_block(self):
		return True
	
class ZenNode(object):
	"""
	Creates simplified tag from Zen Coding tag
	"""
	def __init__(self, tag):
		"""
		@type tag: Tag
		"""
		self.type = 'snippet' if isinstance(tag, Snippet) else 'tag'
		self.name = tag.name
		self.attributes = tag.attributes
		self.children = [];
		self.counter = 1
		
		self.source = tag
		"Source element from which current tag was created"
		
		# relations
		self.parent = None
		self.next_sibling = None
		self.previous_sibling = None
		
		# output params
		self.start = ''
		self.end = ''
		self.content = ''
		self.padding = ''

	def add_child(self, tag):
		"""
		@type tag: ZenNode
		"""
		tag.parent = self
		
		if self.children:
			last_child = self.children[-1]
			tag.previous_sibling = last_child
			last_child.next_sibling = tag
		
		self.children.append(tag)
		
	def get_attribute(self, name):
		"""
		Get attribute's value.
		@type name: str
		@return: None if attribute wasn't found
		"""
		name = name.lower()
		for attr in self.attributes:
			if attr['name'].lower() == name:
				return attr['value']
		
		return None
	
	def is_unary(self):
		"""
		Test if current tag is unary (no closing tag)
		@return: bool
		"""
		if self.type == 'snippet':
			return False
			
		return (self.source._abbr and self.source._abbr.value['is_empty']) or (self.name in get_elements_collection(self.source._res, 'empty'))
	
	def is_inline(self):
		"""
		Test if current tag is inline-level (like <strong>, <img>)
		@return: bool
		"""
		return self.name in get_elements_collection(self.source._res, 'inline_level')
	
	def is_block(self):
		"""
		Test if current element is block-level
		@return: bool
		"""
		return self.type == 'snippet' or not self.is_inline()
	
	def has_tags_in_content(self):
		"""
		This function tests if current tags' content contains xHTML tags. 
		This function is mostly used for output formatting
		"""
		return self.content and re_tag.search(self.content)
	
	def has_children(self):
		"""
		Check if tag has child elements
		@return: bool
		"""
		return bool(self.children)
	
	def has_block_children(self):
		"""
		Test if current tag contains block-level children
		@return: bool
		"""
		if self.has_tags_in_content() and self.is_block():
			return True
		
		for item in self.children:
			if item.is_block():
				return True
			
		return False
	
	def find_deepest_child(self):
		"""
		Search for deepest and latest child of current element
		Returns None if there's no children
		@return: ZenNode|None 
		"""
		if not self.children:
			return None
			
		deepest_child = self
		while True:
			deepest_child = deepest_child.children[-1]
			if not deepest_child.children:
				break
		
		return deepest_child
	
	def to_string(self):
		"@return {String}"
		content = ''.join([item.to_string() for item in self.children])
		return self.start + self.content + content + self.end
		
class ZenError(Exception):
	"""
	Zen Coding specific error
	@since: 0.65
	"""
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)
		
# create default profiles
setup_profile('xhtml');
setup_profile('html', {'self_closing_tag': False});
setup_profile('xml', {'self_closing_tag': True, 'tag_nl': True});
setup_profile('plain', {'tag_nl': False, 'indent': False, 'place_cursor': False});

# This method call explicity loads default settings from zen_settings.py on start up
# Comment this line if you want to load data from other resources (like editor's 
# native snippet) 
update_settings(stparser.get_settings())
