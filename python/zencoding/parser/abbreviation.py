'''
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
import re

re_word = re.compile(r'^[\w\-:\$]+')
re_attr_string = re.compile(r'^(["\'])((?:(?!\1)[^\\]|\\.)*)\1')
re_valid_name = re.compile(r'^[\w\d\-_\$\:@!]+\+?$', re.IGNORECASE)

def char_at(text, pos):
	"""
	Returns character at specified index of text.
	If index if out of range, returns empty string
	"""
	return text[pos] if pos < len(text) else ''

def split_expression(expr):
	"""
	Split expression by node name and its content, if exists. E.g. if we pass
	'a{Text}' expression, it will be splitted into 'a' and 'Text'
	
	@type expr: str
	@return: Result tuple with two elements: node name and its content
	"""
	# fast test on text node
	if '{' not in expr:
		return expr, None
		
	attr_lvl = 0
	text_lvl = 0
	brace_stack = []
	i = 0
	il = len(expr)
		
	while i < il:
		ch = expr[i]
		if ch == '[':
			if not text_lvl:
				attr_lvl += 1
		elif ch == ']':
			if not text_lvl:
				attr_lvl -= 1
		elif ch == '{':
			if not attr_lvl:
				text_lvl += 1
				brace_stack.append(i)
		elif ch == '}':
			if not attr_lvl:
				text_lvl -= 1
				brace_start = brace_stack.pop()
				if text_lvl == 0:
					# found braces bounds
					return expr[0:brace_start], expr[brace_start + 1:i]
		i += 1
	
	# if we are here, then no valid text node found
	return expr, None

def parse_attributes(s):
	"""
	Parses tag attributes extracted from abbreviation
	@type s: str
	
	Example of incoming data:
	#header
	.some.data
	.some.data#header
	[attr]
	#item[attr=Hello other="World"].class
	"""
	
	result = []
	name = ''
	collect_name = True
	class_name = None
	char_map = {'#': 'id', '.': 'class'}
	
	# walk char-by-char
	i = 0
	il = len(s)
		
	while i < il:
		ch = s[i]
		if ch == '#': # id
			val = get_word(i, s[1:])
			result.append({'name': char_map[ch], 'value': val})
			i += len(val) + 1
			collect_name = False
		elif ch == '.': # class
			val = get_word(i, s[1:])
			if not class_name:
				# remember object pointer for value modification
				class_name = {'name': char_map[ch], 'value': ''}
				result.append(class_name)
			
			class_name['value'] += (class_name['value'] and ' ' or '') + val
			i += len(val) + 1
			collect_name = False
		elif ch == '[': # begin attribute set
			# search for end of set
			try:
				end_ix = s.index(']', i)
				for a in extract_attributes(s[i + 1:end_ix]):
					result.append(a)
					
				i = end_ix
			except:
				# invalid attribute set, stop searching
				i = len(s)
				
			collect_name = False
		else:
			if collect_name:
				name += ch
			i += 1
			
	return name, result

def get_word(ix, s):
	"""
	Get word, starting at 'ix' character of 's
	"""
	m = re_word.match(s[ix:])
	return m and m.group(0) or ''

def extract_attributes(attr_set):
	"""
	Extract attributes and their values from attribute set 
	@type attr_set: str
	"""
	attr_set = attr_set.strip()
	loop_count = 100 # endless loop protection
	result = []
	attr = None
		
	while attr_set and loop_count:
		attr_name = get_word(0, attr_set)
		attr = None
		if attr_name:
			attr = {'name': attr_name, 'value': ''}
			
			# let's see if attribute has value
			ch = char_at(attr_set, len(attr_name))
			if ch == '=':
				ch2 = char_at(attr_set, len(attr_name) + 1)
				if ch2 == '"' or ch2 == "'":
					# we have a quoted string
					m = re_attr_string.match(attr_set[len(attr_name) + 1:])
					if m:
						attr['value'] = m.group(2)
						attr_set = attr_set[len(attr_name) + len(m.group(0)) + 1:].strip()
					else:
						# something wrong, break loop
						attr_set = ''
				else:
					# unquoted string
					m = re.match(r'(.+?)(\s|$)', attr_set[len(attr_name) + 1:])
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
			break;
		
		if attr: result.append(attr)
		loop_count -= 1
	
	return result

def squash(node):
	"""
	Optimizes tree node: replaces empty nodes with their children
	@type node: TreeNode
	@return: TreeNode
	"""
	for i, child in enumerate(node.children):
		if child.is_empty():
			node.children[i:i + 1] = child.children
	
	return node

def optimize_tree(node):
	"""
	@type node: TreeNode
	@return: TreeNode
	"""
	while node.has_empty_children():
		squash(node)
		
	for child in node.children:
		optimize_tree(child)
	
	return node

def parse(abbr):
	"""
	Parses abbreviation into tree with respect of groups, 
	text nodes and attributes. Each node of the tree is a single 
	abbreviation. Tree represents actual structure of the outputted 
	result
	@param abbr: Abbreviation to parse
	@type abbr: str
	@return: TreeNode
	"""
	root = TreeNode()
	context = root.add_child()
	i = 0
	il = len(abbr)
	text_lvl = 0
	attr_lvl = 0
	group_stack = [root]
	token = ['']
		
	def dump_token():
		if token[0]:
			context.set_abbreviation(token[0])
		token[0] = ''
		
	while i < il:
		ch = abbr[i]
		prev_ch = i and abbr[i - 1] or ''
		if ch == '{':
			if not attr_lvl:
				text_lvl += 1
			token[0] += ch
		elif ch == '}':
			if not attr_lvl:
				text_lvl -= 1
			token[0] += ch
		elif ch == '[':
			if not text_lvl:
				attr_lvl += 1
			token[0] += ch
		elif ch == ']':
			if not text_lvl:
				attr_lvl -= 1
			token[0] += ch
		elif ch == '(':
			if not text_lvl and not attr_lvl:
				# beginning of the new group
				dump_token();
				
				if prev_ch != '+' and prev_ch != '>':
					# previous char is not an operator, assume it's
					# a sibling
					context = context.parent.add_child()
				
				group_stack.append(context)
				context = context.add_child()
			else:
				token[0] += ch
		elif ch == ')':
			if not text_lvl and not attr_lvl:
				# end of the group, pop stack
				dump_token()
				context = group_stack.pop()
				
				if i < il - 1 and char_at(abbr, i + 1) == '*':
					# group multiplication
					group_mul = ''
					for j in xrange(i + 2, il):
						n_ch = abbr[j]
						if n_ch.isdigit():
							group_mul += n_ch
						else:
							break
						
					i += len(group_mul) + 1
					group_mul = int(group_mul or 1)
					while 1 < group_mul:
						context.parent.add_child(context)
						group_mul -= 1
			else:
				token[0] += ch
		elif ch == '+': # sibling operator
			if not text_lvl and not attr_lvl and i != il - 1:
				dump_token()
				context = context.parent.add_child()
			else:
				token[0] += ch
		elif ch == '>': # child operator
			if not text_lvl and not attr_lvl:
				dump_token()
				context = context.add_child()
			else:
				token[0] += ch
		else:
			token[0] += ch
		
		i += 1
	
	# put the final token
	dump_token()
	return optimize_tree(root)

class TreeNode(object):
	re_multiplier = re.compile(r'\*(\d+)?$')
	
	def __init__(self, parent=None):
		self.abbreviation = '';
		self.parent = parent
		self.children = []
		self.count = 1
		self.name = None
		self.text = None
		self.attributes = []
		self.is_repeating = False
		self.has_implicit_name = False
		
	def add_child(self, child=None):
		"""
		Adds passed or creates new child
		@type child: TreeNode
		@return: TreeNode
		"""
		if not child: child = TreeNode()
		child.parent = self
		self.children.append(child)
		return child
	
	def replace(self, node):
		"""
		Replace current node in parent's child list with another node
		@type node: TreeNode
		"""
		if self.parent:
			children = self.parent.children
			if self in children:
				children[children.index(self)] = node
				self.parent = None
				return
			
	def set_abbreviation(self, abbr):
		"""
		Sets abbreviation that belongs to current node
		@type abbr: str
		"""
		self.abbreviation = abbr
		m = self.re_multiplier.search(abbr)
		if m:
			self.count = m.group(1) and int(m.group(1)) or 1
			self.is_repeating = not m.group(1)
			abbr = abbr[0:-len(m.group(0))]
		
		if abbr:
			name, self.text = split_expression(abbr)
				
			if name:
				self.name, self.attributes = parse_attributes(name)
				if not self.name:
					self.name = 'div'
					self.has_implicit_name = True
		
		# validate name
		if self.name and not re_valid_name.match(self.name):
			raise ZenInvalidAbbreviation('self.name')
		
	def get_abbreviation(self):
		return self.expr
	
	def to_string(self, level=0):
		"""
		Dump current tree node into a foramtted string
		"""
		output = '(empty)'
		if self.abbreviation:
			output = ''
			if self.name:
				output = self.name
				
			if self.text is not None:
				output += (output and ' ' or '') + '{text: "' + self.text + '"}'
				
			if self.attributes:
				output += ' [' + ', '.join(['%s="%s"' % (a['name'], a['value']) for a in self.attributes]) + ']'
			
		result = ('-' * level) + output + '\n'
		for child in self.children:
			result += child.to_string(level + 1)
			
		return result
	
	def __repr__(self):
		return self.to_string()
	
	def has_empty_children(self):
		"""
		Check if current node contains children with empty <code>expr</code>
		property
		"""
		for child in self.children:
			if child.is_empty():
				return True
			
		return False
	
	def is_empty(self):
		return not self.abbreviation
	
	def is_text_node(self):
		"""
		Check if current node is a text-only node
		"""
		return not self.name and self.text
	

class ZenInvalidAbbreviation(Exception):
	"""
	Invalid abbreviation error
	@since: 0.7
	"""
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)