import { EMLiteral, EMAttribute } from './ast';

export const enum Chars {
    ExpressionStart = 123,  // {
    ExpressionEnd = 125, // }
    Escape = 92, // \ character
    Equals = 61, // =
    AttrOpen = 91, // [
    AttrClose = 93, // ]
    Repeater = 42, // *
    RepeaterModifier = 64, // @
    Hash = 35, // #
    Dash = 45, // -
    Dot = 46, // .
    Slash = 47, // /
    Excl = 33, // .
    GroupStart = 40, // (
    GroupEnd = 41, // )
    Sibling = 43, // +
    Child = 62, // >
    Climb = 94, // ^
}

/**
 * Creates literal AST node from given data
 */
export function toLiteral(value: string, start?: number, end?: number): EMLiteral {
    return { type: 'EMLiteral', value, start, end };
}

/**
 * Creates attribute AST node from given data
 */
export function toAttribute(name?: string, value?: EMLiteral, start?: number, end?: number): EMAttribute {
    if (start == null && value) {
        start = value.start;
    }

    if (end == null && value) {
        end = value.end;
    }

    return { type: 'EMAttribute', name, value, start, end };
}
