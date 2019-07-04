import { EMNode, EMAbbreviation, EMGroup, EMElement, EMAttribute } from '@emmetio/abbreviation';

type Visitor = (node: EMNode, next: VisitorContinue) => string;
type VisitorContinue = (node: EMNode) => string;
interface VisitorMap {
    [nodeType: string]: Visitor;
}

const visitors: VisitorMap = {
    EMAbbreviation(node: EMAbbreviation, next) {
        return node.items.map(next).join('');
    },
    EMGroup(node: EMGroup, next) {
        return `(${node.items.map(next).join('')})`;
    },
    EMElement(node: EMElement) {
        const name = node.name;
        const attrs = node.attributes.map(a => ` ${a.name || '?'}=${attrValue(a)}`).join('');

        if (name || attrs) {
            return node.selfClosing
                ? `<${name}${attrs} />`
                : `<${name}${attrs}>${node.value ? node.value.value : ''}${node.items.map(stringify).join('')}</${name}>`;
        }

        if (node.value) {
            return node.value ? node.value.value : '';
        }

        return '';
    }
};

function attrValue(attr: EMAttribute) {
    const { value } = attr;
    if (value) {
        return value.before === '{'
            ? `${value.before}${value.value || ''}${value.after}`
            : `"${value.value || ''}"`;
    }

    return '""';
}

/**
 * Returns stringified version of given abbreviation AST node
 */
export default function stringify(node: EMNode): string {
    if (node.type in visitors) {
        return visitors[node.type](node, stringify);
    }

    throw new Error(`Unknown node type "${node.type}"`);
}
