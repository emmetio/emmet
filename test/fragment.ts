import {describe} from 'node:test';
import {strictEqual as equal} from 'node:assert';
import expand from '../src';

describe('frag', () => {
    equal(expand('frag'), '<></>');
});