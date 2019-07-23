// import { equal, throws } from 'assert';
import parser from '../src/parser';
import tokenizer from '../src/tokenizer';
// import stringify from './assets/stringify';

const parse = (abbr: string) => parser(tokenizer(abbr));
const property = (abbr: string) => parse(abbr)[0];

describe('CSS Abbreviation parser', () => {
    it.only('basic', () => {
        console.log(property('p10!'));
    });
});
