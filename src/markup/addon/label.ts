import type { AbbreviationAttribute, AbbreviationNode } from '@emmetio/abbreviation';
import { find } from '../utils.js';

/**
 * Preprocessor of `<label>` element: if it contains `<input>`, remove `for` attribute
 * and `id` from input
 */
export default function label(node: AbbreviationNode) {
    if (node.name === 'label') {
        const input = find(node, n => (n.name === 'input' || n.name === 'textarea'));
        if (input) {
            // Remove empty `for` attribute
            if (node.attributes) {
                node.attributes = node.attributes.filter(attr => {
                    return !(attr.name === 'for' && isEmptyAttribute(attr));
                });
            }

            // Remove empty `id` attribute
            if (input.attributes) {
                input.attributes = input.attributes.filter(attr => {
                    return !(attr.name === 'id' && isEmptyAttribute(attr));
                });
            }
        }
    }
}

function isEmptyAttribute(attr: AbbreviationAttribute) {
    if (!attr.value) {
        return true;
    }

    if (attr.value.length === 1) {
        const token = attr.value[0];
        if (token && typeof token !== 'string' && !token.name) {
            // Attribute contains field
            return true;
        }
    }

    return false;
}
