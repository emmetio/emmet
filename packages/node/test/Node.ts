import { equal, ok, deepEqual } from 'assert';
import Node from '../src/Node';
import Attribute from '../src/Attribute';

describe('Node', () => {
    it('create tree', () => {
        const root = new Node();
        const a = new Node('a');
        const b = new Node('b');
        const c = new Node('c');

        equal(a.name, 'a');
        equal(b.name, 'b');
        equal(c.name, 'c');

        root.appendChild(a);
        equal(root.children.length, 1);
        equal(root.firstChild, a);
        equal(root.lastChild, a);
        equal(a.parent, root);
        equal(a.previous, null);
        equal(a.next, null);

        equal(a.childIndex, 0);
        equal(b.childIndex, -1);
        equal(c.childIndex, -1);

        // ensure children are making up a linked list
        root.appendChild(b);
        equal(root.children.length, 2);
        equal(root.firstChild, a);
        equal(root.lastChild, b);
        equal(a.previous, null);
        equal(a.next, b);
        equal(b.previous, a);
        equal(b.next, null);

        equal(a.childIndex, 0);
        equal(b.childIndex, 1);
        equal(c.childIndex, -1);

        root.appendChild(c);
        equal(root.children.length, 3);
        equal(root.firstChild, a);
        equal(root.lastChild, c);
        equal(a.previous, null);
        equal(a.next, b);
        equal(b.previous, a);
        equal(b.next, c);
        equal(c.previous, b);
        equal(c.next, null);

        equal(a.childIndex, 0);
        equal(b.childIndex, 1);
        equal(c.childIndex, 2);

        // re-append existing child to change children order
        root.appendChild(a);
        equal(root.children.length, 3);
        equal(root.firstChild, b);
        equal(root.lastChild, a);
        equal(b.previous, null);
        equal(b.next, c);
        equal(c.previous, b);
        equal(c.next, a);
        equal(a.previous, c);
        equal(a.next, null);

        equal(a.childIndex, 2);
        equal(b.childIndex, 0);
        equal(c.childIndex, 1);

        // remove node and maintain a linked list
        c.remove();
        equal(root.children.length, 2);
        equal(root.firstChild, b);
        equal(root.lastChild, a);
        equal(b.previous, null);
        equal(b.next, a);
        equal(a.previous, b);
        equal(a.next, null);
        equal(c.previous, null);
        equal(c.next, null);
        equal(c.parent, null);

        equal(a.childIndex, 1);
        equal(b.childIndex, 0);
        equal(c.childIndex, -1);

        // remove detached node: do not throw error
        c.remove();

        // insert before
        root.insertBefore(c, a);
        equal(root.children.length, 3);
        equal(root.firstChild, b);
        equal(b.previous, null);
        equal(b.next, c);
        equal(a.previous, c);
        equal(a.next, null);
        equal(c.previous, b);
        equal(c.next, a);
        equal(c.parent, root);

        equal(a.childIndex, 2);
        equal(b.childIndex, 0);
        equal(c.childIndex, 1);
    });

    it('attributes', () => {
        const a = new Node('a');
        equal(a.attributes.length, 0);

        a.setAttribute('foo', 'bar');
        ok(a.hasAttribute('foo'));
        ok(!a.hasAttribute('bar'));
        deepEqual(a.attributesMap, {foo: 'bar'});

        equal(a.getAttribute('foo')!.name, 'foo');
        equal(a.getAttribute('foo')!.value, 'bar');
        equal(a.getAttribute('foo'), a.getAttribute({name: 'foo'}));

        a.setAttribute('foo', 'baz');
        deepEqual(a.attributesMap, {foo: 'baz'});
        equal(a.getAttribute('foo')!.value, 'baz');

        a.setAttribute('a', 'b');
        deepEqual(a.attributesMap, {foo: 'baz', a: 'b'});

        a.replaceAttribute('foo', 'foo2', 'baz2');
        // replace non-exiting attribute
        a.replaceAttribute('bar', 'bar2', 'baz2');
        deepEqual(a.attributesMap, {foo2: 'baz2', a: 'b'});

        // remove non-existing attribute
        a.removeAttribute('foo');
        a.removeAttribute('foo2');
        equal(a.attributes.length, 1);
        deepEqual(a.attributesMap, {a: 'b'});

        const b = new Node('b', [{ name: 'foo', value: 'bar' }, 'a']);
        equal(b.attributes.length, 2);
        deepEqual(b.attributesMap, {foo: 'bar', a: null});
    });

    it('class names', () => {
        const a = new Node('a');
        equal(a.attributes.length, 0);

        a.addClass('foo');
        deepEqual(a.attributesMap, { class: 'foo' });

        a.addClass('foo');
        a.addClass('bar');
        ok(a.hasClass('foo'));
        ok(a.hasClass('bar'));
        ok(!a.hasClass('baz'));
        deepEqual(a.attributesMap, { class: 'foo bar' });

        a.removeClass('foo');
        a.removeClass('baz');
        deepEqual(a.attributesMap, { class: 'bar' });

        const b = new Node('b', [{ name: 'class', value: 'foo bar' }]);
        ok(b.hasClass('foo'));
        ok(b.hasClass('bar'));
    });

    it('empty class names', () => {
        const a = new Node('a');
        equal(a.attributes.length, 0);

        // Adding empty class should at least create `class` attribute
        a.addClass('');
        deepEqual(a.attributesMap, { class: '' });

        a.addClass('foo');
        a.addClass(' ');
        a.addClass('');
        deepEqual(a.attributesMap, { class: 'foo' });
    });

    it('clone', () => {
        const a = new Node('a', [
            { name: 'class', value: 'foo bar' },
            new Attribute('selected', null, {boolean: true})
        ]);

        deepEqual(a.attributesMap, {
            class: 'foo bar',
            selected: 'selected'
        });

        const b = a.clone();

        equal(b.name, 'a');
        deepEqual(b.attributesMap, {
            class: 'foo bar',
            selected: 'selected'
        });

        ok(b.getAttribute('selected')!.options.boolean);

        // update origin and make sure changes are not reflected to clone
        a.removeClass('bar');
        const opt = a.getAttribute('selected')!.options;
        opt.boolean = false;

        equal(a.getAttribute('class')!.value, 'foo');
        equal(b.getAttribute('class')!.value, 'foo bar');

        equal(a.getAttribute('selected')!.options.boolean, false);
        equal(b.getAttribute('selected')!.options.boolean, true);
    });

    it('deep clone', () => {
        const a = new Node('a', [{ name: 'foo', value: 'bar' }]);
        const b = new Node('b', [{ name: 'bar', value: 'baz' }]);
        a.appendChild(b);

        const a2 = a.clone(true);
        const b2 = a2.firstChild!;

        a2.setAttribute('foo', 'bar2');
        b2.setAttribute('bar', 'baz2');

        ok(a !== a2);
        ok(b !== b2);

        equal(a.name, a2.name);
        equal(a.getAttribute('foo')!.value, 'bar');
        equal(a2.getAttribute('foo')!.value, 'bar2');
        equal(b.getAttribute('bar')!.value, 'baz');
        equal(b2.getAttribute('bar')!.value, 'baz2');
    });

    it('walk', () => {
        const root = new Node();
        const a = new Node('a');
        const b = new Node('b');
        const c = new Node('c');
        const d = new Node('d');

        root.appendChild(a);
        a.appendChild(b);
        b.appendChild(c);
        root.appendChild(d);

        const walked: string[] = [];
        const fn = (node: Node, level: number) => walked.push(`${node.name}:${level}`);

        root.walk(fn);
        deepEqual(walked, ['a:0', 'b:1', 'c:2', 'd:0']);
        walked.length = 0;

        a.walk(fn);
        deepEqual(walked, ['b:0', 'c:1']);
        walked.length = 0;

        // Explicitly stop iterator
        root.walk((node, level) => {
            walked.push(`${node.name}:${level}`);
            return node !== c;
        });
        deepEqual(walked, ['a:0', 'b:1', 'c:2']);
        walked.length = 0;

        // Make sure iterator continues even if node is detached
        root.walk((node, level) => {
            walked.push(`${node.name}:${level}`);
            node.remove();
        });
        deepEqual(walked, ['a:0', 'b:1', 'c:2', 'd:0']);
        walked.length = 0;
    });
});
