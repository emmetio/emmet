'use strict';

import { isAlphaNumericWord, isAlphaWord } from './utils';

const DOLLAR = 36; // $
const DASH   = 45; // -
const AT     = 64; // @

/**
 * Consumes a keyword: either a variable (a word that starts with $ or @) or CSS
 * keyword or shorthand
 * @param  {StreamReader} stream
 * @param  {Boolean} [short] Use short notation for consuming value.
 * The difference between “short” and “full” notation is that first one uses
 * alpha characters only and used for extracting keywords from abbreviation,
 * while “full” notation also supports numbers and dashes
 * @return {String} Consumed variable
 */
export default function(stream, short) {
	stream.start = stream.pos;

	if (stream.eat(DOLLAR) || stream.eat(AT)) {
		// SCSS or LESS variable
		stream.eatWhile(isVariableName);
	} else if (short) {
		stream.eatWhile(isAlphaWord);
	} else {
		stream.eatWhile(isKeyword);
	}

	return stream.start !== stream.pos ? new Keyword(stream.current()) : null;
}

export class Keyword {
	constructor(value) {
		this.type = 'keyword';
		this.value = value;
	}

	toString() {
		return this.value;
	}
}

function isKeyword(code) {
	return isAlphaNumericWord(code) || code === DASH;
}

function isVariableName(code) {
	return code === 45 /* - */ || isAlphaNumericWord(code);
}
