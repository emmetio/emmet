'use strict';

import { isWhiteSpace } from '@emmetio/stream-reader-utils';
import CSSValue from './css-value';
import consumeNumericValue from './numeric-value';
import consumeColor from './color';
import consumeKeyword from './keyword';
import consumeQuoted from './quoted-string';

const TAB    = 9;  // \t
const SPACE  = 32; // (
const LBRACE = 40; // (
const RBRACE = 41; // )
const COMMA  = 44; // ,

/**
 * Consumes arguments from given string.
 * Arguments are comma-separated list of CSS values inside round braces, e.g.
 * `(1, a2, 'a3')`. Nested lists and quoted strings are supported
 * @param  {StreamReader} stream
 * @return {Array}        Array of arguments, `null` if arguments cannot be consumed
 */
export default function consumeArgumentList(stream) {
	if (!stream.eat(LBRACE)) {
		// not an argument list
		return null;
	}

	let level = 1, code, arg;
	const argsList = [];

	while (!stream.eof()) {
		if (arg = consumeArgument(stream)) {
			argsList.push(arg);
		} else {
			// didn’t consumed argument, expect argument separator or end-of-arguments
			stream.eatWhile(isWhiteSpace);

			if (stream.eat(RBRACE)) {
				// end of arguments list
				break;
			}

			if (!stream.eat(COMMA)) {
				throw stream.error('Expected , or )');
			}
		}
	}

	return argsList;
}

function currentArg(stream) {
	return stream.current.slice(0, -1).trim();
}

/**
 * Consumes a single argument. An argument is a `CSSValue`, e.g. it could be
 * a space-separated string of value
 * @param  {StreamReader} stream
 * @return {CSSValue}
 */
function consumeArgument(stream) {
	const result = new CSSValue();
	let value;

	while (!stream.eof()) {
		stream.eatWhile(isWhiteSpace);
		value = consumeNumericValue(stream) || consumeColor(stream)
			|| consumeQuoted(stream) || consumeKeywordOrFunction(stream);

		if (!value) {
			break;
		}

		result.add(value);
	}

	return result.size ? result : null;
}

/**
 * Consumes either function call like `foo()` or keyword like `foo`
 * @param  {StreamReader} stream
 * @return {Keyword|FunctionCall}
 */
function consumeKeywordOrFunction(stream) {
	const kw = consumeKeyword(stream);
	if (kw) {
		const args = consumeArgumentList(stream);
		return args ? new FunctionCall(kw.toString(), args) : kw;
	}
}

class FunctionCall {
	/**
	 * @param {String} name Function name
	 * @param {Array}  args Function arguments
	 */
	constructor(name, args) {
		this.type = 'function';
		this.name = name;
		this.args = args || [];
	}

	toString() {
		return `${this.name}(${this.args.join(', ')})`;
	}
}
