import { AbbreviationAttribute, AbbreviationNode } from '@emmetio/abbreviation';
import { Config, Options, StringCase } from './config';

export interface OutputStream {
    options: Options;
    value: string;
    level: number;
    offset: number;
    line: number;
    column: number;
}

export default function createOutputStream(options: Options, level = 0): OutputStream {
    return {
        options,
        value: '',
        level,
        offset: 0,
        line: 0,
        column: 0
    };
}

/**
 * Pushes plain string into output stream without newline processing
 */
export function push(stream: OutputStream, text: string) {
    const processText = stream.options['output.text'];
    _push(stream, processText(text, stream.offset, stream.line, stream.column));
}

/**
 * Pushes given string with possible newline formatting into output
 */
export function pushString(stream: OutputStream, value: string) {
    // If given value contains newlines, we should push content line-by-line and
    // use `pushNewline()` to maintain proper line/column state
    const lines = splitByLines(value);

    for (let i = 0, il = lines.length - 1; i <= il; i++) {
        push(stream, lines[i]);
        if (i !== il) {
            pushNewline(stream, true);
        }
    }
}

/**
 * Pushes new line into given output stream
 */
export function pushNewline(stream: OutputStream, indent?: boolean | number) {
    const baseIndent = stream.options['output.baseIndent'];
    const newline = stream.options['output.newline'];
    push(stream, newline + baseIndent);
    stream.line++;
    stream.column = baseIndent.length;
    if (indent) {
        pushIndent(stream, indent === true ? stream.level : indent);
    }
}

/**
 * Adds indentation of `size` to current output stream
 */
export function pushIndent(stream: OutputStream, size = stream.level) {
    const indent = stream.options['output.indent'];
    push(stream, indent.repeat(Math.max(size, 0)));
}

/**
 * Pushes field/tabstop into output stream
 */
export function pushField(stream: OutputStream, index: number, placeholder: string) {
    const field = stream.options['output.field'];
    // NB: use `_push` instead of `push` to skip text processing
    _push(stream, field(index, placeholder, stream.offset, stream.line, stream.column));
}

/**
 * Returns given tag name formatted according to given config
 */
export function tagName(name: string, config: Config) {
    return strCase(name, config.options['output.tagCase']);
}

/**
 * Returns given attribute name formatted according to given config
 */
export function attrName(name: string, config: Config) {
    return strCase(name, config.options['output.attributeCase']);
}

/**
 * Returns character for quoting value of given attribute
 */
export function attrQuote(attr: AbbreviationAttribute, config: Config, isOpen?: boolean): string {
    if (attr.valueType === 'expression') {
        return isOpen ? '{' : '}';
    }

    return config.options['output.attributeQuotes'] === 'single' ? '\'' : '"';
}

/**
 * Check if given attribute is boolean
 */
export function isBooleanAttribute(attr: AbbreviationAttribute, config: Config): boolean {
    return attr.boolean
        || config.options['output.booleanAttributes'].includes((attr.name || '').toLowerCase());
}

/**
 * Returns a token for self-closing tag, depending on current options
 */
export function selfClose(config: Config): string {
    switch (config.options['output.selfClosingStyle']) {
        case 'xhtml': return ' /';
        case 'xml': return '/';
        default: return '';
    }
}

/**
 * Check if given tag name belongs to inline-level element
 * @param node Parsed node or tag name
 */
export function isInline(node: string | AbbreviationNode, config: Config): boolean {
    if (typeof node === 'string') {
        return config.options.inlineElements.includes(node.toLowerCase());
    }

    // inline node is a node either with inline-level name or text-only node
    return node.name ? isInline(node.name, config) : Boolean(node.value && !node.attributes);
}

/**
 * Splits given text by lines
 */
export function splitByLines(text: string): string[] {
    return text.split(/\r\n|\r|\n/g);
}

/**
 * Pushes raw string into output stream without any processing
 */
function _push(stream: OutputStream, text: string) {
    stream.value += text;
    stream.offset += text.length;
    stream.column += text.length;
}

function strCase(str: string, type: StringCase) {
    if (type) {
        return type === 'upper' ? str.toUpperCase() : str.toLowerCase();
    }

    return str;
}
