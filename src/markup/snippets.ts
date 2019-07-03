import parse, { EMElement } from '@emmetio/abbreviation';
import { Container, walk } from './walk';
import unroll from './unroll';
import { ResolvedConfig } from '../types';
import { findDeepest, isElement } from './utils';

/**
 * Finds matching snippet from `registry` and resolves it into a parsed abbreviation.
 * Resolved node is then updated or replaced with matched abbreviation tree.
 *
 * A HTML registry basically contains aliases to another Emmet abbreviations,
 * e.g. a predefined set of name, attributes and so on, possibly a complex
 * abbreviation with multiple elements. So we have to get snippet, parse it
 * and recursively resolve it.
 */
export default function resolveSnippets(node: EMElement, ancestors: Container[], config: ResolvedConfig) {
    const stack = new Set();
    const resolve = (child: EMElement) => {
        const snippet = child.name && config.snippets.get(child.name);
        // A snippet in stack means circular reference.
        // It can be either a user error or a perfectly valid snippet like
        // "img": "img[src alt]/", e.g. an element with predefined shape.
        // In any case, simply stop parsing and keep element as is
        if (!snippet || stack.has(snippet)) {
            return;
        }

        // In case if matched snippet is a function, pass control into it
        if (typeof snippet.value === 'function') {
            return snippet.value(child, config, resolve);
        }

        const abbr = parse(snippet.value);
        walk(abbr, unroll, config);

        stack.add(snippet);
        walk(abbr, resolve, config);
        stack.delete(snippet);

        // Move current node contents into new tree
        const deepest = findDeepest(abbr);
        if (isElement(deepest.node)) {
            merge(deepest.node, child);
        }

        const parent = ancestors[ancestors.length - 1];
        if (parent) {
            if (deepest.parent) {
                const pos = deepest.parent.items.indexOf(deepest.node as EMElement);
                deepest.parent.items[pos] = child;
            }

            const ix = parent.items.indexOf(child);
            parent.items = parent.items.slice(0, ix)
                .concat(abbr.items)
                .concat(parent.items.slice(ix + 1));
        }
    };

    resolve(node);
}

/**
 * Adds data from first node into second node
 */
function merge(from: EMElement, to: EMElement) {
    to.name = from.name;

    if (from.selfClosing) {
        to.selfClosing = true;
    }

    if (from.value != null) {
        to.value = from.value;
    }

    if (from.repeat) {
        to.repeat = Object.assign({}, from.repeat);
    }

    to.attributes = from.attributes.concat(to.attributes);
}
