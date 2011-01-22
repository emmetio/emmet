'''
A Python port of Stoyan Stefanov's CSSEX CSS parser

How to use:
call <code>lex(source)</code> to parse CSS source into tokens
call <code>to_source(tokens)</code> to transform parsed tokens back to CSS source

@link https://github.com/stoyan/etc/tree/master/cssex
@author: Sergey Chikuyonok

'''

class Walker(object):
	def __init__(self, source=None):
		self.lines = None
		self.total_lines = 0
		self.line = ''
		self.ch =  ''
		self.linenum = -1
		self.chnum = -1

		if source is not None:
			self.init(source)

	def init(self, source):
		# source, yumm
		self.lines = source.splitlines()
		self.total_lines = len(self.lines)

		# reset
		self.chnum = -1
		self.linenum = -1
		self.ch = ''
		self.line = ''

		# advance
		self.next_line()
		self.next_char()


	def next_line(self):
		self.linenum += 1
		if self.total_lines <= self.linenum:
			self.line = False
		else:
			self.line = self.lines[self.linenum]

		if self.chnum != -1:
			self.chnum = 0

		return self.line

	def next_char(self):
		self.chnum += 1
		while get_char(self.line, self.chnum) is None:
			if self.next_line() is False:
				self.ch = False
				return False # end of source

			self.chnum = -1
			self.ch = '\n'
			return '\n'

		self.ch = self.line[self.chnum]
		return self.ch

__walker = Walker()
__tokens = []

# utility helpers
def get_char(text, pos):
	if pos >= 0 and pos < len(text):
		return text[pos]
	else:
		return None

def is_name_char(c):
	return c == '_' or c == '-' or c.isalpha()

def is_op(ch, matchattr=None):
	if matchattr:
		return ch in '*^|$~'

	return ch in "{}[]()+*=.,;:>~|\\%$#@^!"

def get_conf():
	return {
		'char': __walker.chnum,
		'line': __walker.linenum
	}

def tokener(value, token_type=None, conf=None):
	"creates token objects and pushes them to a list"
	w = __walker
	c = conf or {}
	__tokens.append({
		'charstart': 'char' in c and c['char'] or w.chnum,
		'charend':   'charend' in c and c['charend'] or w.chnum,
		'linestart': 'line' in c and c['line'] or w.linenum,
		'lineend':   'lineend' in c and c['lineend'] or w.linenum,
		'value':     value,
		'type':      token_type or value
	})


# oops
class CSSEXError(Exception):
	def __init__(self, value, conf=None):
		self.value = value
		self.conf = conf or {}
		self.w = __walker

	def __str__(self):
		c = 'char' in self.conf and self.conf['char'] or self.w.chnum
		l = 'line' in self.conf and self.conf['line'] or self.w.linenum
		return "%s at line %d char %d" % (self.value, l + 1, c + 1)


# token handlers follow for:
# white space, comment, string, identifier, number, operator
def white():
	c = __walker.ch
	token = ''
	conf = get_conf()

	while c == " " or c == "\t":
		token += c
		c = __walker.next_char()


	tokener(token, 'white', conf)

def comment():
	w = __walker
	c = w.ch
	token = c
	conf = get_conf()

	cnext = w.next_char()

	if cnext != '*':
		# oops, not a comment, just a /
		conf['charend'] = conf['char']
		conf['lineend'] = conf['line']
		return tokener(token, token, conf)

	while not (c == "*" and cnext == "/"):
		token += cnext
		c = cnext
		cnext = w.next_char()

	token += cnext
	w.next_char()
	tokener(token, 'comment', conf)

def str():
	w = __walker
	c = w.ch
	q = c
	token = c
	conf = get_conf()

	c = w.next_char()

	while c != q:

		if c == '\n':
			cnext = w.next_char()
			if cnext == "\\":
				token += c + cnext
			else:
				# end of line with no \ escape = bad
				raise CSSEXError("Unterminated string", conf)

		else:
			if c == "\\":
				token += c + w.next_char()
			else:
				token += c

		c = w.next_char()

	token += c
	w.next_char()
	tokener(token, 'string', conf)

def identifier(pre=None):
	w = __walker
	c = w.ch
	conf = get_conf()
	token = pre and pre + c or c

	c = w.next_char()

	while is_name_char(c) or c.isdigit():
		token += c
		c = w.next_char()

	tokener(token, 'identifier', conf)

def num():
	w = __walker
	c = w.ch
	conf = get_conf()
	token = c
	point = token == '.'

	c = w.next_char()
	nondigit = not c.isdigit()

	# .2px or .classname?
	if point and nondigit:
		# meh, NaN, could be a class name, so it's an operator for now
		conf['charend'] = conf['char']
		conf['lineend'] = conf['line']
		return tokener(token, '.', conf)

	# -2px or -moz-something
	if token == '-' and nondigit:
		return identifier('-')

	while c is not False and (c.isdigit() or (not point and c == '.')):  # not end of source && digit or first instance of .
		if c == '.':
			point = True

		token += c
		c = w.next_char()

	tokener(token, 'number', conf)

def op():
	w = __walker
	c = w.ch
	conf = get_conf()
	token = c
	next = w.next_char()

	if next == "=" and is_op(token, True):
		token += next
		tokener(token, 'match', conf)
		w.next_char()
		return

	conf['charend'] = conf['char'] + 1
	conf['lineend'] = conf['line']
	tokener(token, token, conf)

# call the appropriate handler based on the first character in a token suspect
def tokenize():
	ch = __walker.ch

	if ch == " " or ch == "\t":
		return white()

	if ch == '/':
		return comment()

	if ch == '"' or ch == "'":
		return str()

	if ch == '-' or ch == '.' or ch.isdigit(): # tricky - char: minus (-1px) or dash (-moz-stuff)
		return num()

	if is_name_char(ch):
		return identifier()

	if is_op(ch):
		return op()

	if ch == "\n":
		tokener("line")
		__walker.next_char()
		return

	raise CSSEXError("Unrecognized character")

def parse(source):
	"""
	Parse CSS source
	@type source: str
	"""
	__walker.init(source)
	globals()['__tokens'] = []
	while __walker.ch is not False:
		tokenize()

	return __tokens


def to_source(tokens):
	"""
	Transform parsed tokens to CSS source
	@type tokens: list
	"""
	src = ''
	for t in tokens:
		if t['type'] == 'line':
			src += '\n'
		else:
			src += t['value']
			
	return src

