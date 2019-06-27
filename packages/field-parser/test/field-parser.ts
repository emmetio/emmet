import { equal, deepEqual } from 'assert';
import parse, { mark } from '../src';

describe('Field parser', () => {
    it('parse', () => {
        let model = parse('foo $0 ${1:bar} ${200}${1}');
        equal(model.value, 'foo  bar ');
        equal(model.fields.length, 4);
        deepEqual(model.fields[0], { index: 0, location: 4, placeholder: '' });
        deepEqual(model.fields[1], { index: 1, location: 5, placeholder: 'bar' });
        deepEqual(model.fields[2], { index: 200, location: 9, placeholder: '' });
        deepEqual(model.fields[3], { index: 1, location: 9, placeholder: '' });

        // skip non-fields and escaped fields
        model = parse('foo \\$0 ${bar} ${1f}');
        equal(model.value, 'foo \\$0 ${bar} ${1f}');
        equal(model.fields.length, 0);
    });

    it('mark', () => {
        const model = parse('foo $0 ${1:bar} ${200}${1}');
        equal(mark(model.value, model.fields), 'foo ${0} ${1:bar} ${200}${1}');

        // custom token
        const token = (index: number, placeholder: string) =>
            placeholder ? `[[${placeholder}:${index}]]` : `[[${index}]]`;
        equal(mark(model.value, model.fields, token), 'foo [[0]] [[bar:1]] [[200]][[1]]');

        // mark via model method
        equal(model.mark(), 'foo ${0} ${1:bar} ${200}${1}');
        equal(model.mark(token), 'foo [[0]] [[bar:1]] [[200]][[1]]');

        model.fields.forEach(field => field.index += 100);
        equal(model.mark(), 'foo ${100} ${101:bar} ${300}${101}');
    });
});
