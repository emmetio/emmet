'''
@author Sergey Chikuyonok (serge.che@gmail.com)
@link http://chikuyonok.ru
'''
from zencoding.parser import css, xml
import re

def is_stop_char(token):
	return token['type'] in '{};:'

def char_at(text, pos):
	"""
	Returns character at specified index of text.
	If index if out of range, returns empty string
	"""
	return text[pos] if pos < len(text) else ''

def calculate_nl_length(content, pos):
	"""
	Calculates newline width at specified position in content
	@param content: str
	@param pos: int
	@return: int
	"""
	if char_at(content, pos) == '\r' and char_at(content, pos + 1) == '\n':
		return 2
		
	return 1

def post_process_optimized(optimized, original):
	"""
	Post-process optimized tokens: collapse tokens for complex values
	@param optimized: Optimized tokens
	@type optimized: list
	@param original: Original preprocessed tokens 
	@type original: list 
	"""
	for token in optimized:
		child = None
		if token['type'] == 'value':
			token['children'] = []
			child = None
			
			subtoken_start = token['ref_start_ix']
				
			while subtoken_start <= token['ref_end_ix']:
				subtoken = original[subtoken_start]
				if subtoken['type'] != 'white':
					if not child:
						child = [subtoken['start'], subtoken['end']]
					else:
						child[1] = subtoken['end']
				elif child:
					token['children'].append(child)
					child = None
				
				subtoken_start += 1	
			
			if child: # push last token
				token['children'].append(child)
	
	return optimized

def make_token(type='', value='', pos=0, ix=0):
	value = value or ''
	return {
		'type': type or '',
		'content': value,
		'start': pos,
		'end': pos + len(value),
		# Reference token index that starts current token
		'ref_start_ix': ix,
		# Reference token index that ends current token
		'ref_end_ix': ix
	}

def parse_css(source, offset=0):
	"""
	Parses CSS and optimizes parsed chunks
	@param source: CSS source code fragment
	@type source: str
	@param offset: Offset of CSS fragment inside whole document
	@type offset: int
	@return: list
	"""
	return optimize_css(css.parse(source), offset, source)

def parse_html(tag, offset=0):
	"""
	Parses HTML and optimizes parsed chunks
	@param source: HTML source code fragment
	@type source: str
	@param offset: Offset of HTML fragment inside whole document
	@type offset: int
	@return: list
	"""
	tokens = xml.parse(tag)
	result = []
	i = 0
	loop = 1000 # infinite loop protection
		
	try:
		while loop:
			loop -= 1
			t = tokens['next']()
			if not t:
				break
			else:
				result.append(make_token(t['style'], t['content'], offset + i, 0))
				i += len(t['value'])
	except xml.StopIteration:
		pass
	
	return result

class ExtList(list):
	def __init__(self):
		super(ExtList, self).__init__()
		self.original = []
		

def optimize_css(tokens, offset, content):
	"""
	Optimizes parsed CSS tokens: combines selector chunks, complex values
	into a single chunk
	@param tokens: Tokens produced by <code>CSSEX.lex()</code>
	@type tokens: list
	@param offset: CSS rule offset in source code (character index)
	@type offset: int
	@param content: Original CSS source code
	@type content: str
	@return: list of optimized tokens  
	"""
	offset = offset or 0
	result = ExtList()
	_o = 0
	i = 0
	delta = 0
	in_rules = False
	in_value = False
	acc_tokens = {
		'selector': None,
		'value': None
	}
	orig_tokens = []
	acc_type = None
		
	def add_token(token, type):
		if type and type in acc_tokens:
			if not acc_tokens[type]:
				acc_tokens[type] = make_token(type, token['value'], offset + delta + token['charstart'], i)
				result.append(acc_tokens[type])
			else:
				acc_tokens[type]['content'] += token['value']
				acc_tokens[type]['end'] += len(token['value'])
				acc_tokens[type]['ref_end_ix'] = i
		else:
			result.append(make_token(token['type'], token['value'], offset + delta + token['charstart'], i))
		
	for i, token in enumerate(tokens):
		token = tokens[i]
		acc_type = None
		
		if token['type'] == 'line':
			delta += _o
			nl_size = content and calculate_nl_length(content, delta) or 1
			tok_value = nl_size == 1 and '\n' or '\r\n'
			
			orig_tokens.append(make_token(token['type'], tok_value, offset + delta))
			
			result.append(make_token(token['type'], tok_value, offset + delta, i))
			delta += nl_size
			_o = 0
			
			continue
		
		orig_tokens.append(make_token(token['type'], token['value'], offset + delta + token['charstart']))
		
		# use charstart and length because of incorrect charend 
		# computation for whitespace
		_o = token['charstart'] + len(token['value'])
		
		if token['type'] != 'white':
			if token['type'] == '{':
				in_rules = True
				acc_tokens['selector'] = None
			elif in_rules:
				if token['type'] == ':':
					in_value = True
				elif token['type'] == ';':
					in_value = False
					acc_tokens['value'] = None
				elif token['type'] == '}':
					in_value = in_rules = False
					acc_tokens['value'] = None
				elif in_value or acc_tokens['value']:
					acc_type = 'value'
			elif acc_tokens['selector'] or (not in_rules and not is_stop_char(token)):
				# start selector token
				acc_type = 'selector'
			
			add_token(token, acc_type)
		else:
			# whitespace token, decide where it should be
			if i < len(tokens) - 1 and is_stop_char(tokens[i + 1]):
				continue
			
			if acc_tokens['selector'] or acc_tokens['value']:
				add_token(token, acc_tokens['selector'] and 'selector' or 'value')
	
	result.original = orig_tokens
	return post_process_optimized(result, orig_tokens)

def extract_css_rule(content, pos, is_backward=False):
	"""
	 Extracts single CSS selector definition from source code
	 @param {String} content CSS source code
	 @type content: str
	 @param pos: Character position where to start source code extraction
	 @type pos: int
	"""
	result = '' 
	c_len = len(content)
	offset = pos 
	brace_pos = -1
	
	# search left until we find rule edge
	while offset >= 0:
		ch = content[offset]
		if ch == '{':
			brace_pos = offset
			break
		elif ch == '}' and not is_backward:
			offset += 1
			break
		
		offset -= 1
	
	# search right for full rule set
	while offset < c_len:
		ch = content[offset]
		if ch == '{':
			brace_pos = offset
		elif ch == '}':
			if brace_pos != -1:
				result = content[brace_pos:offset + 1]
			break
		
		offset += 1
	
	if result:
		# find CSS selector
		offset = brace_pos - 1
		selector = ''
		while offset >= 0:
			ch = content[offset]
			if ch in '{}/\\<>': break
			offset -= 1
		
		# also trim whitespace
		re_white = re.compile(r'^[\s\n\r]+', re.MULTILINE)
		selector = re.sub(re_white, '', content[offset + 1:brace_pos])
		return (brace_pos - len(selector), brace_pos + len(result))
	
	return None

# function alias
token = make_token