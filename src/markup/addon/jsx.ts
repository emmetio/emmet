import { AbbreviationNode, AbbreviationAttribute } from '@emmetio/abbreviation';

/**
 * JSX transformer: replaces `class` and `for` attributes with `className` and
 * `htmlFor` attributes respectively
 */
export default function jsx(node: AbbreviationNode) {
    if (node.attributes) {
        node.attributes.forEach(rename);
    }
}

function rename(attr: AbbreviationAttribute) {
    if (attr.name === 'class') {
        attr.name = 'className';
    } else if (attr.name === 'for') {
        attr.name = 'htmlFor';
    }
}
