'use strict';

import { isAlpha, isNumber } from '@emmetio/stream-reader-utils';

/**
 * @param  {Number}  code
 * @return {Boolean}
 */
export function isAlphaNumericWord(code) {
	return isNumber(code) || isAlphaWord(code);
}

/**
 * @param  {Number}  code
 * @return {Boolean}
 */
export function isAlphaWord(code) {
	return code === 95 /* _ */ || isAlpha(code);
}
