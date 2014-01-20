var assert = require('assert');
var sel = require('../lib/utils/selector');
describe('Selector utils', function() {
	it('should extract rules from selector', function() {
		assert.deepEqual(sel.rules('a, b'), ['a', 'b']);
		assert.deepEqual(sel.rules('a, , b'), ['a', 'b']);
		assert.deepEqual(sel.rules('a, /* c , */ b'), ['a', 'b']);
		assert.deepEqual(sel.rules('a[title*=","], /* c , */ b'), ['a[title*=","]', 'b']);
	});

	it('should extract parts from rule', function() {
		assert.deepEqual(sel.parts('a b'), ['a', 'b']);
		assert.deepEqual(sel.parts('a + b'), ['a', 'b']);
		assert.deepEqual(sel.parts('a>b'), ['a', 'b']);
		assert.deepEqual(sel.parts('#nav > li[ title ] a + span'), ['#nav', 'li[ title ]', 'a', 'span']);
	});

	it('should parse selector token', function() {
		assert.deepEqual(sel.parse('ul'), {
			'name': 'ul'
		});

		assert.deepEqual(sel.parse('ul#nav.item1.item2'), {
			'name': 'ul',
			'#': ['nav'],
			'.': ['item1', 'item2']
		});

		assert.deepEqual(sel.parse('ul#nav.item1[title="test" data-attr].item2'), {
			'name': 'ul',
			'#': ['nav'],
			'.': ['item1', 'item2'],
			'attrs': {
				'title': 'test',
				'data-attr': null
			}
		});

		assert.deepEqual(sel.parse('a:hover'), {
			'name': 'a',
			':': ['hover']
		});
	});

	it.only('should compare selectors for extention', function() {
		assert(sel.canExtend('.test', '.test'));
		assert(sel.canExtend('.test', '.test.test2'));
		assert(!sel.canExtend('.test', '.test2'));
		assert(sel.canExtend(':hover', 'a:hover'));
		assert(sel.canExtend('a', 'a:hover'));
		assert(!sel.canExtend('b:hover', 'a:hover'));
		assert(sel.canExtend(':hover', 'a.item:hover'));
		assert(sel.canExtend('#id', '#id.item:hover'));
		assert(!sel.canExtend('#id', '.item:hover'));
	});
});