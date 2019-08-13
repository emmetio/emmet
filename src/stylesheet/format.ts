import { CSSAbbreviation, CSSProperty, Value, CSSValue, ColorValue } from '@emmetio/css-abbreviation';
import createOutputStream, { OutputStream, push, pushString, pushField } from '../output-stream';
import { Config } from '../config';

export default function css(abbr: CSSAbbreviation, config: Config): string {
    const out = createOutputStream(config.options);
    for (const node of abbr) {
        property(node, out, config);
    }

    return out.value;
}

/**
 * Outputs given abbreviation node into output stream
 */
function property(node: CSSProperty, out: OutputStream, config: Config) {
    if (node.name) {
        // It’s a CSS property
        pushString(out, node.name + config.options['stylesheet.between']);
        propertyValue(node, out, config);
        push(out, config.options['stylesheet.after']);
    } else {
        // It’s a regular snippet
        propertyValue(node, out, config);
    }
}

function propertyValue(node: CSSProperty, out: OutputStream, config: Config) {
    for (let i = 0; i < node.value.length; i++) {
        if (i !== 0) {
            push(out, ' ');
        }
        outputValue(node.value[i], out, config);
    }
}

function outputValue(value: CSSValue, out: OutputStream, config: Config) {
    for (const t of value.value) {
        outputToken(t, out, config);
    }
}

function outputToken(token: Value, out: OutputStream, config: Config) {
    if (token.type === 'ColorValue') {
        if (!token.r && !token.g && !token.b && !token.a) {
            push(out, 'transparent');
        } else if (token.a === 1) {
            push(out, asHex(token, config.options['stylesheet.shortHex']));
        } else {
            push(out, asRGB(token));
        }
    } else if (token.type === 'Literal') {
        pushString(out, token.value);
    } else if (token.type === 'NumberValue') {
        pushString(out, frac(token.value, 4) + token.unit);
    } else if (token.type === 'StringValue') {
        const quote = token.quote === 'double' ? '"' : '\'';
        pushString(out, quote + token.value + quote);
    } else if (token.type === 'Field') {
        pushField(out, token.index!, token.name);
    } else if (token.type === 'FunctionCall') {
        push(out, token.name + '(');
        for (let i = 0; i < token.arguments.length; i++) {
            if (i) {
                push(out, ', ');
            }
            outputValue(token.arguments[i], out, config);
        }
        push(out, ')');
    }
}

/**
 * Output given color as hex value
 * @param short Produce short value (e.g. #fff instead of #ffffff), if possible
 */
function asHex(color: ColorValue, short?: boolean): string {
    const fn = (short && isShortHex(color.r) && isShortHex(color.g) && isShortHex(color.b))
        ? toShortHex : toHex;

    return '#' + fn(color.r) + fn(color.g) + fn(color.b);
}

/**
 * Output current color as `rgba?(...)` CSS color
 */
function asRGB(color: ColorValue): string {
    const values: Array<string | number> = [color.r, color.g, color.b];
    if (color.a !== 1) {
        values.push(frac(color.a, 8));
    }

    return `${values.length === 3 ? 'rgb' : 'rgba'}(${values.join(', ')})`;
}

function isShortHex(hex: number): boolean {
    return !(hex % 17);
}

function toShortHex(num: number): string {
    return (num >> 4).toString(16);
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

function frac(num: number, digits = 4): string {
    return num.toFixed(digits).replace(/\.?0+$/, '');
}
