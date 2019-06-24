# Emmet abbreviation parser [![Build Status](https://travis-ci.org/emmetio/abbreviation.svg?branch=master)](https://travis-ci.org/emmetio/abbreviation)

Reference parser implementation for [Emmet](http://emmet.io) project. Parser takes an abbreviation string and produces a tree. This tree can then be analyzed, updated etc., similar to DOM tree. Use it to produce a string output afterwards.

Note that this module *does not* produce a tree that can be used for final HTML output: the tree might miss tag names, predefined attributes, resolved snippets and so on. The goal of this parser is to be a basic embeddable building block for projects that wish to utilize Emmet abbreviations syntax.

If you need a complete HTML or CSS abbreviation expander, you should transform parsed abbreviation tree via [`@emmetio/html-transform`](https://github.com/emmetio/html-transform) or `@emmetio/css-tansform` as well.

## Usage

You can install it via npm:

```bash
npm install @emmetio/abbreviation
```

Then add it into your project:

```js
'use strict';
import parseAbbreviation from '@emmetio/abbreviation';

const tree = parseAbbreviation('div#foo>span.bar*3');
tree.walk((node, level) => {
	let pad = '';
	while (level--) {
		pad += '  ';
	}
	console.log('%s%s', level, node.name);
});
```

After abbreviation is expanded, use returned tree to read and update via [DOM-like API](/lib/node.js).

There are two types of nodes in returned tree:

* *Element node* is a basic node with name, attributes and/or text content. E.g. an element that can be represented somehow.
* *Grouping node* is used to group sub-nodes and doesn’t has its own representation. It it mostly used to repeat a set of elements, for example `a>(b+c)*3`. Such nodes has `node.isGroup` set to `true`.

## Abbreviation syntax

Emmet abbreviation has the following basic parts:

```
name.class#id[attributes?, ...]{text value}*repeater/
```

* `name` — element name, like `div`, `span` etc. Stored as `node.name` property.
* `[attributes]` — list of attributes. Each attribute is stored as [`Attribute`](/lib/attribute.js) instance and can be accessed by `node.getAttribute(name)`. Each attribute can be written in different formats:
	* `attr` — attribute with empty value.
	* `attr=value` — attribute with value. The `value` may contain any character except space or `]`.
	* `attr="value"` or `attr='value'` — attribute with value in quotes. Quotes are automatically removed.
	* `attr.` — boolean attribute, e.g. attribute without value, like `required` in `<input>`.
	* `./non/attr/value` — value for default attribute. In other words, anything that doesn’t match a attribute name characters. Can be a single- or double-quotted as well. Default attribute is stored with `null` as name and should be used later, for example, to resolve predefined attributes.
* `.class` — shorthand for `class` attribute. Note that an element can have multiple classes, like `.class1.class2.class3`.
* `#id` — shorthand for `id` attribute.
* `{text}` — node’s text content
* `*N` — element repeater, tells parser to create `N` copies of given node.
* `/` — optional self-closing operator. Marks element with `node.selfClosing = true`.

### Operators

Each element of abbreviation must be separated with any of these operators:

```
elem1+elem2>elem3
```

* `+` — sibling operator, adds next element as a next sibling of current element in tree.
* `>` — child operator, adds next element as a child of current element.
* `^` — climb-up operator, adds next element as a child of current element’s parent node. Multiple climb-up operators are allowed, each operator moves one level up by tree.

### Groups

A set of elements could be grouped using `()`, mostly for repeating and for easier elements nesting:

```
a>(b>c+d)*4+(e+f)
```

Groups can be optionally concatenated with `+` operator.
