'use strict';

import { eatQuoted } from '@emmetio/stream-reader-utils';

const opt = { throws: true };

/**
 * Consumes 'single' or "double"-quoted string from given string, if possible
 * @param  {StreamReader} stream
 * @return {String}
 */
export default function(stream) {
	if (eatQuoted(stream, opt)) {
		return new QuotedString(stream.current());
	}
}

class QuotedString {
	constructor(value) {
		this.type = 'string';
		this.value = value;
	}

	toString() {
		return this.value;
	}
}
