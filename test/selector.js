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
			return sel.create(selector).matchesPart(target);
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

	it('should extend selectors', function() {
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

		// test_attribute_unification
		assert.equal(extend('[foo=bar].baz', '.baz', '[foo=baz]'), '[foo=bar].baz, [foo=bar][foo=baz]');
		assert.equal(extend('[foo=bar].baz', '.baz', '[foo^=bar]'), '[foo=bar].baz, [foo=bar][foo^=bar]');
		assert.equal(extend('[foo=bar].baz', '.baz', '[foot=bar]'), '[foo=bar].baz, [foo=bar][foot=bar]');

		// test_pseudo_unification
		assert.equal(extend(':foo.baz', '.baz', ':foo(2n+1)'), ':foo.baz, :foo:foo(2n+1)');
		assert.equal(extend(':foo.baz', '.baz', '::foo'), ':foo.baz, :foo::foo');
		assert.equal(extend('::foo.baz', '.baz', '::bar'), '::foo.baz');
		assert.equal(extend('::foo.baz', '.baz', '::foo(2n+1)'), '::foo.baz');

		assert.equal(extend('::foo.baz', '.baz', '::foo'), '::foo');
		assert.equal(extend('::foo(2n+1).baz', '.baz', '::foo(2n+1)'), '::foo(2n+1)');
		assert.equal(extend(':foo.baz', '.baz', ':bar'), ':foo.baz, :foo:bar');
		assert.equal(extend('.baz:foo', '.baz', ':after'), '.baz:foo, :foo:after');
		assert.equal(extend('.baz:after', '.baz', ':foo'), '.baz:after, :after:foo'); // XXX should be :foo:after
		assert.equal(extend(':foo.baz', '.baz', ':foo'), ':foo');

		// test_pseudoelement_remains_at_end_of_selector
		assert.equal(extend('.foo::bar', '.foo', '.baz'), '.foo::bar, .baz::bar');
		assert.equal(extend('a.foo::bar', '.foo', '.baz'), 'a.foo::bar, a.baz::bar');

		// test_pseudoclass_remains_at_end_of_selector
		assert.equal(extend('.foo:bar', '.foo', '.baz'), '.foo:bar, .baz:bar');
		assert.equal(extend('a.foo:bar', '.foo', '.baz'), 'a.foo:bar, a.baz:bar');

		// test_not_remains_at_end_of_selector
		assert.equal(extend('.foo:not(.bar)', '.foo', '.baz'), '.foo:not(.bar), .baz:not(.bar)');

		// test_pseudoelement_goes_lefter_than_pseudoclass
		assert.equal(extend('.foo::bar', '.foo', '.baz:bang'), '.foo::bar, .baz:bang::bar');
		assert.equal(extend('.foo:bar', '.foo', '.baz::bang'), '.foo:bar, .baz:bar::bang');

		// test_pseudoelement_goes_lefter_than_not
		assert.equal(extend('.foo::bar', '.foo', '.baz:not(.bang)'), '.foo::bar, .baz:not(.bang)::bar');
		assert.equal(extend('.foo:not(.bang)', '.foo', '.baz::bar'), '.foo:not(.bang), .baz:not(.bang)::bar');

		// test_negation_unification
		assert.equal(extend(':not(.foo).baz', '.baz', ':not(.bar)'), ':not(.foo).baz, :not(.foo):not(.bar)');
		assert.equal(extend(':not(.foo).baz', '.baz', ':not(.foo)'), ':not(.foo)');
		assert.equal(extend(':not([a=b]).baz', '.baz', ':not([a = b])'), ':not([a=b])');
	});
});