import { FormatOptions, Options } from './types';

const formatOptions: FormatOptions = {
    indent: '\t',
    baseIndent: '',
    newline: '\n',
    field(index: number, placeholder: string) {
        return placeholder;
    }
};

export interface OutputStream {
    format: FormatOptions;
    value: string;
    level: number;
    offset: number;
    line: number;
    column: number;
}

export default function createOutputStream(options: Options, level = 0): OutputStream {
    // TODO add unit tests
    return {
        format: { ...formatOptions, ...options },
        value: '',
        level,
        offset: 0,
        line: 0,
        column: 0
    };
}

/**
 * Pushes given string into output
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
    const { baseIndent, newline } = stream.format;
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
    pushString(stream, stream.format.indent.repeat(Math.max(size, 0)));
}

/**
 * Pushes field/tabstop into output stream
 */
export function pushField(stream: OutputStream, index: number, placeholder: string) {
    pushString(stream, stream.format.field(index, placeholder, stream.offset, stream.line, stream.column));
}

/**
 * Splits given text by lines
 */
export function splitByLines(text: string): string[] {
    return text.split(/\r\n|\r|\n/g);
}

function push(stream: OutputStream, text: string) {
    stream.value += text;
    stream.offset += text.length;
    stream.column += text.length;
}
