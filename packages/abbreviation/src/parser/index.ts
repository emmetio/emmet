import { Name, Value, Repeater, AllTokens, BracketType, Bracket, Operator, OperatorType } from '../tokenizer';
import { TokenScanner, peek, consume, end } from './TokenScanner';

export interface TokenAttribute {
    name?: Value[];
    value?: Value[];
}

export interface TokenElement {
    name?: Name[];
    attributes?: TokenAttribute[];
    value?: Value[];
    repeat?: Repeater;
    elements: TokenElement[];
}

export interface TokenGroup {
    elements: TokenElement[];
    repeat?: Repeater;
}

function attribute(scanner: TokenScanner): TokenAttribute[] | undefined {
    const attrs: TokenAttribute[] = [];
    const token = peek(scanner);
    if (isBracket(token, 'attribute') && token.open) {
        scanner.pos++;
        while (!end(scanner)) {

        }

    }

    return attrs;
}

function isBracket(token: AllTokens | undefined, context?: BracketType): token is Bracket {
    return token && token.type === 'Bracket' && (!context || token.context === context);
}

function isOperator(token: AllTokens | undefined, type?: OperatorType): token is Operator {
    return token && token.type === 'Operator' && (!type || token.operator === type);
}
