import { StringValue, NumberValue, ColorValue, Literal, AllTokens, Bracket, WhiteSpace, Operator, OperatorType } from '../tokenizer/tokens';
import { TokenScanner, readable, peek, consume, error } from './TokenScanner';

export type Value = StringValue | NumberValue | ColorValue | Literal | FunctionCall;

export interface FunctionCall {
    type: 'FunctionCall';
    name: string;
    arguments: CSSValue[];
}

export interface CSSValue {
    type: 'CSSValue';
    value: Value[];
}

export interface CSSProperty {
    name?: string;
    value: Value[];
    important: boolean;
}

interface ParseOptions {
    /** Consumes given abbreviation tokens as value */
    value?: boolean;
}

export function parse(tokens: AllTokens[]): CSSProperty[] {

}

function consumeValue(scanner: TokenScanner): Value[] | undefined {
    const result: Value[] = [];
    let token: AllTokens | undefined;

    while (readable(scanner)) {
        token = peek(scanner);
        if (isLiteral(token)) {
            scanner.pos++;

            // Could be a keyword or a function call
            const args = consumeArguments(scanner);
            if (args) {
                result.push({
                    type: 'FunctionCall',
                    name: token.value,
                    arguments: args
                } as FunctionCall);
            } else {
                result.push(token);
            }
        } else if (token.type === 'StringValue' || token.type === 'ColorValue' || token.type === 'NumberValue') {
            scanner.pos++;
            result.push(token);
        } else if (isValueDelimiter(token)) {
            scanner.pos++;
        } else {
            break;
        }
    }

    return result.length ? result : void 0;
}

function consumeArguments(scanner: TokenScanner): CSSValue[] | undefined {
    const start = scanner.pos;
    if (consume(scanner, isOpenBracket)) {
        const args: CSSValue[] = [];
        let value: Value[] | undefined;

        while (readable(scanner) && !consume(scanner, isCloseBracket)) {
            if (value = consumeValue(scanner)) {
                args.push({ type: 'CSSValue', value });
            } else if (!consume(scanner, isWhiteSpace) && !consume(scanner, isArgumentDelimiter)) {
                throw error(scanner, 'Unexpected token');
            }
        }

        scanner.start = start;
        return args;
    }

}

function isLiteral(token?: AllTokens): token is Literal {
    return token && token.type === 'Literal';
}

function isBracket(token?: AllTokens, open?: boolean): token is Bracket {
    return token && token.type === 'Bracket' && (open == null || token.open === open);
}

function isOpenBracket(token?: AllTokens) {
    return isBracket(token, true);
}

function isCloseBracket(token?: AllTokens) {
    return isBracket(token, false);
}

function isWhiteSpace(token?: AllTokens): token is WhiteSpace {
    return token && token.type === 'WhiteSpace';
}

function isOperator(token?: AllTokens, operator?: OperatorType): token is Operator {
    return token && token.type === 'Operator' && (!operator || token.operator === operator);
}

function isArgumentDelimiter(token?: AllTokens) {
    return isOperator(token, OperatorType.ArgumentDelimiter)
}

function isValueDelimiter(token: AllTokens): boolean {
    return isWhiteSpace(token)
        || isOperator(token, OperatorType.PropertyDelimiter)
        || isOperator(token, OperatorType.ValueDelimiter);
}
