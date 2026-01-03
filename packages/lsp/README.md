# Emmet LSP Server

A Language Server Protocol implementation for Emmet that provides real-time abbreviation tracking and expansion for HTML, CSS, and other web languages. Designed specifically for integration with the Zed editor, but compatible with any LSP-supporting editor.

## Features

- **Real-time Abbreviation Tracking**: Tracks abbreviations as you type on every keystroke
- **Live Preview**: Shows expanded content in diagnostics and hover information
- **Context-aware Completions**: Intelligent suggestions based on cursor position and trigger characters
- **Multi-language Support**: HTML, XML, CSS, SCSS, Sass, Less, Stylus, JavaScript, TypeScript, JSX, TSX, Vue, Svelte
- **Customizable Configuration**: Extensive settings for preferences, variables, and syntax profiles
- **Code Actions**: Quick fixes to expand abbreviations and refactor code
- **Performance Optimized**: Debounced processing and efficient tracking algorithms

## Supported Languages

### Markup Languages
- HTML (`.html`, `.htm`)
- XML (`.xml`)
- XSL/XSLT (`.xsl`, `.xslt`)
- JSX (`.jsx`)
- TSX (`.tsx`)
- Vue (`.vue`)
- Svelte (`.svelte`)

### Stylesheet Languages
- CSS (`.css`)
- SCSS (`.scss`)
- Sass (`.sass`)
- Less (`.less`)
- Stylus (`.styl`, `.stylus`)

### JavaScript/TypeScript
- JavaScript (`.js`, `.mjs`)
- TypeScript (`.ts`)
- React JSX (`.jsx`)
- React TSX (`.tsx`)

## Installation

### For Zed Editor

1. Install the LSP server globally:
   ```bash
   cd packages/lsp
   npm install
   npm run build
   npm install -g .
   ```

2. Copy the extension configuration:
   ```bash
   cp extension.toml ~/.config/zed/extensions/emmet/extension.toml
   ```

3. Add to your Zed settings (`~/.config/zed/settings.json`):
   ```json
   {
     "languages": {
       "HTML": {
         "language_servers": ["emmet-lsp", "..."]
       },
       "CSS": {
         "language_servers": ["emmet-lsp", "..."]
       }
     },
     "lsp": {
       "emmet-lsp": {
         "binary": {
           "command": "emmet-lsp",
           "arguments": ["--stdio"]
         },
         "initialization_options": {
           "showExpandedPreview": true,
           "showSuggestionsAsSnippets": true,
           "triggerExpansionOnTab": true
         }
       }
     }
   }
   ```

### For Other Editors

The LSP server can be integrated with any editor that supports LSP. Use the following configuration:

- **Command**: `emmet-lsp`
- **Arguments**: `["--stdio"]`
- **Transport**: stdio
- **Languages**: html, xml, css, scss, sass, less, stylus, javascript, typescript, jsx, tsx, vue, svelte

## Usage

### Basic Abbreviation Expansion

1. Type an Emmet abbreviation (e.g., `div.container>ul>li*5`)
2. The LSP will track the abbreviation in real-time
3. See live preview in diagnostics or hover information
4. Expand using:
   - **Tab key** (if configured)
   - **Ctrl+E** (default keybinding)
   - **Completion suggestions** (Ctrl+Space)
   - **Code actions** (Ctrl+.)

### Examples

#### HTML
```html
<!-- Type: div.container>h1+p*3 -->
<div class="container">
    <h1></h1>
    <p></p>
    <p></p>
    <p></p>
</div>
```

#### CSS
```css
/* Type: m10+p5+w100p */
margin: 10px;
padding: 5px;
width: 100%;
```

#### JSX
```jsx
// Type: div.app>header+main>section.content*2
<div className="app">
    <header></header>
    <main>
        <section className="content"></section>
        <section className="content"></section>
    </main>
</div>
```

### Real-time Tracking Features

- **Keystroke Detection**: Abbreviations are detected as you type
- **Live Validation**: Invalid abbreviations are marked immediately
- **Context Awareness**: Only tracks in appropriate contexts (not in comments/strings)
- **Multi-cursor Support**: Tracks abbreviations at multiple positions
- **Debounced Processing**: Efficient handling of rapid typing

## Configuration

### LSP Initialization Options

```json
{
  "enabled": true,
  "showExpandedPreview": true,
  "showSuggestionsAsSnippets": true,
  "showAbbreviationSuggestions": true,
  "triggerExpansionOnTab": true,
  "useNewEmmet": true,
  "optimizeStylesheetParsing": true,
  "variables": {
    "lang": "en",
    "locale": "en-US",
    "charset": "UTF-8"
  },
  "preferences": {
    "css.intUnit": "px",
    "css.floatUnit": "em",
    "output.selfClosingStyle": "html",
    "output.tagCase": "",
    "output.attributeCase": "",
    "output.compactBoolean": false,
    "markup.href": true,
    "comment.enabled": false,
    "comment.trigger": ["id", "class"]
  },
  "syntaxProfiles": {
    "html": {
      "tag_case": "lower",
      "attr_case": "lower",
      "self_closing_tag": "xhtml"
    }
  },
  "excludeLanguages": ["markdown"],
  "extensionsPath": []
}
```

### Settings Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable Emmet LSP |
| `showExpandedPreview` | boolean | `true` | Show expanded preview in diagnostics |
| `showSuggestionsAsSnippets` | boolean | `true` | Show completions as snippets |
| `showAbbreviationSuggestions` | boolean | `true` | Show abbreviation completions |
| `triggerExpansionOnTab` | boolean | `true` | Allow Tab to expand abbreviations |
| `variables` | object | `{}` | Custom variables for expansions |
| `preferences` | object | `{}` | Emmet expansion preferences |
| `syntaxProfiles` | object | `{}` | Language-specific syntax profiles |
| `excludeLanguages` | array | `["markdown"]` | Languages to exclude |

## Commands and Code Actions

### Available Commands

- `emmet.expandAbbreviation` - Expand abbreviation at cursor
- `emmet.balanceOutward` - Select outer HTML tag
- `emmet.balanceInward` - Select inner HTML tag
- `emmet.wrapWithAbbreviation` - Wrap selection with abbreviation
- `emmet.toggleComment` - Toggle comment
- `emmet.evaluateMath` - Evaluate math expressions
- `emmet.removeTag` - Remove HTML tag
- `emmet.splitJoinTag` - Split/join HTML tag
- `emmet.goToNextEditPoint` - Go to next edit point
- `emmet.goToPreviousEditPoint` - Go to previous edit point

### Code Actions

- **Quick Fix**: Expand detected abbreviations
- **Refactor**: Wrap selection with abbreviation
- **Source**: Various source actions for code organization

## Trigger Characters

The LSP responds to specific trigger characters based on the language:

### Markup Languages (HTML, JSX, etc.)
`.`, `#`, `*`, `+`, `>`, `^`, `[`, `{`, `:`, `$`, `-`, `_`

### Stylesheet Languages (CSS, SCSS, etc.)
`:`, `-`, `!`, `@`, `%`, `^`, `+`, `*`, `&`

## Debugging and Troubleshooting

### Enable Debug Logging

Set the LSP server to verbose mode:
```bash
emmet-lsp --stdio --verbose
```

### Common Issues

1. **Abbreviations not detected**
   - Check if the file language is supported
   - Verify cursor is not inside comments or strings
   - Ensure abbreviation meets minimum length requirement (2 characters)

2. **Completions not showing**
   - Check `showAbbreviationSuggestions` setting
   - Verify trigger characters are configured correctly
   - Ensure LSP client supports completion requests

3. **Performance issues**
   - Increase debounce delay for slower systems
   - Disable preview for large files
   - Check `optimizeStylesheetParsing` setting

### Getting Statistics

Request tracking statistics for debugging:
```javascript
// LSP client request
connection.sendRequest('emmet/getTrackingStats')
```

Returns:
```json
{
  "documentsTracked": 5,
  "totalAbbreviations": 12,
  "activeTimers": 2
}
```

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch for changes
npm run watch

# Run tests
npm test

# Start development server
npm run dev
```

### Project Structure

```
src/
├── server.ts               # Main LSP server
├── types.ts                # Type definitions
├── abbreviation-tracker.ts # Real-time tracking logic
├── completion-provider.ts  # Completion item provider
├── syntax-context.ts       # Comment and string detection
├── language.ts             # Language, syntax and line helpers
└── config.ts               # Emmet config from user settings
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License. See [LICENSE](../../LICENSE) for details.

## Related Projects

- [Emmet](https://emmet.io/) - The main Emmet toolkit
- [VSCode Emmet](https://code.visualstudio.com/docs/editor/emmet) - VS Code integration
- [Zed Editor](https://zed.dev/) - High-performance code editor
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) - LSP specification

## Changelog

### v1.0.0
- Initial release
- Real-time abbreviation tracking
- Multi-language support
- Zed editor integration
- Comprehensive configuration options
- Context-aware completions
- Performance optimizations