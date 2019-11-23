import { AbbreviationNode, Repeater } from '@emmetio/abbreviation';
import { Container } from '../utils';
import { Config } from '../../config';
import { resolveImplicitTag } from '../implicit-tag';
import latin from './latin.json';
import ru from './russian.json';
import sp from './spanish.json';

interface LoremVocabulary {
    common: string[];
    words: string[];
}

const vocabularies: { [lang: string]: LoremVocabulary } = { ru, sp, latin };
const reLorem = /^lorem([a-z]*)(\d*)(-\d*)?$/i;

export default function lorem(node: AbbreviationNode, ancestors: Container[], config: Config) {
    let m: RegExpMatchArray | null;
    if (node.name && (m = node.name.match(reLorem))) {
        const db: LoremVocabulary = vocabularies[m[1]] || vocabularies.latin;
        const minWordCount = m[2] ? Math.max(1, Number(m[2])) : 30;
        const maxWordCount = m[3] ? Math.max(minWordCount, Number(m[3].slice(1))) : minWordCount;
        const wordCount = rand(minWordCount, maxWordCount);
        const repeat = node.repeat || findRepeater(ancestors);

        node.name = node.attributes = void 0;
        node.value = [paragraph(db, wordCount, !repeat || repeat.value === 0)];

        if (node.repeat && ancestors.length > 1) {
            resolveImplicitTag(node, ancestors, config);
        }
    }
}

/**
 * Returns random integer between <code>from</code> and <code>to</code> values
 */
function rand(from: number, to: number): number {
    return Math.floor(Math.random() * (to - from) + from);
}

function sample(arr: string[], count: number): string[] {
    const len = arr.length;
    const iterations = Math.min(len, count);
    const result: string[] = [];

    while (result.length < iterations) {
        const str = arr[rand(0, len)];
        if (!result.includes(str)) {
            result.push(str);
        }
    }

    return result;
}

function choice(val: string): string {
    return val[rand(0, val.length - 1)];
}

function sentence(words: string[], end?: string): string {
    if (words.length) {
        words = [capitalize(words[0])].concat(words.slice(1));
    }

    return words.join(' ') + (end || choice('?!...')); // more dots than question marks
}

function capitalize(word: string): string {
    return word[0].toUpperCase() + word.slice(1);
}

/**
 * Insert commas at randomly selected words. This function modifies values
 * inside `words` array
 */
function insertCommas(words: string[]): string[] {
    if (words.length < 2) {
        return words;
    }

    words = words.slice();
    const len = words.length;
    const hasComma = /,$/;
    let totalCommas = 0;

    if (len > 3 && len <= 6) {
        totalCommas = rand(0, 1);
    } else if (len > 6 && len <= 12) {
        totalCommas = rand(0, 2);
    } else {
        totalCommas = rand(1, 4);
    }

    for (let i = 0, pos: number; i < totalCommas; i++) {
        pos = rand(0, len - 2);
        if (!hasComma.test(words[pos])) {
            words[pos] += ',';
        }
    }

    return words;
}

/**
 * Generate a paragraph of "Lorem ipsum" text
 * @param dict Words dictionary
 * @param wordCount Words count in paragraph
 * @param startWithCommon Should paragraph start with common "lorem ipsum" sentence.
 */
function paragraph(dict: LoremVocabulary, wordCount: number, startWithCommon: boolean): string {
    const result: string[] = [];
    let totalWords = 0;
    let words: string[];

    if (startWithCommon && dict.common) {
        words = dict.common.slice(0, wordCount);
        totalWords += words.length;
        result.push(sentence(insertCommas(words), '.'));
    }

    while (totalWords < wordCount) {
        words = sample(dict.words, Math.min(rand(2, 30), wordCount - totalWords));
        totalWords += words.length;
        result.push(sentence(insertCommas(words)));
    }

    return result.join(' ');
}

function findRepeater(ancestors: Container[]): Repeater | void {
    for (let i = ancestors.length - 1; i >= 0; i--) {
        const element = ancestors[i];
        if (element.type === 'AbbreviationNode' && element.repeat) {
            return element.repeat;
        }
    }
}
