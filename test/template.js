var assert = require('assert');
var t = require('../lib/utils/template');

describe('Template', function() {
	it('should make simple substitutions', function() {
		var ctx = {one: 'world', two: {three: 'test'}};
		assert.equal(t('Hello', ctx), 'Hello');
		assert.equal(t('Hello <%= one %>', ctx), 'Hello world');
		assert.equal(t('Hello <%= \'world\' %>', ctx), 'Hello world');
		assert.equal(t('Hello <%= "world" %>', ctx), 'Hello world');
		assert.equal(t('Hello <%= 2 %>', ctx), 'Hello 2');
		assert.equal(t('<%= two.three %><%= 2 %>', ctx), 'test2');
	});

	it('should call a method', function() {
		var ctx = {
			m: function(v1, v2) {
				return '(' + Array.prototype.join.call(arguments, ', ') + ')';
			},
			one: {
				two: 'test'
			}
		};

		assert.equal(t('Template <%- m("sample") %>', ctx), 'Template (sample)');
		assert.equal(t('Template <%- m("sample", 2) %>', ctx), 'Template (sample, 2)');
		assert.equal(t('Template <%- m("sample", 2, one.two) %>', ctx), 'Template (sample, 2, test)');
	});
});