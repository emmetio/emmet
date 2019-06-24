export type AttributeName = string;
export type AttributeValue = string | null;

export interface AttributeOptions {
    /** Attribute is boolean (e.g.name equals value) */
    boolean?: boolean;

    /** Attribute is implied (e.g.must be outputted only if contains non-null value) */
    implied?: boolean;
}

export interface RawAttribute {
    name: AttributeName;
    value?: AttributeValue;
    options?: AttributeOptions;
}

/**
 * Attribute descriptor of parsed abbreviation node
 * @param name Attribute name
 * @param value Attribute value
 * @param options Additional custom attribute options
 */
export default class Attribute {
    constructor(readonly name: AttributeName, readonly value: AttributeValue = null, readonly options: AttributeOptions = {}) {}

    /**
     * Create a copy of current attribute
     */
    clone(): Attribute {
        return new Attribute(this.name, this.value, { ...this.options });
    }

    /**
     * A string representation of current node
     */
    valueOf(): string {
        return `${this.name}="${this.value}"`;
    }
}
