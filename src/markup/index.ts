import abbreviation, { EMAbbreviation, EMElement, EMGroup, EMStatement, EMRepeat } from '@emmetio/abbreviation';
import { ResolvedConfig } from '../types';

type Container = EMAbbreviation | EMElement | EMGroup;

/**
 * Parses given Emmet abbreviation into a final abbreviation tree with all
 * required transformations applied
 */
export function parse(abbr: string | EMAbbreviation, config: ResolvedConfig): EMAbbreviation {
    if (typeof abbr === 'string') {
        abbr = abbreviation(abbr);
    }


    return parseAbbreviation(abbr)
        .use(resolveSnippets, config.snippets)
        .use(resolveVariables, config.variables)
        .use(transform, config.text, config.options);
}

/**
 * Rewrites given abbreviation, prepares it for output
 */
function prepare(abbr: EMAbbreviation): EMAbbreviation {


}

function updateNode<T extends EMStatement>(node: T): T {
    // Unroll repeated child elements
    const items = unroll(node.items);

}

/**
 * Unrolls given list of statements: duplicates repeated items and removes groups
 */
function unroll(items: EMStatement[]): EMStatement[] {
    // Unroll repeated child elements
    const result: EMStatement[] = [];

    for (let i = 0; i < items.length; i++) {
        const child = items[i];
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

    return result;
}

function addRepeaterValue(node: EMStatement, value: number): EMRepeat {
    if (node.repeat) {
        return {
            ...node.repeat,
            values: [value].concat(node.repeat.values)
        };
    }

    return { values: [value] };
}
