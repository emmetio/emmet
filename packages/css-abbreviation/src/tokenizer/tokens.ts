export type OperatorType = 'sibling' | 'important' | 'argument-delimiter' | 'value-delimiter' | 'property-delimiter';
export type AllTokens = Bracket | Literal | Operator | WhiteSpace | ColorValue | NumberValue | StringValue;

export interface Token {
    type: string;

    /** Location of token start in source */
    start?: number;

    /** Location of token end in source */
    end?: number;
}

export interface Operator extends Token {
    type: 'Operator';
    operator: OperatorType;
}

export interface Bracket extends Token {
    type: 'Bracket';
    open: boolean;
}

export interface Literal extends Token {
    type: 'Literal';
    value: string;
}

export interface NumberValue extends Token {
    type: 'NumberValue';
    value: number;
    unit: string;
}

export interface ColorValue extends Token {
    type: 'ColorValue';
    color: string;
    alpha?: number;
}

export interface StringValue extends Token {
    type: 'StringValue';
    value: string;
    quote: 'single' | 'double';
}

export interface WhiteSpace extends Token {
    type: 'WhiteSpace';
}
