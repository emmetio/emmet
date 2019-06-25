export interface CSSNode {
    /** Node type */
    type: string;

    /** Start location in source abbreviation */
    start?: number;

    /** End location in source abbreviation */
    end?: number;
}

export interface CSSAbbreviation {
    type: 'abbreviation';
    elements: CSSElement[];
    source: string;
}

export interface CSSElement extends CSSNode {
    type: 'element';
    name?: string;
    value?: CSSValue[];
    important?: boolean;
}

export interface CSSString extends CSSNode {
    type: 'string';
    value: string;
}

export interface CSSNumber extends CSSNode {
    type: 'number';
    value: number;
    unit?: string;
}

export interface CSSKeyword extends CSSNode {
    type: 'keyword';
    value: string;
}

export interface CSSColor extends CSSNode {
    type: 'color';
    r: number;
    g: number;
    b: number;
    a: number;
    raw: string;
}

export type CSSValue = CSSString | CSSNumber | CSSKeyword | CSSColor | CSSFunction;

export interface CSSFunction extends CSSNode {
    type: 'function';
    name: string;
    arguments: CSSFunctionArgument[];
}

export interface CSSFunctionArgument extends CSSNode {
    type: 'argument';
    items: CSSValue[];
}
