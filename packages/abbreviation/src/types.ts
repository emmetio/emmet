import { Field, Repeater } from './tokenizer';

export interface ParserOptions {
    text?: string | string[];
    variables?: { [name: string]: string };
}

export interface ConvertState {
    inserted: boolean;
    text?: string | string[];

    /** Context repeaters, e.g. all actual repeaters from parent */
    repeaters: Repeater[];

    getText(pos?: number): string;
    getVariable(name: string): string;
}

export type TokenValue = string | Field;
export type AttributeType = 'raw' | 'singleQuote' | 'doubleQuote' | 'expression';

export interface Abbreviation {
    children: AbbreviationNode[];
}

export interface AbbreviationNode {
    name?: string;
    value?: TokenValue[];
    repeat?: Repeater;
    attributes?: AbbreviationAttribute[];
    children: AbbreviationNode[];

    /**  Indicates current element is self-closing, e.g. should not contain closing pair */
    selfClosing?: boolean;
}

export interface AbbreviationAttribute {
    name?: string;
    value?: TokenValue[];

    /** Indicates type of value stored in `.value` property */
    valueType: AttributeType;

    /** Attribute is boolean (e.g.name equals value) */
    boolean?: boolean;

    /** Attribute is implied (e.g.must be outputted only if contains non-null value) */
    implied?: boolean;
}
