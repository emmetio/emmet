import { EMElement } from '@emmetio/abbreviation';
import { Container } from './walk';
import { ResolvedConfig } from '../types';
import { isElement } from './utils';

const elementMap: { [name: string]: string } = {
    p: 'span',
    ul: 'li',
    ol: 'li',
    table: 'tr',
    tr: 'td',
    tbody: 'tr',
    thead: 'tr',
    tfoot: 'tr',
    colgroup: 'col',
    select: 'option',
    optgroup: 'option',
    audio: 'source',
    video: 'source',
    object: 'param',
    map: 'area'
};

export default function implicitTag(node: EMElement, ancestors: Container[], config: ResolvedConfig) {
    if (!node.name && node.attributes.length) {
        const parent = getParentElement(ancestors);
        if (parent) {
            const parentName = (parent.name || '').toLowerCase();
            node.name = elementMap[parentName]
                || (config.profile.isInline(parentName) ? 'span' : 'div');
        }
    }
}

/**
 * Returns closest element node from given ancestors list
 */
function getParentElement(ancestors: Container[]): EMElement | undefined {
    for (let i = ancestors.length - 1; i >= 0; i--) {
        const elem = ancestors[i];
        if (isElement(elem)) {
            return elem;
        }
    }
}
