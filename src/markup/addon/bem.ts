import { AbbreviationNode, Value } from '@emmetio/abbreviation';
import { Container } from '../utils';
import { Config, AbbreviationContext } from '../../config';

interface BEMAbbreviationNode extends AbbreviationNode {
    _bem?: BEMData;
}

interface BEMAbbreviationContext extends AbbreviationContext {
    _bem?: BEMData;
}

interface BEMData {
    classNames: string[];
    block?: string ;
}

const reElement = /^(-+)([a-z0-9]+[a-z0-9-]*)/i;
const reModifier = /^(_+)([a-z0-9]+[a-z0-9-_]*)/i;
const blockCandidates1 = (className: string) => /^[a-z]\-/i.test(className);
const blockCandidates2 = (className: string) => /^[a-z]/i.test(className);

export default function bem(node: AbbreviationNode, ancestors: Container[], config: Config) {
    expandClassNames(node);
    expandShortNotation(node, ancestors, config);
}

/**
 * Expands existing class names in BEM notation in given `node`.
 * For example, if node contains `b__el_mod` class name, this method ensures
 * that element contains `b__el` class as well
 */
function expandClassNames(node: BEMAbbreviationNode) {
    const data = getBEMData(node);

    const classNames: string[] = [];
    for (const cl of data.classNames) {
        // remove all modifiers and element prefixes from class name to get a base element name
        const ix = cl.indexOf('_');
        if (ix > 0 && !cl.startsWith('-')) {
            classNames.push(cl.slice(0, ix));
            classNames.push(cl.slice(ix));
        } else {
            classNames.push(cl);
        }
    }

    if (classNames.length) {
        data.classNames = classNames.filter(uniqueClass);
        data.block = findBlockName(data.classNames);
        updateClass(node, data.classNames.join(' '));
    }
}

/**
 * Expands short BEM notation, e.g. `-element` and `_modifier`
 */
function expandShortNotation(node: BEMAbbreviationNode, ancestors: Container[], config: Config) {
    const data = getBEMData(node);
    const classNames: string[] = [];
    const { options } = config;
    const path = ancestors.slice(1).concat(node) as BEMAbbreviationNode[];

    for (let cl of data.classNames) {
        let prefix: string = '';
        let m: RegExpMatchArray | null;
        const originalClass = cl;

        // parse element definition (could be only one)
        if (m = cl.match(reElement)) {
            prefix = getBlockName(path, m[1].length, config.context) + options['bem.element'] + m[2];
            classNames.push(prefix);
            cl = cl.slice(m[0].length);
        }

        // parse modifiers definitions
        if (m = cl.match(reModifier)) {
            if (!prefix) {
                prefix = getBlockName(path, m[1].length);
                classNames.push(prefix);
            }

            classNames.push(`${prefix}${options['bem.modifier']}${m[2]}`);
            cl = cl.slice(m[0].length);
        }

        if (cl === originalClass) {
            // class name wasn’t modified: it’s not a BEM-specific class,
            // add it as-is into output
            classNames.push(originalClass);
        }
    }

    const arrClassNames = classNames.filter(uniqueClass);
    if (arrClassNames.length) {
        updateClass(node, arrClassNames.join(' '));
    }
}

/**
 * Returns BEM data from given abbreviation node
 */
function getBEMData(node: BEMAbbreviationNode): BEMData {
    if (!node._bem) {
        let classValue = '';
        if (node.attributes) {
            for (const attr of node.attributes) {
                if (attr.name === 'class' && attr.value) {
                    classValue = stringifyValue(attr.value);
                    break;
                }
            }
        }

        node._bem = parseBEM(classValue);
    }

    return node._bem;
}

function getBEMDataFromContext(context: BEMAbbreviationContext) {
    if (!context._bem) {
        context._bem = parseBEM(context.attributes && context.attributes.class || '');
    }

    return context._bem;
}

/**
 * Parses BEM data from given class name
 */
function parseBEM(classValue?: string): BEMData {
    const classNames = classValue ? classValue.split(/\s+/) : [];
    return {
        classNames,
        block: findBlockName(classNames)
    };
}

/**
 * Returns block name for given `node` by `prefix`, which tells the depth of
 * of parent node lookup
 */
function getBlockName(ancestors: BEMAbbreviationNode[], depth: number = 0, context?: BEMAbbreviationContext): string {
    const maxParentIx = 0;
    let parentIx = Math.max(ancestors.length - depth, maxParentIx);
    do {
        const parent = ancestors[parentIx];
        if (parent) {
            const data = getBEMData(parent as BEMAbbreviationNode);
            if (data.block) {
                return data.block;
            }
        }
    } while (maxParentIx < parentIx--);

    if (context) {
        const data = getBEMDataFromContext(context);
        if (data.block) {
            return data.block;
        }
    }

    return '';
}

function findBlockName(classNames: string[]): string | undefined {
    return find(classNames, blockCandidates1)
        || find(classNames, blockCandidates2)
        || void 0;
}

/**
 * Finds class name from given list which may be used as block name
 */
function find(classNames: string[], filter: (className: string) => boolean): string | void {
    for (const cl of classNames) {
        if (reElement.test(cl) || reModifier.test(cl)) {
            break;
        }

        if (filter(cl)) {
            return cl;
        }
    }
}

function updateClass(node: AbbreviationNode, value: string) {
    for (const attr of node.attributes!) {
        if (attr.name === 'class') {
            attr.value = [value];
            break;
        }
    }
}

function stringifyValue(value: Value[]): string {
    let result = '';

    for (const t of value) {
        result += typeof t === 'string' ? t : t.name;
    }

    return result;
}

function uniqueClass<T>(item: T, ix: number, arr: T[]): boolean {
    return !!item && arr.indexOf(item) === ix;
}
