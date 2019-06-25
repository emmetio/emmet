import { CSSNode, CSSAbbreviation, CSSElement, CSSString, CSSNumber, CSSKeyword, CSSColor, CSSFunction, CSSFunctionArgument } from '../../src/ast';
import { asHex, asRGB } from '../../src/color';

type Visitor = (node: CSSNode, next: VisitorContinue) => string;
type VisitorContinue = (node: CSSNode) => string;
interface VisitorMap {
    [nodeType: string]: Visitor;
}

const visitors: VisitorMap = {
    CSSAbbreviation(node: CSSAbbreviation, next) {
        return node.elements.map(next).join('');
    },
    CSSElement(node: CSSElement, next) {
        if (node.value) {
            let value = node.value.map(next).join(' ');
            if (node.important) {
                value += ' !';
            }

            return node.name ? `${node.name}: ${value};` : `${value};`;
        }

        if (node.name) {
            return `${node.name}${node.important ? ' !' : ''};`;
        }

        return '';
    },
    CSSString(node: CSSString) {
        return node.value;
    },
    CSSNumber(node: CSSNumber) {
        return `${node.value}${node.unit || ''}`;
    },
    CSSKeyword(node: CSSKeyword) {
        return node.value;
    },
    CSSColor(node: CSSColor) {
        if (!node.r && !node.g && !node.b && !node.a) {
            return 'transparent';
        }
        return node.a === 1 ? asHex(node) : asRGB(node);
    },
    CSSFunction(node: CSSFunction, next) {
        return `${node.name}(${node.arguments.map(next).join(', ')})`;
    },
    CSSFunctionArgument(node: CSSFunctionArgument, next) {
        return node.items.map(next).join(' ');
    }
};

export default function stringify(abbr: CSSAbbreviation): string {
    const next: VisitorContinue = node => {
        if (node.type in visitors) {
            return visitors[node.type](node, next);
        }

        throw new Error(`Unknown node type ${node.type}`);
    };

    return next(abbr);
}
