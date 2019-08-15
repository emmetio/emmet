import { CSSAbbreviation, CSSProperty, Value, CSSValue } from '@emmetio/css-abbreviation';
import createOutputStream, { OutputStream, push, pushString, pushField, pushNewline } from '../output-stream';
import { Config } from '../config';
import color, { frac } from './color';

export default function css(abbr: CSSAbbreviation, config: Config): string {
    const out = createOutputStream(config.options);

    for (let i = 0; i < abbr.length; i++) {
        if (i !== 0) {
            pushNewline(out, true);
        }
        property(abbr[i], out, config);
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
        if (node.value.length) {
            propertyValue(node, out, config);
        } else {
            pushField(out, 0, '');
        }
        outputImportant(node, out, true);
        push(out, config.options['stylesheet.after']);
    } else {
        // It’s a regular snippet
        propertyValue(node, out, config);
        outputImportant(node, out, node.value.length > 0);
    }
}

function propertyValue(node: CSSProperty, out: OutputStream, config: Config) {
    for (let i = 0; i < node.value.length; i++) {
        if (i !== 0) {
            push(out, ', ');
        }
        outputValue(node.value[i], out, config);
    }
}

function outputImportant(node: CSSProperty, out: OutputStream, separator?: boolean) {
    if (node.important) {
        if (separator) {
            push(out, ' ');
        }
        push(out, '!important');
    }
}

function outputValue(value: CSSValue, out: OutputStream, config: Config) {
    for (let i = 0; i < value.value.length; i++) {
        const token = value.value[i];
        if (i !== 0) {
            push(out, ' ');
        }

        outputToken(token, out, config);
    }
}

function outputToken(token: Value, out: OutputStream, config: Config) {
    if (token.type === 'ColorValue') {
        push(out, color(token, config.options['stylesheet.shortHex']));
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
