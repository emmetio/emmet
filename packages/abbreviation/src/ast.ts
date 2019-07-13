export interface EMNode {
    type: string;
    start?: number;
    end?: number;
}

export type EMStatement = EMElement | EMGroup;

export interface EMAbbreviation extends EMNode {
    type: 'EMAbbreviation';
    items: EMStatement[];
    raw?: string;
}

export interface EMRepeat extends EMNode {
    type: 'EMRepeat';

    /**
     * How many times context element should be repeated. `undefined` means implicit
     * repeater, e.g. should be repeated by the amount of text lines selected by user
     */
    count: number;

    /**
     * Position of context element in its repeating sequence
     */
    value: number;

    /**
     * Repeater is implicit, e.g. repeated by the amount of text lines selected by user
     */
    implicit: boolean;
}

export interface EMRepeaterValue extends EMNode {
    type: 'EMRepeaterValue';

    /** Size of repeater content, e.g. the amount consequent numbering characters */
    size: number;

    /** Should output numbering in reverse order? */
    reverse: boolean;

    /** Base value to start numbering from */
    base: number;
}

export interface EMRepeaterPlaceholder extends EMNode {
    type: 'EMRepeaterPlaceholder';
    /** Value to insert instead of placeholder */
    value?: string;
}

export interface EMField extends EMNode {
    type: 'EMField';
    index: number;
    placeholder: string;
}

export interface EMString extends EMNode {
    type: 'EMString';
    value: string;
}

export interface EMVariable extends EMNode {
    type: 'EMVariable';
    name: string;
}

export interface EMTokenGroup<T extends EMNode = EMNode> extends EMNode {
    type: 'EMTokenGroup';
    raw: string;
    tokens: T[];

    /** String token before literal value */
    before?: string;

    /** String token after literal value */
    after?: string;
}

export type EMIdentifierTokens = EMString | EMRepeaterValue;
export type EMLiteralTokens = EMString | EMRepeaterValue | EMField | EMVariable | EMRepeaterPlaceholder;
export type EMIdentifier = EMTokenGroup<EMIdentifierTokens>;
export type EMLiteral = EMTokenGroup<EMLiteralTokens>;

export interface EMGroup extends EMNode {
    type: 'EMGroup';
    items: EMStatement[];
    repeat?: EMRepeat;
}

export interface EMElement extends EMNode {
    type: 'EMElement';
    name?: EMIdentifier;
    value?: EMLiteral;
    repeat?: EMRepeat;
    attributes: EMAttribute[];
    items: EMStatement[];

    /**  Indicates current element is self-closing, e.g. should not contain closing pair */
    selfClosing?: boolean;
}

export interface EMAttribute extends EMNode {
    type: 'EMAttribute';
    name?: EMIdentifier;
    value?: EMLiteral;

    /** Attribute is boolean (e.g.name equals value) */
    boolean?: boolean;

    /** Attribute is implied (e.g.must be outputted only if contains non-null value) */
    implied?: boolean;
}
