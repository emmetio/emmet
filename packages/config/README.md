# Emmet config resolver

This module provides resolver for config that can be passed to [Emmet abbreviation expander](https://github.com/emmetio/expand-abbreviation) as `options` argument. The config may contain global, syntax- and project-specific preferences like output format or snippets and config resolver creates final options payload with proper preferences overrides.

## Config format

Config is a JSON file that contains global, syntax- and projects specific preferences. Currently, Emmet distinct two types of abbreviations: `markup` (for languages like HTML, XML, Slim etc.) and `stylesheet` (CSS, SASS, Less etc.), each of them has different settings and usage semantics. In order to globally configure all markup and/or stylesheet abbreviations, use `globals` key with `markup` and `stylesheet` subkeys accordingly:

```js
{
	"globals": {
		"markup": {
			"profile": {
				// Output all tags in uppercase
				"tagCase": "upper"
			},

			// Add custom snippets to all markup-based syntaxes
			"snippets": {
				"site-nav": "nav>ul.nav>li.nav-item"
			}
		},
		"stylesheet": {
			// Add custom snippets to all stylesheet-based syntaxes
			"snippets": {
				"black": "color: black"
			}
		}
	}
}
```

For available options, see [`types.d.ts`](./types.d.ts) file.

Sometimes you may want to add syntax-specific preferences. For example, you may want to customize SASS syntax with new snippets but don’t want to use them in CSS. In this case, you should use `syntax` key and a syntax name as a subkey:

```js
{
	"syntax": {
		"sass": {
			// In syntax-specific config, `type` must be either "markup" or "stylesheet"
			"type": "stylesheet",
			"snippets": {
				"inc": "@include"
			}
		}
	}
}
```

Contents of syntax-specific config is the same as global config.

You may also want to configure Emmet specifically for a project. Use "project" top-level key with project ID as a subkey:

```js
{
	"project": {
		"my-project1": {
			// Use `globals` and `syntax` sections as described above
			"globals": { ... },
			"syntax": { ... }
		}
	}
}
```

## Resolver API

Config resolver is a function that takes JSON config and params that identify current context: abbreviation type, syntax and project.

```js
import { expand } from '@emmetio/expand-abbreviation';
import resolveConfig from '@emmetio/config';

// Obtain config JSON somehow
const config = readFile('emmet-config.json');

// Identify current context
const params = {
	type: 'markup',
	syntax: 'html',
	project: 'my-project1'
};

const result = expand('ul>li', resolveConfig(config, params));

console.log(result);
```

Available context options:

* `type`: type of abbreviation, either `markup` or `stylesheet`.
* `syntax`: syntax name, a subkey of `syntax` section.
* `project`: ID of project, a subkey of `project` section.

Config resolver will create a final options payload for abbreviation expander, depending on context params.
