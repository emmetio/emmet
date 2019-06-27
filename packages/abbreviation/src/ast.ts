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

export interface EMRepeat {
    count?: number;
}

export interface EMGroup extends EMNode {
    type: 'EMGroup';
    items: EMStatement[];
    repeat?: EMRepeat;
}

export interface EMElement extends EMNode {
    type: 'EMElement';
    name?: string;
    value?: EMLiteral;
    repeat?: EMRepeat;
    attributes: EMAttribute[];
    items: EMStatement[];

    /**  Indicates current element is self-closing, e.g. should not contain closing pair */
    selfClosing?: boolean;
}

export interface EMAttribute extends EMNode {
    type: 'EMAttribute';
    name?: string;
    value?: EMLiteral;

    /** Attribute is boolean (e.g.name equals value) */
    boolean?: boolean;

    /** Attribute is implied (e.g.must be outputted only if contains non-null value) */
    implied?: boolean;
}

export interface EMLiteral extends EMNode {
    type: 'EMLiteral';
    value: string;

    /** String token before literal value */
    before?: string;

    /** String token after literal value */
    after?: string;
}
