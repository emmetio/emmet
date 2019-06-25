'use strict';

import Node from '@emmetio/node';
import StreamReader from '@emmetio/stream-reader';
import CSSValue from './lib/css-value';
import consumeColor from './lib/color';
import consumeNumericValue from './lib/numeric-value';
import consumeKeyword from './lib/keyword';
import consumeArguments from './lib/arguments';
import { isAlphaWord } from './lib/utils';

const EXCL   = 33; // !
const DOLLAR = 36; // $
const PLUS   = 43; // +
const DASH   = 45; // -
const COLON  = 58; // :
const AT     = 64; // @

/**
 * Parses given Emmet CSS abbreviation and returns it as parsed Node tree
 * @param {String} abbr
 * @return {Node}
 */
export default function(abbr) {
	const root = new Node();
	const stream = new StreamReader(abbr);
	let node;

	while (!stream.eof()) {
		let node = new Node(consumeIdent(stream));
		node.value = consumeValue(stream);

		const args = consumeArguments(stream);
		if (args) {
			// technically, arguments in CSS are anonymous Emmet Node attributes,
			// but since Emmet can support only one anonymous, `null`-name
			// attribute (for good reasons), we’ll use argument index as name
			for (let i = 0; i < args.length; i++) {
				node.setAttribute(String(i), args[i]);
			}
		}

		// Consume `!important` modifier at the end of expression
		if (stream.eat(EXCL)) {
			node.value.add('!');
		}

		root.appendChild(node);

		// CSS abbreviations cannot be nested, only listed
		if (!stream.eat(PLUS)) {
			break;
		}
	}

	if (!stream.eof()) {
		throw stream.error('Unexpected character');
	}

	return root;
}

/**
 * Consumes CSS property identifier from given stream
 * @param  {StreamReader} stream
 * @return {String}
 */
function consumeIdent(stream) {
	stream.start = stream.pos;
	stream.eatWhile(isIdentPrefix);
	stream.eatWhile(isIdent);
	return stream.start !== stream.pos ? stream.current() : null;
}

/**
 * Consumes embedded value from Emmet CSS abbreviation stream
 * @param  {StreamReader} stream
 * @return {CSSValue}
 */
function consumeValue(stream) {
	const values = new CSSValue();
	let value;

	while (!stream.eof()) {
		// use colon as value separator
		stream.eat(COLON);
		if (value = consumeNumericValue(stream) || consumeColor(stream)) {
			// edge case: a dash after unit-less numeric value or color should
			// be treated as value separator, not negative sign
			if (!value.unit) {
				stream.eat(DASH);
			}
		} else {
			stream.eat(DASH);
			value = consumeKeyword(stream, true);
		}

		if (!value) {
			break;
		}

		values.add(value);
	}

	return values;
}

/**
 * @param  {Number}  code
 * @return {Boolean}
 */
function isIdent(code) {
	return isAlphaWord(code);
}

/**
 * @param  {Number}  code
 * @return {Boolean}
 */
function isIdentPrefix(code) {
	return code === AT || code === DOLLAR || code === EXCL;
}
