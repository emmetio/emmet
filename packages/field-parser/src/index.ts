import Scanner from '@emmetio/scanner';
import { isNumber } from '@emmetio/scanner/utils';

export type TokenFn = (index: number, placeholder?: string) => string;

const enum Char {
    Dollar = 36,  // $
    Colon = 58,  // :
    Escape = 92,  // \
    OpenBrace = 123, // {
    CloseBrace = 125, // }
}

/**
 * Finds fields in given string and returns object with field-less string
 * and array of fields found
 */
export default function parse(str: string): FieldString {
    const stream = new Scanner(str);
    const fields: Field[] = [];
    let cleanString = '';
    let offset = 0;
    let pos = 0;
    let field: Field | undefined;

    while (!stream.eof()) {
        pos = stream.pos;

        if (stream.eat(Char.Escape)) {
            stream.pos++;
        } else if (field = consumeField(stream, cleanString.length + pos - offset)) {
            fields.push(field);
            cleanString += stream.substring(offset, pos) + field.placeholder;
            offset = stream.pos;
        } else {
            stream.pos++;
        }
    }

    return new FieldString(cleanString + stream.string.slice(offset), fields);
}

/**
 * Marks given `string` with `fields`: wraps each field range with
 * `${index:placeholder}` (by default) or any other token produced by `token`
 * function, if provided
 * @param str String to mark
 * @param fields Array of field descriptor. It is important that fields in array
 * must be ordered by their location in string: some fields my refer the same
 * location so they must appear in order that user expects.
 * @param token Function that generates field token. This function
 * received two arguments: `index` and `placeholder` and should return string
 * @return String with marked fields
 */
export function mark(str: string, fields: Field[], token: TokenFn = createToken): string {
    // order fields by their location and appearance
    // NB field ranges should not overlap! (not supported yet)
    const ordered = fields
        .map((field, order) => ({ order, field, end: field.location + field.placeholder.length }))
        .sort((a, b) => (a.end - b.end) || (a.order - b.order));

    // mark ranges in string
    let offset = 0;
    const result = ordered.map(item => {
        const placeholder = str.substr(item.field.location, item.field.placeholder.length);
        const prefix = str.slice(offset, item.field.location);
        offset = item.end;
        return prefix + token(item.field.index, placeholder);
    });

    return result.join('') + str.slice(offset);
}

/**
 * Creates field token for string
 * @param index Field index
 * @param placeholder Field placeholder, could be empty string
 */
export function createToken(index: number, placeholder?: string): string {
    return placeholder ? `\${${index}:${placeholder}}` : `\${${index}}`;
}

/**
 * Consumes field from current stream position: it can be an `$index` or
 * or `${index}` or `${index:placeholder}`
 * @param stream
 * @param location Field location in *clean* string
 */
function consumeField(stream: Scanner, location: number): Field | undefined {
    const start = stream.pos;

    if (stream.eat(Char.Dollar)) {
        // Possible start of field
        let index = consumeIndex(stream);
        let placeholder = '';

        // consumed $index placeholder
        if (index != null) {
            return new Field(index, placeholder, location);
        }

        if (stream.eat(Char.OpenBrace)) {
            index = consumeIndex(stream);
            if (index != null) {
                if (stream.eat(Char.Colon)) {
                    placeholder = consumePlaceholder(stream);
                }

                if (stream.eat(Char.CloseBrace)) {
                    return new Field(index, placeholder, location);
                }
            }
        }
    }

    // If we reached here then there’s no valid field here, revert
    // back to starting position
    stream.pos = start;
}

/**
 * Consumes a placeholder: value right after `:` in field. Could be empty
 */
function consumePlaceholder(stream: Scanner): string {
    let code: number;
    const stack: number[] = [];
    stream.start = stream.pos;

    while (!stream.eof()) {
        code = stream.peek();

        if (code === Char.OpenBrace) {
            stack.push(stream.pos);
        } else if (code === Char.CloseBrace) {
            if (!stack.length) {
                break;
            }
            stack.pop();
        }
        stream.pos++;
    }

    if (stack.length) {
        stream.pos = stack.pop()!;
        throw stream.error(`Unable to find matching "}" for curly brace at ${stack.pop()}`);
    }

    return stream.current();
}

/**
 * Consumes integer from current stream position
 */
function consumeIndex(stream: Scanner): number | undefined {
    stream.start = stream.pos;
    return stream.eatWhile(isNumber) ? Number(stream.current()) : void 0;
}

class Field {
    constructor(public index: number, public placeholder: string, public location: number) {}
}

class FieldString {
    constructor(public value: string, public fields: Field[]) {}

    mark(token?: TokenFn) {
        return mark(this.value, this.fields, token);
    }

    toString() {
        return this.value;
    }
}
