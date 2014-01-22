var assert = require('assert');
var sel = require('../lib/assets/selector');
describe('Selector utils', function() {
	it('should extract rules from selector', function() {
		assert.deepEqual(sel.rules('a, b'), ['a', 'b']);
		assert.deepEqual(sel.rules('a, , b'), ['a', 'b']);
		assert.deepEqual(sel.rules('a, /* c , */ b'), ['a', 'b']);
		assert.deepEqual(sel.rules('a[title*=","], /* c , */ b'), ['a[title*=","]', 'b']);
	});

	it('should extract parts from rule', function() {
		var parts = function(str) {
			return sel.parts(str).map(function(p) {
				return p.valueOf();
			});
		};

		assert.deepEqual(parts('a b'), ['a', 'b']);
		assert.deepEqual(parts('a + b'), ['a', 'b']);
		assert.deepEqual(parts('a>b'), ['a', 'b']);
		assert.deepEqual(parts('#nav > li[ title ] a + span'), ['#nav', 'li[title]', 'a', 'span']);
	});

	it('should parse selector token', function() {
		var parse = function(str) {
			return sel.parts(str)[0]._fragments;
		};

		assert.deepEqual(parse('ul'), ['ul']);
		assert.deepEqual(parse('ul#nav.item1.item2'), 
			['ul', '#nav', '.item1', '.item2']);
		assert.deepEqual(parse('ul#nav.item1[title="test"][ data-attr ].item2'), 
			['ul', '#nav', '.item1', '[title="test"]', '[data-attr]', '.item2']);

		assert.deepEqual(parse('a:hover'), ['a', ':hover']);
	});

	it('should compare selectors for extention', function() {
		var canExtend = function(target, selector) {
			return sel.create(target).canExtend(selector);
		};

		assert(canExtend('.test', '.test'));
		assert(canExtend('.test', '.test.test2'));
		assert(!canExtend('.test', '.test2'));
		assert(canExtend(':hover', 'a:hover'));
		assert(canExtend('a', 'a:hover'));
		assert(!canExtend('b:hover', 'a:hover'));
		assert(canExtend(':hover', 'a.item:hover'));
		assert(canExtend('#id', '#id.item:hover'));
		assert(!canExtend('#id', '.item:hover'));
	});

	it.only('should extend selectors', function() {
		var extend = function(selector, target, ew) {
			return sel.extend(selector, target, ew).map(function(item) {
				return item.toString();
			}).join(', ');
		};

		// these are copies of official SCSS unit test suite
		assert.equal(extend('.foo', '.foo', '.bar'), '.foo, .bar');
		assert.equal(extend('.blip .foo', '.foo', '.bar'), '.blip .foo, .blip .bar');

		// test_nested_target
		assert.equal(extend('.foo .bar', '.bar', '.baz'), '.foo .bar, .foo .baz');
		
		// test_target_with_child
		assert.equal(extend('.foo .bar', '.foo', '.baz'), '.foo .bar, .baz .bar');

		// test_class_unification
		assert.equal(extend('.foo.bar', '.foo', '.baz'), '.foo.bar, .bar.baz');
		assert.equal(extend('.foo.baz', '.foo', '.baz'), '.baz');

		// test_id_unification
		assert.equal(extend('.foo.bar', '.foo', '#baz'), '.foo.bar, .bar#baz');
		assert.equal(extend('.foo#baz', '.foo', '#baz'), '#baz');
		assert.equal(extend('.foo#baz', '.foo', '#bar'), '.foo#baz');

		// TODO: text extend with *
		
		// test_element_unification_with_simple_target
		assert.equal(extend('.foo', '.foo', 'a'), '.foo, a');
		assert.equal(extend('.foo.bar', '.foo', 'a'), '.foo.bar, a.bar');

		// test_element_unification_with_namespaceless_element_target
		assert.equal(extend('a.foo', '.foo', 'a'), 'a');
		assert.equal(extend('a.foo', '.foo', 'h1'), 'a.foo');
	});
});