'''
This file defines an XML parser, with a few kludges to make it
usable for HTML. autoSelfClosers defines a set of tag names that
are expected to not have a closing tag, and doNotIndent specifies
the tags inside of which no indentation should happen (see Config
object). These can be disabled by passing the editor an object like
{useHTMLKludges: false} as parserConfig option.

Original code by Marijn Haverbeke
from CodeMirror project: http://codemirror.net/

=====
Run <code>parse(text)</code> method to parse HTML string 
=====
'''
import re

class StopIteration(Exception):
	def __str__(self):
		return 'StopIteration'

def is_white_space(ch):
	return ch != "\n" and ch.isspace()

class Tokenizer(object):
	def __init__(self, source, state):
		self.state = state
		self.source = source

	def take(self, type):
		if isinstance(type, basestring):
			type = {
				'style' : type,
				'type' : type
			}

		if 'content' not in type:
			type['content'] = ''

		type['content'] += self.source.get()
		if not re.search(r'\n$', type['content']):
			self.source.next_while(is_white_space)

		type['value'] = type['content'] + self.source.get()
		return type

	def next(self):
		if not self.source.more():
			raise StopIteration

		if self.source.equals("\n"):
			self.source.next()
			return self.take("whitespace")

		type = None
		if self.source.applies(is_white_space):
			type = "whitespace"
		else:
			def save(s):
				self.state = s

			while not type:
				type = self.state(self.source, save)

		return self.take(type)

class TraverseDOM(object):
	def __init__(self, source):
		self.source = source
		self.__fed = False

	def next(self):
		if not self.__fed:
			self.__fed = True
			return self.source
		else:
			raise StopIteration

class StringStream(object):
	"""
	String streams are the things fed to parsers (which can feed them to a
	tokenizer if they want). They provide peek and next methods for looking at
	the current character (next 'consumes' this character, peek does not), and a
	get method for retrieving all the text that was consumed since the last time
	get was called.

	An easy mistake to make is to let a StopIteration exception finish the token
	stream while there are still characters pending in the string stream (hitting
	the end of the buffer while parsing a token). To make it easier to detect
	such errors, the stringstreams throw an exception when this happens.
	"""

	def __init__(self, source):
		"""
		Make a stringstream stream out of an iterator that returns strings.
		This is applied to the result of traverseDOM (see codemirror.js),
		and the resulting stream is fed to the parser.
		"""
		self.source = source
		self.current = ''
		"String that's currently being iterated over."

		self.pos = 0
		"Position in that string."

		self.accum = ""
		"Accumulator for strings that have been iterated over but not get()-ed yet."

		# ZC fix: if we've passed a string, wrap it with traverseDOM-like interface
		if isinstance(source, basestring):
			self.source = TraverseDOM(source)

	def ensure_chars(self):
		"Make sure there are more characters ready, or throw StopIteration."
		while self.pos == len(self.current):
			self.accum += self.current
			self.current = "" # In case source.next() throws
			self.pos = 0
			try:
				self.current = self.source.next()
			except StopIteration:
				return False

		return True

	def peek(self):
		"Return the next character in the stream."
		if not self.ensure_chars():
			return None

		return self.current[self.pos]

	def next(self):
		"""
		Get the next character, throw StopIteration if at end, check
		for unused content.
		"""
		if not self.ensure_chars():
			if len(self.accum) > 0:
				raise "End of stringstream reached without emptying buffer ('" + self.accum + "')."
			else:
				raise StopIteration

		result = self.pos < len(self.current) and self.current[self.pos] or None
		self.pos += 1
		return result

	def get(self):
		"Return the characters iterated over since the last call to .get()."
		temp = self.accum
		self.accum = ""
		if self.pos > 0:
			temp += self.current[0:self.pos]
			self.current = self.current[self.pos:]
			self.pos = 0

		return temp

	def push(self, str):
		"Push a string back into the stream."
		self.current = self.current[0:self.pos] + str + self.current[self.pos:]

	def look_ahead(self, str, consume, skip_spaces, case_insensitive):
		def cased(str):
			return case_insensitive and str.lower() or str

		str = cased(str)
		found = False

		_accum = self.accum
		_pos = self.pos
		if skip_spaces:
			self.next_while_matches(r'\s')

		while True:
			end = self.pos + len(str)
			left = len(self.current) - self.pos

			if end <= len(self.current):
				found = str == cased(self.current[self.pos:end])
				self.pos = end
				break
			elif str[0:left] == cased(self.current[self.pos:]):
				self.accum += self.current
				self.current = ""
				try:
					self.current = self.source.next()
				except StopIteration:
					break

				self.pos = 0
				str = str[left:]
			else:
				break

		if not (found and consume):
			self.current = self.accum[len(_accum):] + self.current
			self.pos = _pos
			self.accum = _accum


		return found

	def look_ahead_regex(self, regex, consume):
		"Wont't match past end of line."
		if regex[0] != "^":
			raise Exception("Regexps passed to lookAheadRegex must start with ^")

		# Fetch the rest of the line
		while self.current.find("\n", self.pos) == -1:
			try:
				self.current += self.source.next()
			except StopIteration:
				break

		matched = re.match(regex, self.current[self.pos:])
		if matched and consume:
			self.pos += len(matched.group(0))

		return matched

	def more(self):
		"Produce true if the stream isn't empty."
		return self.peek() is not None

	def applies(self, test):
		next = self.peek()
		return next is not None and test(next)

	def next_while(self, test):
		next = self.peek()
		while next is not None and test(next):
			self.next()
			next = self.peek()

	def matches(self, regexp):
		next = self.peek()
		return next is not None and re.search(regexp, next)

	def next_while_matches(self, regexp):
		next = self.peek()
		while next is not None and re.search(regexp, next):
			self.next()
			next = self.peek()

	def equals(self, ch):
		return ch == self.peek()

	def end_of_line(self):
		next = self.peek()
		return next is None or next == "\n"

Kludges = {
'autoSelfClosers': {"br": True, "img": True, "hr": True, "link": True, "input": True,
					"meta": True, "col": True, "frame": True, "base": True, "area": True},
'doNotIndent': {"pre": True, "!cdata": True}
}
NoKludges = {'autoSelfClosers': {}, 'doNotIndent': {"!cdata": True}}
UseKludges = Kludges
alignCDATA = False

def tokenize_xml(source, start_state=None):
	"""
	Simple stateful tokenizer for XML documents. Returns a
	MochiKit-style iterator, with a state property that contains a
	function encapsulating the current state. See tokenize.js.
	"""

	def in_text(source, set_state):
		ch = source.next()
		if ch == "<":
			if source.equals("!"):
				source.next();
				if source.equals("["):
					if source.look_ahead("[CDATA[", True):
						set_state(in_block("xml-cdata", "]]>"))
						return None
					else:
						return "xml-text"
				elif source.look_ahead("--", True):
					set_state(in_block("xml-comment", "-->"))
					return None
				elif source.look_ahead("DOCTYPE", True):
					source.next_while_matches(r'[\w\._\-]')
					set_state(in_block("xml-doctype", ">"))
					return "xml-doctype"
				else:
					return "xml-text"
			elif source.equals("?"):
				source.next()
				source.next_while_matches(r'[\w\._\-]')
				set_state(in_block("xml-processing", "?>"))
				return "xml-processing"
			else:
				if source.equals("/"):
					source.next()
				set_state(in_tag)
				return "xml-punctuation"
		elif ch == "&":
			while not source.end_of_line():
				if source.next() == ";":
					break;
			return "xml-entity";
		else:
			source.next_while_matches(r'[^&<\n]')
			return "xml-text";

	def in_tag(source, set_state):
		ch = source.next()
		if ch == ">":
			set_state(in_text)
			return "xml-punctuation";
		elif re.match(r'[?\/]', ch) and source.equals(">"):
			source.next();
			set_state(in_text)
			return "xml-punctuation"
		elif ch == "=":
			return "xml-punctuation"
		elif re.match(r'[\'"]', ch):
			set_state(in_attribute(ch))
			return None
		else:
			source.next_while_matches(r'[^\s=<>\"\'\/?]')
			return "xml-name"

	def in_attribute(quote):
		def fn(source, set_state):
			while not source.end_of_line():
				if source.next() == quote:
					set_state(in_tag)
					break
			return "xml-attribute";

		return fn

	def in_block(style, terminator):
		def fn(source, set_state):
			while not source.end_of_line():
				if source.look_ahead(terminator, True):
					set_state(in_text)
					break
				source.next()

			return style

		return fn

	return Tokenizer(source, start_state or in_text)

def parse(source):
	"Parse HTML source"
	if isinstance(source, basestring):
		source = StringStream(source)
	
	tokens = tokenize_xml(source)
	token = [None]
	current_tag = None
	context = [None]
	consume = [False]

	def push(fs):
		i = len(fs) - 1
		while i >= 0:
			cc.append(fs[i])
			i -= 1

	def cont(*args):
		push(args);
		consume[0] = True

	def _pass(*args):
		push(args)
		consume[0] = False

	def mark_err():
		token[0]['style'] += " xml-error"

	def expect(text):
		def fn(style, content):
			if content == text: cont()
			else: mark_err()

		return fn

	def push_context(tagname):
		context[0] = {
			'prev': context[0],
			'name': tagname
		}

	def pop_context():
		context[0] = context[0]['prev']
		
	harmless_tokens = {
		"xml-text": True,
		"xml-entity": True,
		"xml-comment": True,
		"xml-processing": True,
		"xml-doctype": True
	}

	def base(*args):
		return _pass(element, base)
	
	def element(style, content):
		if content == "<":
			cont(tagname, attributes, endtag())
		elif content == "</":
			cont(closetagname, expect(">"))
		elif style == "xml-cdata":
			if not context[0] or context[0]['name'] != "!cdata":
				push_context("!cdata")
			if re.search(r'\]\]>$', content):
				pop_context()
			cont()
		elif style in harmless_tokens:
			cont()
		else:
			mark_err()
			cont()

	def tagname(style, content):
		if style == "xml-name":
			current_tag = content.lower()
			token[0]['style'] = "xml-tagname"
			cont()
		else:
			current_tag = None
			_pass()

	def closetagname(style, content):
		if style == "xml-name":
			token[0]['style'] = "xml-tagname"
			if context[0] and content.lower() == context[0]['name']:
				pop_context()
			else:
				mark_err()
		cont()

	def endtag(*args):
		def fn(style, content):
			if content == "/>" or (content == ">" and current_tag in UseKludges['autoSelfClosers']):
				cont()
			elif content == ">":
				push_context(current_tag)
				cont()
			else: 
				mark_err()
				cont()
				
		return fn
	
	def attributes(style, content):
		if style == "xml-name":
			token[0]['style'] = "xml-attname"
			cont(attribute, attributes)
		else:
			_pass()
	
	def attribute(style, content):
		if content == "=":
			cont(value)
		elif content == ">" or content == "/>":
			_pass(endtag)
		else:
			_pass()
	
	def value(style, content):
		if style == "xml-attribute":
			cont(value)
		else: 
			_pass()
	
	def next():
		token[0] = tokens.next()
		if token[0]['style'] == "whitespace" or token[0]['type'] == "xml-comment":
			return token[0]

		while True:
			consume[0] = False
			cc.pop()(token[0]['style'], token[0]['content'])
			if consume[0]: 
				return token[0]
			
	cc = [base]
	return {'next': next}


	
