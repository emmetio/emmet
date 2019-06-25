'use strict';

/**
 * A wrapper for holding CSS value
 */
export default class CSSValue {
	constructor() {
		this.type = 'css-value';
		this.value = [];
	}

	get size() {
		return this.value.length;
	}

	add(value) {
		this.value.push(value);
	}

	has(value) {
		return this.value.indexOf(value) !== -1;
	}

	toString() {
		return this.value.join(' ');
	}
}
