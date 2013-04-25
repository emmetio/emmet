/**
 * Helper class for convenient token iteration
 */
emmet.define('tokenIterator', function(require, _) {
	/**
	 * @type TokenIterator
	 * @param {Array} tokens
	 * @type TokenIterator
	 * @constructor
	 */
	function TokenIterator(tokens) {
		/** @type Array */
		this.tokens = tokens;
		this._position = 0;
		this.reset();
	}
	
	TokenIterator.prototype = {
		next: function() {
			if (this.hasNext()) {
				var token = this.tokens[++this._i];
				this._position = token.start;
				return token;
			}
			
			return null;
		},
		
		current: function() {
			return this.tokens[this._i];
		},
		
		position: function() {
			return this._position;
		},
		
		hasNext: function() {
			return this._i < this._il - 1;
		},
		
		reset: function() {
			this._i = -1;
			this._il = this.tokens.length;
		},
		
		item: function() {
			return this.tokens[this._i];
		},
		
		itemNext: function() {
			return this.tokens[this._i + 1];
		},
		
		itemPrev: function() {
			return this.tokens[this._i - 1];
		},
		
		nextUntil: function(type, callback) {
			var token;
			var test = _.isString(type) 
				? function(t){return t.type == type;} 
				: type;
			
			while ((token = this.next())) {
				if (callback)
					callback.call(this, token);
				if (test.call(this, token))
					break;
			}
		}
	};
	
	return {
		create: function(tokens) {
			return new TokenIterator(tokens);
		}
	};
});