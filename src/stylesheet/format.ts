import { CSSAbbreviation, CSSProperty, Value, CSSValue, NumberValue } from '@emmetio/css-abbreviation';
import createOutputStream, { OutputStream, push, pushString, pushField, pushNewline } from '../output-stream';
import { Config } from '../config';
import color, { frac } from './color';
import { CSSAbbreviationScope } from './';

export default function css(abbr: CSSAbbreviation, config: Config): string {
    const out = createOutputStream(config.options);
    const format = config.options['output.format'];

    if (config.context?.name === CSSAbbreviationScope.Section) {
        // For section context, filter out unmatched snippets
        abbr = abbr.filter(node => node.snippet);
    }

    for (let i = 0; i < abbr.length; i++) {
        if (format && i !== 0) {
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
    const isJSON = config.options['stylesheet.json'];
    if (node.name) {
        // It’s a CSS property
        const name = isJSON ? toCamelCase(node.name) : node.name;
        pushString(out, name + config.options['stylesheet.between']);

        if (node.value.length) {
            propertyValue(node, out, config);
        } else {
            pushField(out, 0, '');
        }

        if (isJSON) {
            // For CSS-in-JS, always finalize property with comma
            // NB: seems like `important` is not available in CSS-in-JS syntaxes
            push(out, ',');
        } else {
            outputImportant(node, out, true);
            push(out, config.options['stylesheet.after']);
        }
    } else {
        // It’s a regular snippet, output plain tokens without any additional formatting
        for (const cssVal of node.value) {
            for (const v of cssVal.value) {
                outputToken(v, out, config);
            }
        }
        outputImportant(node, out, node.value.length > 0);
    }
}

function propertyValue(node: CSSProperty, out: OutputStream, config: Config) {
    const isJSON = config.options['stylesheet.json'];
    const num = isJSON ? getSingleNumeric(node) : null;

    if (num && (!num.unit || num.unit === 'px')) {
        // For CSS-in-JS, if property contains single numeric value, output it
        // as JS number
        push(out, String(num.value));
    } else {
        const quote = getQuote(config);
        isJSON && push(out, quote);
        for (let i = 0; i < node.value.length; i++) {
            if (i !== 0) {
                push(out, ', ');
            }
            outputValue(node.value[i], out, config);
        }
        isJSON && push(out, quote);
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
    for (let i = 0, prevEnd = -1; i < value.value.length; i++) {
        const token = value.value[i];
        // Handle edge case: a field is written close to previous token like this: `foo${bar}`.
        // We should not add delimiter here
        if (i !== 0 && (token.type !== 'Field' || token.start !== prevEnd)) {
            push(out, ' ');
        }

        outputToken(token, out, config);
        prevEnd = token['end'];
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

/**
 * If value of given property is a single numeric value, returns this token
 */
function getSingleNumeric(node: CSSProperty): NumberValue | void {
    if (node.value.length === 1) {
        const cssVal = node.value[0]!;
        if (cssVal.value.length === 1 && cssVal.value[0]!.type === 'NumberValue') {
            return cssVal.value[0] as NumberValue;
        }
    }
}

/**
 * Converts kebab-case string to camelCase
 */
function toCamelCase(str: string): string {
    return str.replace(/\-(\w)/g, (_, letter: string) => letter.toUpperCase());
}

function getQuote(config: Config): string {
    return config.options['stylesheet.jsonDoubleQuotes'] ? '"' : '\'';
}
