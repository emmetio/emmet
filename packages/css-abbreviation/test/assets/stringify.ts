import { CSSProperty, CSSValue, Value } from '../../src/parser/index.js';

export default function stringify(prop: CSSProperty): string {
    return `${prop.name || '?'}: ${prop.value.map(stringifyValue).join(', ')}${prop.important ? ' !important' : ''};`;
}

function stringifyValue(value: CSSValue): string {
    return value.value.map(stringifyToken).join(' ');
}

function stringifyToken(token: Value): string {
    if (token.type === 'ColorValue') {
        const { r, g, b, a } = token;
        if (!r && !g && !b && !a) {
            return 'transparent';
        }

        if (a === 1) {
            return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        }

        return `rgba(${r}, ${g}, ${b}, ${a})`;
    } else if (token.type === 'NumberValue') {
        return `${token.value}${token.unit}`;
    } else if (token.type === 'StringValue') {
        return `"${token.value}"`;
    } else if (token.type === 'Literal') {
        return token.value;
    } else if (token.type === 'FunctionCall') {
        return `${token.name}(${token.arguments.map(stringifyValue).join(', ')})`;
    }

    throw new Error('Unexpected token');
}

function toHex(num: number): string {
    return pad(num.toString(16), 2);
}

function pad(value: string, len: number): string {
    while (value.length < len) {
        value = '0' + value;
    }
    return value;
}
