import { AbbreviationNode, Value } from '@emmetio/abbreviation';
import { pushString } from '../../output-stream';
import { CommentOptions } from '../../types';
import { HTMLWalkState } from './html';
import { WalkState } from './walk';
import { pushTokens } from './utils';

type TemplateToken = string | [string];

export interface CommentWalkState {
    enabled: boolean;
    trigger: string[];
    before?: TemplateToken[];
    after?: TemplateToken[];
}

export function createCommentState(options: CommentOptions): CommentWalkState {
    return {
        ...options,
        before: options.before ? tokenize(options.before) : void 0,
        after: options.after ? tokenize(options.after) : void 0
    };
}

/**
 * Adds comment prefix for given node, if required
 */
export function commentNodeBefore(node: AbbreviationNode, state: HTMLWalkState) {
    if (shouldComment(node, state) && state.comment.before) {
        output(node, state.comment.before, state);
    }
}

/**
 * Adds comment suffix for given node, if required
 */
export function commentNodeAfter(node: AbbreviationNode, state: HTMLWalkState) {
    if (shouldComment(node, state) && state.comment.after) {
        output(node, state.comment.after, state);
    }
}

/**
 * Check if given node should be commented
 */
function shouldComment(node: AbbreviationNode, state: HTMLWalkState): boolean {
    const { comment } = state;

    if (!comment.enabled || !comment.trigger || !node.name || !node.attributes) {
        return false;
    }

    for (const attr of node.attributes) {
        if (attr.name && comment.trigger.includes(attr.name)) {
            return true;
        }
    }

    return false;
}

/**
 * Splits given string into template tokens
 */
function tokenize(str: string): TemplateToken[] {
    const tokens: TemplateToken[] = [];

    let pos = 0;
    let start = 0;
    let stack = 0;
    let out = '';

    while (pos < str.length) {
        const code = str.charCodeAt(pos);
        if (code === 91 /* [ */) {
            if (++stack !== 1) {
                out += str[pos];
            }
            pos++;
        } else if (code === 93 /* ] */) {
            if (--stack !== 0) {
                out += str[pos];
            }
            pos++;
        } else if (isTokenStart(code)) {
            out && tokens.push(out);
            out = '';
            start = pos;

            while (isToken(str.charCodeAt(pos))) {
                pos++;
            }

            tokens.push([str.slice(start, pos)]);
        } else {
            out += str[pos++];
        }
    }

    out && tokens.push(out);
    return tokens;
}

/**
 * Pushes given template tokens into output stream
 */
function output(node: AbbreviationNode, tokens: TemplateToken[], state: WalkState) {
    const attrs: { [name: string]: Value[] } = {};
    const { out } = state;

    // Collect attributes payload
    for (const attr of node.attributes!) {
        if (attr.name && attr.value) {
            attrs[attr.name.toUpperCase()] = attr.value;
        }
    }

    // Output parsed tokens
    for (const token of tokens) {
        if (typeof token === 'string') {
            pushString(out, token);
        } else if (attrs[token[0]]) {
            pushTokens(attrs[token[0]], state);
        }
    }
}

function isTokenStart(code: number): boolean {
    return code >= 65 && code <= 90; // A-Z
}

function isToken(code: number): boolean {
    return isTokenStart(code)
        || (code > 47 && code < 58) /* 0-9 */
        || code === 95 /* _ */
        || code === 45 /* - */;
}
