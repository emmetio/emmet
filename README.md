# Emmet — the essential toolkit for web-developers

Emmet is a web-developer’s toolkit for boosting HTML & CSS code writing.

With Emmet, you can type expressions (_abbreviations_) similar to CSS selectors and convert them into code fragment with a single keystroke. For example, this abbreviation:

```
ul#nav>li.item$*4>a{Item $}
```

...can be expanded into:

```html
<ul id="nav">
    <li class="item1"><a href="">Item 1</a></li>
    <li class="item2"><a href="">Item 2</a></li>
    <li class="item3"><a href="">Item 3</a></li>
    <li class="item4"><a href="">Item 4</a></li>
</ul>
```

## Features

* **Familiar syntax**: as a web-developer, you already know how to use Emmet. Abbreviation syntax is similar to CSS Selectors with shortcuts for id, class, custom attributes, element nesting and so on.
* **Dynamic snippets**: unlike default editor snippets, Emmet abbreviations are dynamic and parsed as-you-type. No need to predefine them for each project, just type `MyComponent>custom-element` to convert any word into a tag.
* **CSS properties shortcuts**: Emmet provides special syntax for CSS properties with embedded values. For example, `bd1-s#f.5` will be exampled to `border: 1px solid rgba(255, 255, 255, 0.5)`.
* **Available for most popular syntaxes**: use single abbreviation to produce code for most popular syntaxes like HAML, Pug, JSX, SCSS, SASS etc.

[Read more about Emmet features](https://docs.emmet.io)

This repo contains only core module for parsing and expanding Emmet abbreviations. Editor plugins are available as [separate repos](https://github.com/emmetio).

This is a *monorepo*: top-level project contains all the code required for converting abbreviation into code fragment while [`./packages`](/packages) folder contains modules for parsing abbreviations into AST and can be used independently (for example, as lexer for syntax highlighting).

### Installation

You can install Emmet as a regular npm module:

```bash
npm i emmet@rc
```

Note that current version is still in *release candidate* version so it should be installed with `@rc` tag. After release, it will be available as version 2.x.

## Usage

To expand abbreviation, pass it to default function of `emmet` module:

```js
import expand from 'emmet';

console.log(expand('p>a')); // <p><a href=""></a></p>
```

By default, Emmet expands *markup* abbreviation, e.g. abbreviation used for producing nested elements with attributes (like HTML, XML, HAML etc.). If you want to expand *stylesheet* abbreviation, you should pass it as a `type` property of second argument:

```js
import expand from 'emmet';

console.log(expand('p10', { type: 'stylesheet' })); // padding: 10px;
```

A stylesheet abbreviation has slightly different syntax compared to markup one: it doesn’t support nesting and attributes but allows embedded values in element name.

Alternatively, Emmet supports *syntaxes* with predefined snippets and options:

```js
import expand from 'emmet';

console.log(expand('p10', { syntax: 'css' })); // padding: 10px;
console.log(expand('p10', { syntax: 'stylus' })); // padding 10px
```

Predefined syntaxes already have `type` attribute which describes whether given abbreviation is markup or stylesheet, but if you want to use it with your custom syntax name, you should provide `type` config option as well (default it `markup`):

```js
import expand from 'emmet';

console.log(expand('p10', {
    syntax: 'my-custom-syntax',
    type: 'stylesheet',
    options: {
        'stylesheet.between': '__',
        'stylesheet.after': '',
    }
})); // padding__10px
```

You can pass `options` property as well to shape-up final output or enable/disable various features. See [`src/config`](src/config) for more info and available options.
