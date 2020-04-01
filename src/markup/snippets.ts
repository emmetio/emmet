import parse, { AbbreviationNode, AbbreviationAttribute, Abbreviation } from '@emmetio/abbreviation';
import { findDeepest, isNode, Container } from './utils';
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
export default function resolveSnippets(abbr: Abbreviation, config: Config): Abbreviation {
    const stack: string[] = [];
    const reversed = config.options['output.reverseAttributes'];

    const resolve = (child: AbbreviationNode): Abbreviation | null => {
        const snippet = child.name && config.snippets[child.name];
        // A snippet in stack means circular reference.
        // It can be either a user error or a perfectly valid snippet like
        // "img": "img[src alt]/", e.g. an element with predefined shape.
        // In any case, simply stop parsing and keep element as is
        if (!snippet || stack.includes(snippet)) {
            return null;
        }

        const snippetAbbr = parse(snippet, config);
        stack.push(snippet);
        walkResolve(snippetAbbr, resolve, config);
        stack.pop();

        // Add attributes from current node into every top-level node of parsed abbreviation
        for (const topNode of snippetAbbr.children) {
            if (child.attributes) {
                const from: AbbreviationAttribute[] = topNode.attributes || [];
                const to: AbbreviationAttribute[] = child.attributes || [];
                topNode.attributes = reversed ? to.concat(from) : from.concat(to);
            }
            mergeNodes(child, topNode);
        }

        return snippetAbbr;
    };

    walkResolve(abbr, resolve, config);
    return abbr;
}

function walkResolve(node: Container, resolve: (node: AbbreviationNode) => Abbreviation | null, config: Config): AbbreviationNode[] {
    let children: AbbreviationNode[] = [];

    for (const child of node.children) {
        const resolved = resolve(child);
        if (resolved) {
            children = children.concat(resolved.children);

            const deepest = findDeepest(resolved);
            if (isNode(deepest.node)) {
                deepest.node.children = deepest.node.children.concat(walkResolve(child, resolve, config));
            }
        } else {
            children.push(child);
            child.children = walkResolve(child, resolve, config);
        }
    }

    return node.children = children;
}

/**
 * Adds data from first node into second node
 */
function mergeNodes(from: AbbreviationNode, to: AbbreviationNode) {
    if (from.selfClosing) {
        to.selfClosing = true;
    }

    if (from.value != null) {
        to.value = from.value;
    }

    if (from.repeat) {
        to.repeat = from.repeat;
    }
}
