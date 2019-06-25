'use strict';

import { isNumber } from '@emmetio/stream-reader-utils';
import { isAlphaWord } from './utils';

const PERCENT = 37; // %
const DOT     = 46; // .
const DASH    = 45; // -

/**
 * Consumes numeric CSS value (number with optional unit) from current stream,
 * if possible
 * @param  {StreamReader} stream
 * @return {NumericValue}
 */
export default function(stream) {
	stream.start = stream.pos;
	if (eatNumber(stream)) {
		const num = stream.current();
		stream.start = stream.pos;

		// eat unit, which can be a % or alpha word
		stream.eat(PERCENT) || stream.eatWhile(isAlphaWord);
		return new NumericValue(num, stream.current());
	}
}

/**
 * A numeric CSS value with optional unit
 */
class NumericValue {
	constructor(value, unit) {
		this.type = 'numeric';
		this.value = Number(value);
		this.unit = unit || '';
	}

	toString() {
		return `${this.value}${this.unit}`;
	}
}

/**
 * Eats number value from given stream
 * @param  {StreamReader} stream
 * @return {Boolean} Returns `true` if number was consumed
 */
function eatNumber(stream) {
	const start = stream.pos;
	const negative = stream.eat(DASH);
	const afterNegative = stream.pos;

	stream.eatWhile(isNumber);
	
	const prevPos = stream.pos;
	if (stream.eat(DOT) && !stream.eatWhile(isNumber)) {
		// Number followed by a dot, but then no number
		stream.pos = prevPos;
	}

	// Edge case: consumed dash only: not a number, bail-out
	if (stream.pos === afterNegative) {
		stream.pos = start;
	}

	return stream.pos !== start;
}
