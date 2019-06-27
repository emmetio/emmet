import { EMNode, EMRepeat, EMAbbreviation, EMGroup, EMElement, EMAttribute } from '../../src/ast';

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
        const repeat = node.repeat ? stringifyRepeater(node.repeat) : '';
        return `(${node.items.map(next).join('')})${repeat}`;
    },
    EMElement(node: EMElement, next) {
        const name = node.name || '?';
        const repeat = node.repeat ? stringifyRepeater(node.repeat) : '';
        const attrs = node.attributes.map(a => ` ${a.name}=${attrValue(a)}`).join('');

        return node.selfClosing
            ? `<${name}${repeat}${attrs} />`
            : `<${name}${repeat}${attrs}>${node.value ? node.value.value : ''}${node.items.map(stringify).join('')}</${name}>`;
    }
};

function stringifyRepeater(repeater: EMRepeat) {
    return `*${repeater.count || ''}`;
}

function attrValue(attr: EMAttribute) {
    const { value } = attr;
    if (value) {
        return value.before === '{'
            ? `${value.before}${value.value || ''}${value.after}`
            : `"${value.value || ''}"`;
    }

    return '""';
}

export default function stringify(abbr: EMNode): string {
    const next: VisitorContinue = node => {
        if (node.type in visitors) {
            return visitors[node.type](node, next);
        }

        throw new Error(`Unknown node type "${node.type}"`);
    };

    return next(abbr);
}
