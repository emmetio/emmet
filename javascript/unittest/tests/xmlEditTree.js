module('XML Edit Tree');
test('Check internals', function() {
	var source = '<div class="hello" b=1>';
	/** @type XMLEditElement */
	var elem = emmet.require('xmlEditTree').parse(source);
	
	equal(elem.name(), 'div', 'Element name is "div"');
	equal(elem.nameRange().toString(), '{1, 3}', 'Name range is correct');
	equal(elem.list().length, 2, 'Found 2 attributes');
	deepEqual(_.map(elem.list(), function(item) {
		return item.toString();
	}), ['class="hello"', 'b=1'], 'Attribute strings');
	deepEqual(_.map(elem.list(), function(item) {
		return item.range().toString();
	}), ['{5, 13}', '{19, 3}'], 'Attribute ranges');
	
	
	var attr = elem.get(0);
	equal(attr.namePosition(), 5, 'Name position of attribute "' + attr.name() + '"');
	equal(attr.valuePosition(), 12, 'Value position of attribute "' + attr.name() + '"');
	
	equal(elem.value('class'), 'hello', 'Value of "class" attribute');
	equal(elem.indexOf('b'), 1, 'Index of attribute "b"');
	
	var prop = elem.itemFromPosition(20);
	equal(prop.name(), 'b', 'Got attribute from position');
});

test('Check modifications', function() {
	/** @type XMLEditElement */
	var elem = emmet.require('xmlEditTree').parse('<div b=1 class="hello">');
	
	elem.value('b', 'test');
	equal(elem.value('b'), 'test', 'New value');
	equal(elem.source, '<div b=test class="hello">', 'New source');
	equal(elem.get(1).namePosition(), 12, 'Next attribute’s position updated');
	
	elem.add('title', 'test2');
	equal(elem.value('title'), 'test2', 'New attribute');
	equal(elem.source, '<div b=test class="hello" title="test2">', 'Source with new attribute');
	equal(elem.get('title').namePosition(), 26, 'New attribute with correct name position');
	
	elem.add('c', '2', 0);
	equal(elem.get('c').toString(), 'c=2', 'New attribute inherited style of  sibling');
	equal(elem.source, '<div c=2 b=test class="hello" title="test2">', 'Source with new attribute with inherited style');
	
	elem.remove('c');
	equal(elem.source, '<div b=test class="hello" title="test2">', 'Source with removed attribute');
	equal(elem.get('class').namePosition(), 12, 'Attibute next to removed one has correct name position');
	
	elem = emmet.require('xmlEditTree').parse('<div>');
	elem.add('class', 'test');
	equal(elem.source, '<div class="test">', 'Added attribute to empty element');
	equal(elem.get('class').namePosition(), 5, 'Added attribute has correct position');
	
	elem.name('span');
	equal(elem.source, '<span class="test">', '"div" renamed to "span"');
	equal(elem.get('class').namePosition(), 6, '"class" attribute has correct position in renamed element');
});

test('Check tag extraction', function() {
	var source = '<a> <b class="d"> <c>';
	var module = emmet.require('xmlEditTree');
	
	equal(module.extractTag(source, 10), '{4, 13}', 'Extracted <b> tag');
	equal(module.extractTag(source, 17), '{18, 3}', 'Extracted <c> tag');
	equal(module.extractTag('hello <b>world</b>', 12, true), '{6, 3}', 'Extracted <b> tag (backward)');
});