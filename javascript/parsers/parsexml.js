/* This file defines an XML parser, with a few kludges to make it
 * useable for HTML. autoSelfClosers defines a set of tag names that
 * are expected to not have a closing tag, and doNotIndent specifies
 * the tags inside of which no indentation should happen (see Config
 * object). These can be disabled by passing the editor an object like
 * {useHTMLKludges: false} as parserConfig option.
 * 
 * Original code by Marijn Haverbeke
 * from CodeMirror projet: http://codemirror.net/
 */

var XMLParser = (function() {
	// The value used to signal the end of a sequence in iterators.
	var StopIteration = {
		toString : function() {
			return "StopIteration"
		}
	};
	
	// Apply a function to each element in a sequence.
	function forEach(iter, f) {
		if (iter.next) {
			try {
				while (true)
					f(iter.next());
			} catch (e) {
				if (e != StopIteration)
					throw e;
			}
		} else {
			for (var i = 0; i < iter.length; i++)
				f(iter[i]);
		}
	}
	
	// A framework for simple tokenizers. Takes care of newlines and
	// white-space, and of getting the text from the source stream into
	// the token object. A state is a function of two arguments -- a
	// string stream and a setState function. The second can be used to
	// change the tokenizer's state, and can be ignored for stateless
	// tokenizers. This function should advance the stream over a token
	// and return a string or object containing information about the next
	// token, or null to pass and have the (new) state be called to finish
	// the token. When a string is given, it is wrapped in a {style, type}
	// object. In the resulting object, the characters consumed are stored
	// under the content property. Any whitespace following them is also
	// automatically consumed, and added to the value property. (Thus,
	// content is the actual meaningful part of the token, while value
	// contains all the text it spans.)
	
	function tokenizer(source, state) {
		// Newlines are always a separate token.
		function isWhiteSpace(ch) {
			// The messy regexp is because IE's regexp matcher is of the
			// opinion that non-breaking spaces are no whitespace.
			return ch != "\n" && /^[\s\u00a0]*$/.test(ch);
		}
	
		var tokenizer = {
			state : state,
	
			take : function(type) {
				if (typeof(type) == "string")
					type = {
						style : type,
						type : type
					};
	
				type.content = (type.content || "") + source.get();
				if (!/\n$/.test(type.content))
					source.nextWhile(isWhiteSpace);
				type.value = type.content + source.get();
				return type;
			},
	
			next : function() {
				if (!source.more())
					throw StopIteration;
	
				var type;
				if (source.equals("\n")) {
					source.next();
					return this.take("whitespace");
				}
	
				if (source.applies(isWhiteSpace))
					type = "whitespace";
				else
					while (!type)
						type = this.state(source, function(s) {
									tokenizer.state = s;
								});
	
				return this.take(type);
			}
		};
		return tokenizer;
	}
	
	/*
	 * String streams are the things fed to parsers (which can feed them to a
	 * tokenizer if they want). They provide peek and next methods for looking at
	 * the current character (next 'consumes' this character, peek does not), and a
	 * get method for retrieving all the text that was consumed since the last time
	 * get was called.
	 * 
	 * An easy mistake to make is to let a StopIteration exception finish the token
	 * stream while there are still characters pending in the string stream (hitting
	 * the end of the buffer while parsing a token). To make it easier to detect
	 * such errors, the stringstreams throw an exception when this happens.
	 */
	
	// Make a stringstream stream out of an iterator that returns strings.
	// This is applied to the result of traverseDOM (see codemirror.js),
	// and the resulting stream is fed to the parser.
	var stringStream = function(source) {
		// String that's currently being iterated over.
		var current = "";
		// Position in that string.
		var pos = 0;
		// Accumulator for strings that have been iterated over but not
		// get()-ed yet.
		var accum = "";
		
		// ZC fix: if we've passed a string, wrap it with traverseDOM-like interface
		if (typeof source == 'string') {
			var _source = source,
				_fed = false;
			source = {
				next: function() {
					if (!_fed) {
						_fed = true;
						return _source;
					} else {
						throw StopIteration;
					}
				}
			}
		}
		
		// Make sure there are more characters ready, or throw
		// StopIteration.
		function ensureChars() {
			while (pos == current.length) {
				accum += current;
				current = ""; // In case source.next() throws
				pos = 0;
				try {
					current = source.next();
				} catch (e) {
					if (e != StopIteration)
						throw e;
					else
						return false;
				}
			}
			return true;
		}
	
		return {
			// peek: -> character
			// Return the next character in the stream.
			peek : function() {
				if (!ensureChars())
					return null;
				return current.charAt(pos);
			},
			// next: -> character
			// Get the next character, throw StopIteration if at end, check
			// for unused content.
			next : function() {
				if (!ensureChars()) {
					if (accum.length > 0)
						throw "End of stringstream reached without emptying buffer ('" + accum + "').";
					else
						throw StopIteration;
				}
				return current.charAt(pos++);
			},
			// get(): -> string
			// Return the characters iterated over since the last call to
			// .get().
			get : function() {
				var temp = accum;
				accum = "";
				if (pos > 0) {
					temp += current.slice(0, pos);
					current = current.slice(pos);
					pos = 0;
				}
				return temp;
			},
			// Push a string back into the stream.
			push : function(str) {
				current = current.slice(0, pos) + str + current.slice(pos);
			},
			lookAhead : function(str, consume, skipSpaces, caseInsensitive) {
				function cased(str) {
					return caseInsensitive ? str.toLowerCase() : str;
				}
				str = cased(str);
				var found = false;
	
				var _accum = accum, _pos = pos;
				if (skipSpaces)
					this.nextWhileMatches(/[\s\u00a0]/);
	
				while (true) {
					var end = pos + str.length, left = current.length - pos;
					if (end <= current.length) {
						found = str == cased(current.slice(pos, end));
						pos = end;
						break;
					} else if (str.slice(0, left) == cased(current.slice(pos))) {
						accum += current;
						current = "";
						try {
							current = source.next();
						} catch (e) {
							if (e != StopIteration)
								throw e;
							break;
						}
						pos = 0;
						str = str.slice(left);
					} else {
						break;
					}
				}
	
				if (!(found && consume)) {
					current = accum.slice(_accum.length) + current;
					pos = _pos;
					accum = _accum;
				}
	
				return found;
			},
			// Wont't match past end of line.
			lookAheadRegex : function(regex, consume) {
				if (regex.source.charAt(0) != "^")
					throw new Error("Regexps passed to lookAheadRegex must start with ^");
	
				// Fetch the rest of the line
				while (current.indexOf("\n", pos) == -1) {
					try {
						current += source.next();
					} catch (e) {
						if (e != StopIteration)
							throw e;
						break;
					}
				}
				var matched = current.slice(pos).match(regex);
				if (matched && consume)
					pos += matched[0].length;
				return matched;
			},
	
			// Utils built on top of the above
			// more: -> boolean
			// Produce true if the stream isn't empty.
			more : function() {
				return this.peek() !== null;
			},
			applies : function(test) {
				var next = this.peek();
				return (next !== null && test(next));
			},
			nextWhile : function(test) {
				var next;
				while ((next = this.peek()) !== null && test(next))
					this.next();
			},
			matches : function(re) {
				var next = this.peek();
				return (next !== null && re.test(next));
			},
			nextWhileMatches : function(re) {
				var next;
				while ((next = this.peek()) !== null && re.test(next))
					this.next();
			},
			equals : function(ch) {
				return ch === this.peek();
			},
			endOfLine : function() {
				var next = this.peek();
				return next == null || next == "\n";
			}
		};
	};

	
	
  var Kludges = {
    autoSelfClosers: {"br": true, "img": true, "hr": true, "link": true, "input": true,
                      "meta": true, "col": true, "frame": true, "base": true, "area": true},
    doNotIndent: {"pre": true, "!cdata": true}
  };
  var NoKludges = {autoSelfClosers: {}, doNotIndent: {"!cdata": true}};
  var UseKludges = Kludges;
  var alignCDATA = false;

  // Simple stateful tokenizer for XML documents. Returns a
  // MochiKit-style iterator, with a state property that contains a
  // function encapsulating the current state. See tokenize.js.
  var tokenizeXML = (function() {
    function inText(source, setState) {
      var ch = source.next();
      if (ch == "<") {
        if (source.equals("!")) {
          source.next();
          if (source.equals("[")) {
            if (source.lookAhead("[CDATA[", true)) {
              setState(inBlock("xml-cdata", "]]>"));
              return null;
            }
            else {
              return "xml-text";
            }
          }
          else if (source.lookAhead("--", true)) {
            setState(inBlock("xml-comment", "-->"));
            return null;
          }
          else if (source.lookAhead("DOCTYPE", true)) {
            source.nextWhileMatches(/[\w\._\-]/);
            setState(inBlock("xml-doctype", ">"));
            return "xml-doctype";
          }
          else {
            return "xml-text";
          }
        }
        else if (source.equals("?")) {
          source.next();
          source.nextWhileMatches(/[\w\._\-]/);
          setState(inBlock("xml-processing", "?>"));
          return "xml-processing";
        }
        else {
          if (source.equals("/")) source.next();
          setState(inTag);
          return "xml-punctuation";
        }
      }
      else if (ch == "&") {
        while (!source.endOfLine()) {
          if (source.next() == ";")
            break;
        }
        return "xml-entity";
      }
      else {
        source.nextWhileMatches(/[^&<\n]/);
        return "xml-text";
      }
    }

    function inTag(source, setState) {
      var ch = source.next();
      if (ch == ">") {
        setState(inText);
        return "xml-punctuation";
      }
      else if (/[?\/]/.test(ch) && source.equals(">")) {
        source.next();
        setState(inText);
        return "xml-punctuation";
      }
      else if (ch == "=") {
        return "xml-punctuation";
      }
      else if (/[\'\"]/.test(ch)) {
        setState(inAttribute(ch));
        return null;
      }
      else {
        source.nextWhileMatches(/[^\s\u00a0=<>\"\'\/?]/);
        return "xml-name";
      }
    }

    function inAttribute(quote) {
      return function(source, setState) {
        while (!source.endOfLine()) {
          if (source.next() == quote) {
            setState(inTag);
            break;
          }
        }
        return "xml-attribute";
      };
    }

    function inBlock(style, terminator) {
      return function(source, setState) {
        while (!source.endOfLine()) {
          if (source.lookAhead(terminator, true)) {
            setState(inText);
            break;
          }
          source.next();
        }
        return style;
      };
    }

    return function(source, startState) {
      return tokenizer(source, startState || inText);
    };
  })();

  // The parser. The structure of this function largely follows that of
  // parseJavaScript in parsejavascript.js (there is actually a bit more
  // shared code than I'd like), but it is quite a bit simpler.
  function parseXML(source) {
    var tokens = tokenizeXML(source), token;
    var cc = [base];
    var tokenNr = 0, indented = 0;
    var currentTag = null, context = null;
    var consume;
    
    function push(fs) {
      for (var i = fs.length - 1; i >= 0; i--)
        cc.push(fs[i]);
    }
    function cont() {
      push(arguments);
      consume = true;
    }
    function pass() {
      push(arguments);
      consume = false;
    }

    function markErr() {
      token.style += " xml-error";
    }
    function expect(text) {
      return function(style, content) {
        if (content == text) cont();
        else {markErr(); cont(arguments.callee);}
      };
    }

    function pushContext(tagname, startOfLine) {
      var noIndent = UseKludges.doNotIndent.hasOwnProperty(tagname) || (context && context.noIndent);
      context = {prev: context, name: tagname, indent: indented, startOfLine: startOfLine, noIndent: noIndent};
    }
    function popContext() {
      context = context.prev;
    }
    function computeIndentation(baseContext) {
      return function(nextChars, current) {
        var context = baseContext;
        if (context && context.noIndent)
          return current;
        if (alignCDATA && /<!\[CDATA\[/.test(nextChars))
          return 0;
        if (context && /^<\//.test(nextChars))
          context = context.prev;
        while (context && !context.startOfLine)
          context = context.prev;
        if (context)
          return context.indent + indentUnit;
        else
          return 0;
      };
    }

    function base() {
      return pass(element, base);
    }
    var harmlessTokens = {"xml-text": true, "xml-entity": true, "xml-comment": true, "xml-processing": true, "xml-doctype": true};
    function element(style, content) {
      if (content == "<") cont(tagname, attributes, endtag(tokenNr == 1));
      else if (content == "</") cont(closetagname, expect(">"));
      else if (style == "xml-cdata") {
        if (!context || context.name != "!cdata") pushContext("!cdata");
        if (/\]\]>$/.test(content)) popContext();
        cont();
      }
      else if (harmlessTokens.hasOwnProperty(style)) cont();
      else {markErr(); cont();}
    }
    function tagname(style, content) {
      if (style == "xml-name") {
        currentTag = content.toLowerCase();
        token.style = "xml-tagname";
        cont();
      }
      else {
        currentTag = null;
        pass();
      }
    }
    function closetagname(style, content) {
      if (style == "xml-name") {
        token.style = "xml-tagname";
        if (context && content.toLowerCase() == context.name) popContext();
        else markErr();
      }
      cont();
    }
    function endtag(startOfLine) {
      return function(style, content) {
        if (content == "/>" || (content == ">" && UseKludges.autoSelfClosers.hasOwnProperty(currentTag))) cont();
        else if (content == ">") {pushContext(currentTag, startOfLine); cont();}
        else {markErr(); cont(arguments.callee);}
      };
    }
    function attributes(style) {
      if (style == "xml-name") {token.style = "xml-attname"; cont(attribute, attributes);}
      else pass();
    }
    function attribute(style, content) {
      if (content == "=") cont(value);
      else if (content == ">" || content == "/>") pass(endtag);
      else pass();
    }
    function value(style) {
      if (style == "xml-attribute") cont(value);
      else pass();
    }

    return {
      indentation: function() {return indented;},

      next: function(){
        token = tokens.next();
        if (token.style == "whitespace" && tokenNr == 0)
          indented = token.value.length;
        else
          tokenNr++;
        if (token.content == "\n") {
          indented = tokenNr = 0;
          token.indentation = computeIndentation(context);
        }

        if (token.style == "whitespace" || token.type == "xml-comment")
          return token;

        while(true){
          consume = false;
          cc.pop()(token.style, token.content);
          if (consume) return token;
        }
      },

      copy: function(){
        var _cc = cc.concat([]), _tokenState = tokens.state, _context = context;
        var parser = this;
        
        return function(input){
          cc = _cc.concat([]);
          tokenNr = indented = 0;
          context = _context;
          tokens = tokenizeXML(input, _tokenState);
          return parser;
        };
      }
    };
  }

  return {
    make: function(stream) {
    	if (typeof stream == 'string')
    		stream = stringStream(stream);
    		
    	return parseXML(stream);
    }
  };
})();
