import parse, { AbbreviationNode } from '@emmetio/abbreviation';
import { walk, findDeepest, isNode, Container } from './utils';
import { Config } from '../config';

/**
 * Finds matching snippet from `registry` and resolves it into a parsed abbreviation.
 * Resolved node is then updated or replaced with matched abbreviation tree.
 *
 * A HTML registry basically contains aliases to another Emmet abbreviations,
 * e.g. a predefined set of name, attributes and so on, possibly a complex
 * abbreviation with multiple elements. So we have to get snippet, parse it
 * and recursively resolve it.
 */
export default function resolveSnippets(node: AbbreviationNode, ancestors: Container[], config: Config) {
    const stack = new Set();
    const resolve = (child: AbbreviationNode) => {
        const snippet = child.name && config.snippets[child.name];
        // A snippet in stack means circular reference.
        // It can be either a user error or a perfectly valid snippet like
        // "img": "img[src alt]/", e.g. an element with predefined shape.
        // In any case, simply stop parsing and keep element as is
        if (!snippet || stack.has(snippet)) {
            return;
        }

        const abbr = parse(snippet, config);
        stack.add(snippet);
        walk(abbr, resolve, config);
        stack.delete(snippet);

        // Move current node contents into new tree
        const deepest = findDeepest(abbr);
        if (isNode(deepest.node)) {
            merge(deepest.node, child);
        }

        const parent = ancestors[ancestors.length - 1];
        if (parent) {
            if (deepest.parent) {
                const pos = deepest.parent.children.indexOf(deepest.node as AbbreviationNode);
                deepest.parent.children[pos] = child;
            }

            const ix = parent.children.indexOf(child);
            parent.children = parent.children.slice(0, ix)
                .concat(abbr.children)
                .concat(parent.children.slice(ix + 1));
        }
    };

    resolve(node);
}

/**
 * Adds data from first node into second node
 */
function merge(from: AbbreviationNode, to: AbbreviationNode) {
    to.name = from.name;

    if (from.selfClosing) {
        to.selfClosing = true;
    }

    if (from.value != null) {
        to.value = from.value;
    }

    if (from.repeat) {
        to.repeat = from.repeat;
    }

    if (from.attributes) {
        // TODO add config option to specify attribute merge direction
        to.attributes = from.attributes.concat(to.attributes || []);
    }
}
