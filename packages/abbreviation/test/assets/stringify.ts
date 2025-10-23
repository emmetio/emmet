import type { AllTokens, Repeater, RepeaterNumber, Field, OperatorType, Operator, Bracket, Quote, Literal } from '../../src/tokenizer';
import type { TokenElement, TokenAttribute, TokenGroup, TokenStatement } from '../../src/parser';

type TokenVisitor = <T extends AllTokens>(token: T) => string;
interface TokenVisitorMap {
    [nodeType: string]: TokenVisitor;
}

const operatorMap: { [name in OperatorType]: string } = {
    id: '#',
    class: '.',
    equal: '=',
    child: '>',
    climb: '^',
    sibling: '+',
    close: '/'
};

const tokenVisitors = {
    Repeater(token: Repeater) {
        return `*${token.implicit ? '' : token.count}`;
    },
    RepeaterNumber(token: RepeaterNumber) {
        return '$'.repeat(token.size);
    },
    RepeaterPlaceholder() {
        return '$#';
    },
    Field(node: Field) {
        const index = node.index != null ? String(node.index) : '';
        const sep = index && node.name ? ':' : '';
        return `\${${index}${sep}${node.name}}`;
    },
    Operator(node: Operator) {
        return operatorMap[node.operator];
    },
    Bracket(node: Bracket) {
        if (node.context === 'attribute') {
            return node.open ? '[' : ']';
        }

        if (node.context === 'expression') {
            return node.open ? '{' : '}';
        }

        if (node.context === 'group') {
            return node.open ? '(' : ')';
        }

        return '?';
    },
    Quote(node: Quote) {
        return node.single ? '\'' : '"';
    },
    Literal(node: Literal) {
        return node.value;
    },
    WhiteSpace() {
        return ' ';
    }
} as TokenVisitorMap;

function statement(node: TokenElement | TokenGroup): string {
    if (node.type === 'TokenGroup') {
        return `(${content(node)})${node.repeat ? str(node.repeat) : ''}`;
    }

    return element(node);
}

function element(node: TokenElement): string {
    const name = node.name ? tokenList(node.name) : '?';
    const repeat = node.repeat ? str(node.repeat) : '';
    const attributes = node.attributes ? node.attributes.map(attribute).join(' ') : '';
    if (node.selfClose && !node.elements.length) {
        return `<${name}${repeat}${attributes ? ' ' + attributes : ''} />`;
    }

    return `<${name}${repeat}${attributes ? ' ' + attributes : ''}>${tokenList(node.value)}${content(node)}</${name}>`;
}

function attribute(attr: TokenAttribute): string {
    const name = tokenList(attr.name) || '?';
    return attr.value ? `${name}=${tokenList(attr.value)}` : name;

}

function tokenList(tokens?: AllTokens[]): string {
    return tokens ? tokens.map(str).join('') : '';
}

function str(token: AllTokens): string {
    if (token.type in tokenVisitors) {
        return tokenVisitors[token.type](token);
    }

    throw new Error(`Unknown token "${token.type}"`);
}

function content(node: TokenStatement): string {
    return node.elements.map(statement).join('');
}

export default function stringify(abbr: TokenGroup): string {
    return content(abbr);
}
