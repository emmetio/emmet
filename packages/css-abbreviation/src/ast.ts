export interface CSSNode {
    /** Node type */
    type: string;

    /** Start location in source abbreviation */
    start?: number;

    /** End location in source abbreviation */
    end?: number;
}

export interface CSSAbbreviation {
    type: 'CSSAbbreviation';
    elements: CSSElement[];
    source: string;
}

export interface CSSElement extends CSSNode {
    type: 'CSSElement';
    name?: string;
    value?: CSSValue[];
    important?: boolean;
}

export interface CSSString extends CSSNode {
    type: 'CSSString';
    value: string;
}

export interface CSSNumber extends CSSNode {
    type: 'CSSNumber';
    value: number;
    unit?: string;
}

export interface CSSKeyword extends CSSNode {
    type: 'CSSKeyword';
    value: string;
}

export interface CSSColor extends CSSNode {
    type: 'CSSColor';
    r: number;
    g: number;
    b: number;
    a: number;
    raw: string;
}

export type CSSValue = CSSString | CSSNumber | CSSKeyword | CSSColor | CSSFunction;

export interface CSSFunction extends CSSNode {
    type: 'CSSFunction';
    name: string;
    arguments: CSSFunctionArgument[];
}

export interface CSSFunctionArgument extends CSSNode {
    type: 'CSSFunctionArgument';
    items: CSSValue[];
}
