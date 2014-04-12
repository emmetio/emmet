var assert = require('assert');
var editTree = require('../../lib/editTree/xml');

describe('XML Edit Tree', function() {

	it('checking internals', function() {
		var source = '<div class="hello" b=1>';
		var elem = editTree.parse(source);
		
		assert.equal(elem.name(), 'div', 'Element name is "div"');
		assert.equal(elem.nameRange().toString(), '{1, 3}', 'Name range is correct');
		assert.equal(elem.list().length, 2, 'Found 2 attributes');
		assert.deepEqual(elem.list().map(function(item) {
			return item.toString();
		}), ['class="hello"', 'b=1'], 'Attribute strings');
		assert.deepEqual(elem.list().map(function(item) {
			return item.range().toString();
		}), ['{5, 13}', '{19, 3}'], 'Attribute ranges');
		
		var attr = elem.get(0);
		assert.equal(attr.namePosition(), 5, 'Name position of attribute "' + attr.name() + '"');
		assert.equal(attr.valuePosition(), 12, 'Value position of attribute "' + attr.name() + '"');
		
		assert.equal(elem.value('class'), 'hello', 'Value of "class" attribute');
		assert.equal(elem.indexOf('b'), 1, 'Index of attribute "b"');
		
		var prop = elem.itemFromPosition(20);
		assert.equal(prop.name(), 'b', 'Got attribute from position');
	});

	it('checking modifications', function() {
		var elem = editTree.parse('<div b=1 class="hello">');
		
		elem.value('b', 'test');
		assert.equal(elem.value('b'), 'test', 'New value');
		assert.equal(elem.source, '<div b=test class="hello">', 'New source');
		assert.equal(elem.get(1).namePosition(), 12, 'Next attribute’s position updated');
		
		elem.add('title', 'test2');
		assert.equal(elem.value('title'), 'test2', 'New attribute');
		assert.equal(elem.source, '<div b=test class="hello" title="test2">', 'Source with new attribute');
		assert.equal(elem.get('title').namePosition(), 26, 'New attribute with correct name position');
		
		elem.add('c', '2', 0);
		assert.equal(elem.get('c').toString(), 'c=2', 'New attribute inherited style of  sibling');
		assert.equal(elem.source, '<div c=2 b=test class="hello" title="test2">', 'Source with new attribute with inherited style');
		
		elem.remove('c');
		assert.equal(elem.source, '<div b=test class="hello" title="test2">', 'Source with removed attribute');
		assert.equal(elem.get('class').namePosition(), 12, 'Attibute next to removed one has correct name position');
		
		elem = editTree.parse('<div>');
		elem.add('class', 'test');
		assert.equal(elem.source, '<div class="test">', 'Added attribute to empty element');
		assert.equal(elem.get('class').namePosition(), 5, 'Added attribute has correct position');
		
		elem.name('span');
		assert.equal(elem.source, '<span class="test">', '"div" renamed to "span"');
		assert.equal(elem.get('class').namePosition(), 6, '"class" attribute has correct position in renamed element');
	});

	it('checking semicolor auto-insertion', function() {
		var source = '<a> <b class="d"> <c>';
		
		assert.equal(editTree.extractTag(source, 10), '{4, 13}', 'Extracted <b> tag');
		assert.equal(editTree.extractTag(source, 17), '{18, 3}', 'Extracted <c> tag');
		assert.equal(editTree.extractTag('hello <b>world</b>', 12, true), '{6, 3}', 'Extracted <b> tag (backward)');
	});

	it('checking class modifications', function() {
		var elem = editTree.parse('<div class="c1 c2 other-c2 c3">');

		elem.removeClass('c2');
		assert.equal(elem.source, '<div class="c1 other-c2 c3">');

		elem.addClass('c4');
		assert.equal(elem.source, '<div class="c1 other-c2 c3 c4">');

		elem.addClass('c1');
		assert.equal(elem.source, '<div class="c1 other-c2 c3 c4">');

		elem = editTree.parse('<div>');
		
		elem.addClass('c1');
		assert.equal(elem.source, '<div class="c1">');

		elem.removeClass('c1');
		assert.equal(elem.source, '<div>');
	});
});
