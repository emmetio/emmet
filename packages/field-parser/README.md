# Fields (tab-stops) parser

Parses snippet fields (aka *tab-stops*) like `${1:foo}` in given string and produces a model that contains clean string without fields and list of fields locations.

## Usage example

```js
import parse from '@emmetio/field-parser';

const fieldModel = parse('foo $0 ${1:bar} ${2}${1}');

console.log(fieldModel.string);
// outputs "foo  bar "

// `.fields` is array of `{index, location, length}` fields
console.log(fieldModel.fields);
// outputs:
// {index: 0, location: 4, length: 0}
// {index: 1, location: 5, length: 3}
// {index: 2, location: 9, length: 0}
// {index: 1, location: 9, length: 0}
```

You can also mark string with fields:

```js
import { mark } from '@emmetio/field-parser';

const marked = mark('foo bar', [
    {index: 1, location: 0, length: 3},
    {index: 5, location: 4, length: 3},
]);

console.log(marked); // ${1:foo} ${5:bar}
```

...or parse string and then use built-it `mark` method:

```js
import parse from '@emmetio/field-parser';

const fieldModel = parse('foo $0 ${1:bar} ${2}${1}');
fieldModel.forEach(field => field.index += 100);

console.log(fieldModel.mark()); // foo $100 ${101:bar} ${102}${101}
```
