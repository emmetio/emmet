import {
    EMNode, EMRepeat, EMAbbreviation, EMGroup, EMElement, EMAttribute,
    EMTokenGroup, EMRepeaterValue, EMRepeaterPlaceholder, EMField, EMString, EMVariable
} from '../../src/ast';

type Visitor = (node: EMNode, next: VisitorContinue) => string;
type VisitorContinue = (node?: EMNode) => string;
interface VisitorMap {
    [nodeType: string]: Visitor;
}

const visitors: VisitorMap = {
    EMAbbreviation(node: EMAbbreviation, next) {
        return node.items.map(next).join('');
    },
    EMGroup(node: EMGroup, next) {
        return `(${node.items.map(next).join('')})${next(node.repeat)}`;
    },
    EMElement(node: EMElement, next) {
        const name = node.name ? next(node.name) : '?';
        const attrs = node.attributes.map(next).join('');
        const repeat = next(node.repeat);

        return node.selfClosing
            ? `<${name}${repeat}${attrs} />`
            : `<${name}${repeat}${attrs}>${next(node.value)}${node.items.map(next).join('')}</${name}>`;
    },
    EMAttribute(node: EMAttribute, next) {
        return ` ${node.name ? next(node.name) : '?'}=${attrValue(node, next)}`;
    },
    EMTokenGroup(node: EMTokenGroup, next) {
        return node.tokens.map(next).join('');
    },
    EMRepeat(node: EMRepeat) {
        return `*${node.count || ''}`;
    },
    EMRepeaterValue(node: EMRepeaterValue) {
        return '$'.repeat(node.size);
    },
    EMRepeaterPlaceholder(node: EMRepeaterPlaceholder) {
        return '$#';
    },
    EMField(node: EMField) {
        return `\${${node.index}${node.placeholder ? ':' + node.placeholder : ''}}`;
    },
    EMString(node: EMString) {
        return node.value;
    },
    EMVariable(node: EMVariable) {
        return `\${${node.name}}`;
    }
};

function attrValue(attr: EMAttribute, next: VisitorContinue) {
    const { value } = attr;
    if (value) {
        return value.before === '{'
            ? `${value.before}${next(value) || ''}${value.after}`
            : `"${next(value) || ''}"`;
    }

    return '""';
}

export default function stringify(abbr?: EMNode): string {
    const next: VisitorContinue = node => {
        if (!node) {
            return '';
        }

        if (node.type in visitors) {
            return visitors[node.type](node, next);
        }

        throw new Error(`Unknown node type "${node.type}"`);
    };

    return next(abbr);
}
