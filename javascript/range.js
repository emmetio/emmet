/**
 * Helper module to work with ranges
 * @constructor
 * @memberOf __rangeDefine
 * @param {Function} require
 * @param {Underscore} _
 */
zen_coding.define('range', function(require, _) {
	/**
	 * @type Range
	 * @constructor
	 * @param {Object} start
	 * @param {Number} len
	 */
	function Range(start, len) {
		if (_.isObject(start) && 'start' in start) {
			// create range from object stub
			this.start = Math.min(start.start, start.end);
			this.end = Math.max(start.start, start.end);
		} else if (_.isArray(start)) {
			this.start = start[0];
			this.end = start[1];
		} else {
			len = _.isString(len) ? len.length : +len;
			this.start = start;
			this.end = start + len;
		}
	}
	
	Range.prototype = {
		length: function() {
			return Math.abs(this.end - this.start);
		},
		
		/**
		 * Returns <code>true</code> if passed range is equals to current one
		 * @param {Range} range
		 * @returns {Boolean}
		 */
		equal: function(range) {
			return this.start === range.start && this.end === range.end;
		},
		
		/**
		 * Shifts indexes position with passed <code>delat</code>
		 * @param {Number} delta
		 * @returns {Range} range itself
		 */
		shift: function(delta) {
			this.start += delta;
			this.end += delta;
			return this;
		},
		
		/**
		 * Check if two ranges are overlapped
		 * @param {Range} range
		 * @returns {Boolean}
		 */
		overlap: function(range) {
			return range.start <= this.end && range.end >= this.start;
		},
		
		/**
		 * Finds intersection of two ranges
		 * @param {Range} range
		 * @returns {Range} <code>null</code> if ranges does not overlap
		 */
		intersection: function(range) {
			if (this.overlap(range)) {
				var start = Math.max(range.start, this.start);
				var end = Math.min(range.end, this.end);
				return new Range(start, end - start);
			}
			
			return null;
		},
		
		/**
		 * Returns the union of the thow ranges.
		 * @param {Range} range
		 * @returns {Range} <code>null</code> if ranges are not overlapped
		 */
		union: function(range) {
			if (this.overlap(range)) {
				var start = Math.min(range.start, this.start);
				var end = Math.max(range.end, this.end);
				return new Range(start, end - start);
			}
			
			return null;
		},
		
		/**
		 * Returns a Boolean value that indicates whether a specified position 
		 * is in a given range.
		 * @param {Number} loc
		 */
		inside: function(loc) {
			return this.start <= loc && this.end > loc;
		},
		
		/**
		 * Returns substring of specified <code>str</code> for current range
		 * @param {String} str
		 * @returns {String}
		 */
		substring: function(str) {
			return str.substring(this.start, this.end);
		},
		
		/**
		 * Creates copy of current range
		 * @returns {Range}
		 */
		clone: function() {
			return new Range(this.start, this.length());
		},
		
		/**
		 * @returns {Array}
		 */
		toArray: function() {
			return [this.start, this.end];
		},
		
		toString: function() {
			return '{' + this.start + ', ' + this.length() + '}';
		}
	};
	
	return {
		/**
		 * Creates new range object instance
		 * @param {Object} start Range start or array with 'start' and 'end'
		 * as two first indexes or object with 'start' and 'end' properties
		 * @param {Number} len Range length or string to produce range from
		 * @returns {Range}
		 * @memberOf zen_coding.range
		 */
		create: function(start, len) {
			return new Range(start, len);
		}
	};
});