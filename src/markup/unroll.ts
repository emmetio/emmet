import { EMStatement, EMRepeat } from '@emmetio/abbreviation';
import { Container } from './walk';

/**
 * Unroll repeated child elements
 */
export default function unroll<T extends Container>(node: T) {
    const items: EMStatement[] = [];

    for (let i = 0; i < node.items.length; i++) {
        const child = node.items[i];
        if (child.repeat && child.repeat.count) {
            for (let j = 0; j < child.repeat.count; j++) {
                const clone: EMStatement = {
                    ...child,
                    repeat: addRepeaterValue(child, j + 1)
                };

                if (clone.type === 'EMGroup') {
                    for (let k = 0; k < clone.items.length; k++) {
                        const child2 = clone.items[k];
                        items.push({
                            ...child2,
                            repeat: child2.repeat
                                ? addRepeaterValue(child2, clone.repeat!.values[0])
                                : { ...clone.repeat! } as EMRepeat
                        });
                    }
                } else {
                    items.push(clone);
                }
            }
        }
    }

    node.items = items;
}

function addRepeaterValue(node: EMStatement, value: number): EMRepeat {
    if (node.repeat) {
        return {
            ...node.repeat,
            values: [value, ...node.repeat.values]
        };
    }

    return { values: [value] };
}
