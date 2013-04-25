/**
 * Actions that use stream parsers and tokenizers for traversing:
 * -- Search for next/previous items in HTML
 * -- Search for next/previous items in CSS
 * @constructor
 * @memberOf __selectItemActionDefine
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _) {
	var startTag = /^<([\w\:\-]+)((?:\s+[\w\-:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/;
	
	/**
	 * Generic function for searching for items to select
	 * @param {IEmmetEditor} editor
	 * @param {Boolean} isBackward Search backward (search forward otherwise)
	 * @param {Function} extractFn Function that extracts item content
	 * @param {Function} rangeFn Function that search for next token range
	 */
	function findItem(editor, isBackward, extractFn, rangeFn) {
		var range = require('range');
		var content = require('editorUtils').outputInfo(editor).content;
		
		var contentLength = content.length;
		var itemRange, rng;
		/** @type Range */
		var prevRange = range.create(-1, 0);
		/** @type Range */
		var sel = range.create(editor.getSelectionRange());
		
		var searchPos = sel.start, loop = 100000; // endless loop protection
		while (searchPos >= 0 && searchPos < contentLength && --loop > 0) {
			if ( (itemRange = extractFn(content, searchPos, isBackward)) ) {
				if (prevRange.equal(itemRange)) {
					break;
				}
				
				prevRange = itemRange.clone();
				rng = rangeFn(itemRange.substring(content), itemRange.start, sel.clone());
				
				if (rng) {
					editor.createSelection(rng.start, rng.end);
					return true;
				} else {
					searchPos = isBackward ? itemRange.start : itemRange.end - 1;
				}
			}
			
			searchPos += isBackward ? -1 : 1;
		}
		
		return false;
	}
	
	// XXX HTML section
	
	/**
	 * Find next HTML item
	 * @param {IEmmetEditor} editor
	 */
	function findNextHTMLItem(editor) {
		var isFirst = true;
		return findItem(editor, false, function(content, searchPos){
			if (isFirst) {
				isFirst = false;
				return findOpeningTagFromPosition(content, searchPos);
			} else {
				return getOpeningTagFromPosition(content, searchPos);
			}
		}, function(tag, offset, selRange) {
			return getRangeForHTMLItem(tag, offset, selRange, false);
		});
	}
	
	/**
	 * Find previous HTML item
	 * @param {IEmmetEditor} editor
	 */
	function findPrevHTMLItem(editor) {
		return findItem(editor, true, getOpeningTagFromPosition, function (tag, offset, selRange) {
			return getRangeForHTMLItem(tag, offset, selRange, true);
		});
	}
	
	/**
	 * Creates possible selection ranges for HTML tag
	 * @param {String} source Original HTML source for tokens
	 * @param {Array} tokens List of HTML tokens
	 * @returns {Array}
	 */
	function makePossibleRangesHTML(source, tokens, offset) {
		offset = offset || 0;
		var range = require('range');
		var result = [];
		var attrStart = -1, attrName = '', attrValue = '', attrValueRange, tagName;
		_.each(tokens, function(tok) {
			switch (tok.type) {
				case 'tag':
					tagName = source.substring(tok.start, tok.end);
					if (/^<[\w\:\-]/.test(tagName)) {
						// add tag name
						result.push(range.create({
							start: tok.start + 1, 
							end: tok.end
						}));
					}
					break;
				case 'attribute':
					attrStart = tok.start;
					attrName = source.substring(tok.start, tok.end);
					break;
					
				case 'string':
					// attribute value
					// push full attribute first
					result.push(range.create(attrStart, tok.end - attrStart));
					
					attrValueRange = range.create(tok);
					attrValue = attrValueRange.substring(source);
					
					// is this a quoted attribute?
					if (isQuote(attrValue.charAt(0)))
						attrValueRange.start++;
					
					if (isQuote(attrValue.charAt(attrValue.length - 1)))
						attrValueRange.end--;
					
					result.push(attrValueRange);
					
					if (attrName == 'class') {
						result = result.concat(classNameRanges(attrValueRange.substring(source), attrValueRange.start));
					}
					
					break;
			}
		});
		
		// offset ranges
		_.each(result, function(r) {
			r.shift(offset);
		});
		
		return _.chain(result)
			.filter(function(item) {        // remove empty
				return !!item.length();
			})
			.uniq(false, function(item) {   // remove duplicates
				return item.toString();
			})
			.value();
	}
	
	/**
	 * Returns ranges of class names in "class" attribute value
	 * @param {String} className
	 * @returns {Array}
	 */
	function classNameRanges(className, offset) {
		offset = offset || 0;
		var result = [];
		/** @type StringStream */
		var stream = require('stringStream').create(className);
		var range = require('range');
		
		// skip whitespace
		stream.eatSpace();
		stream.start = stream.pos;
		
		var ch;
		while ((ch = stream.next())) {
			if (/[\s\u00a0]/.test(ch)) {
				result.push(range.create(stream.start + offset, stream.pos - stream.start - 1));
				stream.eatSpace();
				stream.start = stream.pos;
			}
		}
		
		result.push(range.create(stream.start + offset, stream.pos - stream.start));
		return result;
	}
	
	/**
	 * Returns best HTML tag range match for current selection
	 * @param {String} tag Tag declaration
	 * @param {Number} offset Tag's position index inside content
	 * @param {Range} selRange Selection range
	 * @return {Range} Returns range if next item was found, <code>null</code> otherwise
	 */
	function getRangeForHTMLItem(tag, offset, selRange, isBackward) {
		var ranges = makePossibleRangesHTML(tag, require('xmlParser').parse(tag), offset);
		
		if (isBackward)
			ranges.reverse();
		
		// try to find selected range
		var curRange = _.find(ranges, function(r) {
			return r.equal(selRange);
		});
		
		if (curRange) {
			var ix = _.indexOf(ranges, curRange);
			if (ix < ranges.length - 1)
				return ranges[ix + 1];
			
			return null;
		}
		
		// no selected range, find nearest one
		if (isBackward)
			// search backward
			return _.find(ranges, function(r) {
				return r.start < selRange.start;
			});
		
		// search forward
		// to deal with overlapping ranges (like full attribute definition
		// and attribute value) let's find range under caret first
		if (!curRange) {
			var matchedRanges = _.filter(ranges, function(r) {
				return r.inside(selRange.end);
			});
			
			if (matchedRanges.length > 1)
				return matchedRanges[1];
		}
		
		
		return _.find(ranges, function(r) {
			return r.end > selRange.end;
		});
	}
	
	/**
	 * Search for opening tag in content, starting at specified position
	 * @param {String} html Where to search tag
	 * @param {Number} pos Character index where to start searching
	 * @return {Range} Returns range if valid opening tag was found,
	 * <code>null</code> otherwise
	 */
	function findOpeningTagFromPosition(html, pos) {
		var tag;
		while (pos >= 0) {
			if ((tag = getOpeningTagFromPosition(html, pos)))
				return tag;
			pos--;
		}
		
		return null;
	}
	
	/**
	 * @param {String} html Where to search tag
	 * @param {Number} pos Character index where to start searching
	 * @return {Range} Returns range if valid opening tag was found,
	 * <code>null</code> otherwise
	 */
	function getOpeningTagFromPosition(html, pos) {
		var m;
		if (html.charAt(pos) == '<' && (m = html.substring(pos, html.length).match(startTag))) {
			return require('range').create(pos, m[0]);
		}
	}
	
	function isQuote(ch) {
		return ch == '"' || ch == "'";
	}
	
	/**
	 * Makes all possible selection ranges for specified CSS property
	 * @param {CSSProperty} property
	 * @returns {Array}
	 */
	function makePossibleRangesCSS(property) {
		// find all possible ranges, sorted by position and size
		var valueRange = property.valueRange(true);
		var result = [property.range(true), valueRange];
		var stringStream = require('stringStream');
		var cssEditTree = require('cssEditTree');
		var range = require('range');
		
		// locate parts of complex values.
		// some examples:
		// – 1px solid red: 3 parts
		// – arial, sans-serif: enumeration, 2 parts
		// – url(image.png): function value part
		var value = property.value();
		_.each(property.valueParts(), function(r) {
			// add absolute range
			var clone = r.clone();
			result.push(clone.shift(valueRange.start));
			
			/** @type StringStream */
			var stream = stringStream.create(r.substring(value));
			if (stream.match(/^[\w\-]+\(/, true)) {
				// we have a function, find values in it.
				// but first add function contents
				stream.start = stream.pos;
				stream.skipToPair('(', ')');
				var fnBody = stream.current();
				result.push(range.create(clone.start + stream.start, fnBody));
				
				// find parts
				_.each(cssEditTree.findParts(fnBody), function(part) {
					result.push(range.create(clone.start + stream.start + part.start, part.substring(fnBody)));
				});
			}
		});
		
		// optimize result: remove empty ranges and duplicates
		return _.chain(result)
			.filter(function(item) {
				return !!item.length();
			})
			.uniq(false, function(item) {
				return item.toString();
			})
			.value();
	}
	
	/**
	 * Tries to find matched CSS property and nearest range for selection
	 * @param {CSSRule} rule
	 * @param {Range} selRange
	 * @param {Boolean} isBackward
	 * @returns {Range}
	 */
	function matchedRangeForCSSProperty(rule, selRange, isBackward) {
		/** @type CSSProperty */
		var property = null;
		var possibleRanges, curRange = null, ix;
		var list = rule.list();
		var searchFn, nearestItemFn;
		
		if (isBackward) {
			list.reverse();
			searchFn = function(p) {
				return p.range(true).start <= selRange.start;
			};
			nearestItemFn = function(r) {
				return r.start < selRange.start;
			};
		} else {
			searchFn = function(p) {
				return p.range(true).end >= selRange.end;
			};
			nearestItemFn = function(r) {
				return r.end > selRange.start;
			};
		}
		
		// search for nearest to selection CSS property
		var eqSel = function(r) {
			return r.equal(selRange);
		};
		var inSel = function(r) {
			return r.inside(selRange.end);
		};
		while ((property = _.find(list, searchFn))) {
			possibleRanges = makePossibleRangesCSS(property);
			if (isBackward)
				possibleRanges.reverse();
			
			// check if any possible range is already selected
			curRange = _.find(possibleRanges, eqSel);
			
			if (!curRange) {
				// no selection, select nearest item
				var matchedRanges = _.filter(possibleRanges, inSel);
				
				if (matchedRanges.length > 1) {
					curRange = matchedRanges[1];
					break;
				}
				
				if ((curRange = _.find(possibleRanges, nearestItemFn)))
					break;
			} else {
				ix = _.indexOf(possibleRanges, curRange);
				if (ix != possibleRanges.length - 1) {
					curRange = possibleRanges[ix + 1];
					break;
				}
			}
			
			curRange = null;
			selRange.start = selRange.end = isBackward 
				? property.range(true).start - 1
				: property.range(true).end + 1;
		}
		
		return curRange;
	}
	
	function findNextCSSItem(editor) {
		return findItem(editor, false, require('cssEditTree').extractRule, getRangeForNextItemInCSS);
	}
	
	function findPrevCSSItem(editor) {
		return findItem(editor, true, require('cssEditTree').extractRule, getRangeForPrevItemInCSS);
	}
	
	/**
	 * Returns range for item to be selected in CSS after current caret 
	 * (selection) position
	 * @param {String} rule CSS rule declaration
	 * @param {Number} offset Rule's position index inside content
	 * @param {Range} selRange Selection range
	 * @return {Range} Returns range if next item was found, <code>null</code> otherwise
	 */
	function getRangeForNextItemInCSS(rule, offset, selRange) {
		var tree = require('cssEditTree').parse(rule, {
			offset: offset
		});
		
		// check if selector is matched
		var range = tree.nameRange(true);
		if (selRange.end < range.end) {
			return range;
		}
		
		return matchedRangeForCSSProperty(tree, selRange, false);
	}
	
	/**
	 * Returns range for item to be selected in CSS before current caret 
	 * (selection) position
	 * @param {String} rule CSS rule declaration
	 * @param {Number} offset Rule's position index inside content
	 * @param {Range} selRange Selection range
	 * @return {Range} Returns range if previous item was found, <code>null</code> otherwise
	 */
	function getRangeForPrevItemInCSS(rule, offset, selRange) {
		var tree = require('cssEditTree').parse(rule, {
			offset: offset
		});
		
		var curRange = matchedRangeForCSSProperty(tree, selRange, true);
		
		if (!curRange) {
			// no matched property, try to match selector
			var range = tree.nameRange(true);
			if (selRange.start > range.start) {
				return range;
			}
		}
		
		return curRange;
	}
	
	// XXX register actions
	var actions = require('actions');
	actions.add('select_next_item', function(editor){
		if (editor.getSyntax() == 'css')
			return findNextCSSItem(editor);
		else
			return findNextHTMLItem(editor);
	});
	
	actions.add('select_previous_item', function(editor){
		if (editor.getSyntax() == 'css')
			return findPrevCSSItem(editor);
		else
			return findPrevHTMLItem(editor);
	});
});