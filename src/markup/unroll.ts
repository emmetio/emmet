import { EMStatement, EMGroup, EMRepeat } from '@emmetio/abbreviation';
import { Container } from './walk';
import { ResolvedConfig } from '../types';
import { clone, isGroup } from './utils';

export default function unroll(node: EMStatement, ancestors: Container[], config: ResolvedConfig) {
    let items: EMStatement[] = [];

    for (let child of node.items) {
        if (child.repeat) {
            const repeat: EMRepeat = {
                ...child.repeat,
                // If count is not defined, it’s an implicit repeater: use value from given text
                count: child.repeat.count
                    || (Array.isArray(config.text) ? config.text.length : 1)
            };
            // Repeat elements and remove groups
            for (let j = 0; j < repeat.count!; j++) {
                if (isGroup(child)) {
                    items = items.concat(ungroup(child, { ...repeat, value: j }));
                } else {
                    child = clone(child);
                    child.repeat = repeat;
                    items.push(child);
                }
            }
        } else {
            items.push(child);
        }
    }

    node.items = items;
}

/**
 * Returns contents of given group node with updated repeater, if not specified
 * in cloned node
 */
function ungroup(group: EMGroup, repeat: EMRepeat): EMStatement[] {
    const result: EMStatement[] = [];

    for (let child of group.items) {
        child = clone(child);
        if (!child.repeat) {
            child.repeat = repeat;
        }

        result.push(child);
    }

    return result;
}
