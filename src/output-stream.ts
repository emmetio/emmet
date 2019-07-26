import { FormatOptions, Options } from './types';

const formatOptions: FormatOptions = {
    indent: '\t',
    baseIndent: '',
    newline: '\n',
    field(index: number, placeholder: string) {
        return placeholder ? `\${${index}:${placeholder}}` : `\${${index}}`;
    }
};

export interface OutputStream {
    format: FormatOptions;
    value: string;
    offset: number;
    line: number;
    column: number;
}

export default function createOutputStream(options: Options): OutputStream {
    return {
        format: { ...formatOptions, ...options },
        value: '',
        offset: 0,
        line: 0,
        column: 0
    };
}

/**
 * Pushes given string into output
 */
export function pushString(stream: OutputStream, value: string) {
    stream.value += value;
    stream.offset += value.length;
    stream.column += value.length;
}

/**
 * Pushes new line into given output stream
 */
export function pushNewline(stream: OutputStream) {
    const { baseIndent, newline } = stream.format;
    pushString(stream, newline + baseIndent);
    stream.line++;
    stream.column = baseIndent.length;
}

/**
 * Adds indentation of `size` to current output stream
 */
export function pushIndent(stream: OutputStream, size: number = 1) {
    pushString(stream, stream.format.indent.repeat(size));
}

/**
 * Pushes field/tabstop into output stream
 */
export function pushField(stream: OutputStream, index: number, placeholder: string) {
    pushString(stream, stream.format.field(index, placeholder, stream.offset, stream.line, stream.column));
}
