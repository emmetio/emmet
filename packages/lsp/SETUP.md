# Emmet LSP Server Setup Guide

This guide will walk you through setting up the Emmet LSP server with real-time abbreviation tracking for Zed and other LSP-compatible editors.

## Quick Start

1. **Build the LSP Server**
   ```bash
   cd emmet/packages/lsp
   npm install
   npm run build
   ```

2. **Test the Server**
   ```bash
   npm run test
   ```

3. **Install Globally (Optional)**
   ```bash
   npm install -g .
   ```

## Zed Editor Integration

### Method 1: Using Zed Extensions (Recommended)

1. **Create Extension Directory**
   ```bash
   mkdir -p ~/.config/zed/extensions/emmet
   ```

2. **Copy Extension Configuration**
   ```bash
   cp extension.toml ~/.config/zed/extensions/emmet/
   ```

3. **Update Zed Settings**
   Add to `~/.config/zed/settings.json`:
   ```json
   {
     "languages": {
       "HTML": {
         "language_servers": ["emmet-lsp", "..."]
       },
       "CSS": {
         "language_servers": ["emmet-lsp", "..."]
       },
       "JavaScript": {
         "language_servers": ["emmet-lsp", "..."]
       },
       "TypeScript": {
         "language_servers": ["emmet-lsp", "..."]
       },
       "JSX": {
         "language_servers": ["emmet-lsp", "..."]
       },
       "TSX": {
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
           "enabled": true,
           "showExpandedPreview": true,
           "showSuggestionsAsSnippets": true,
           "showAbbreviationSuggestions": true,
           "triggerExpansionOnTab": true,
           "useNewEmmet": true,
           "optimizeStylesheetParsing": true
         }
       }
     },
     "emmet": {
       "enabled": true,
       "showExpandedPreview": true,
       "showSuggestionsAsSnippets": true,
       "triggerExpansionOnTab": true,
       "variables": {
         "lang": "en",
         "charset": "UTF-8"
       },
       "preferences": {
         "css.intUnit": "px",
         "css.floatUnit": "em",
         "output.selfClosingStyle": "html"
       }
     }
   }
   ```

### Method 2: Manual Configuration

If you prefer manual setup or the extension method doesn't work:

1. **Ensure Server is Available**
   ```bash
   # If installed globally
   which emmet-lsp

   # If running locally
   node /path/to/emmet/packages/lsp/dist/server.js --help
   ```

2. **Configure Zed Language Server**
   In `~/.config/zed/settings.json`:
   ```json
   {
     "lsp": {
       "emmet-lsp": {
         "binary": {
           "command": "/path/to/emmet/packages/lsp/dist/server.js",
           "arguments": ["--stdio"]
         }
       }
     }
   }
   ```

## VS Code Integration (Alternative)

While designed for Zed, you can also use this LSP server with VS Code:

1. **Install a generic LSP extension** like "LSP" by sublimelsp

2. **Configure in VS Code settings.json**:
   ```json
   {
     "lsp.emmet-lsp": {
       "command": ["emmet-lsp", "--stdio"],
       "filetypes": ["html", "css", "javascript", "typescript", "jsx", "tsx", "vue", "svelte"],
       "initialization_options": {
         "enabled": true,
         "showExpandedPreview": true,
         "showSuggestionsAsSnippets": true
       }
     }
   }
   ```

## Neovim Integration

For Neovim with built-in LSP:

```lua
-- In your init.lua or lsp configuration
local lspconfig = require('lspconfig')

local configs = require('lspconfig.configs')

-- Define emmet-lsp if not already defined
if not configs.emmet_lsp then
  configs.emmet_lsp = {
    default_config = {
      cmd = { 'emmet-lsp', '--stdio' },
      filetypes = { 'html', 'css', 'javascript', 'typescript', 'jsx', 'tsx', 'vue', 'svelte' },
      root_dir = lspconfig.util.root_pattern('.git', 'package.json'),
      settings = {},
      init_options = {
        enabled = true,
        showExpandedPreview = true,
        showSuggestionsAsSnippets = true,
        showAbbreviationSuggestions = true,
        triggerExpansionOnTab = true
      }
    }
  }
end

lspconfig.emmet_lsp.setup{}
```

## Testing the Setup

### 1. Create Test Files

**test.html**:
```html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
    <!-- Try typing: nav>ul>li*5>a -->
    
</body>
</html>
```

**test.css**:
```css
/* Try typing: m10+p5+w100p+h50vh */
.container {
    
}
```

**test.jsx**:
```jsx
import React from 'react';

const Component = () => {
    return (
        {/* Try typing: div.card>img+div.card-body>h4+p+button */}
        <div></div>
    );
};
```

### 2. Verify Real-time Tracking

1. Open a test file in your editor
2. Start typing an Emmet abbreviation (e.g., `div.container>ul>li*3`)
3. You should see:
   - Real-time diagnostics showing the abbreviation is detected
   - Completion suggestions as you type
   - Preview of expanded content
   - Code actions to expand the abbreviation

### 3. Test Key Features

- **Real-time tracking**: Abbreviations detected on every keystroke
- **Context awareness**: Only tracks in appropriate contexts (not in comments/strings)
- **Multi-language support**: Works across HTML, CSS, JSX, etc.
- **Live preview**: Shows expanded content before committing
- **Completion integration**: Suggestions appear in editor completions

## Configuration Options

### Basic Settings
```json
{
  "enabled": true,                      // Enable/disable the LSP
  "showExpandedPreview": true,          // Show preview in diagnostics
  "showSuggestionsAsSnippets": true,    // Show as snippets vs plain text
  "showAbbreviationSuggestions": true,  // Show completion suggestions
  "triggerExpansionOnTab": true         // Allow Tab key expansion
}
```

### Advanced Settings
```json
{
  "variables": {
    "lang": "en",
    "locale": "en-US",
    "charset": "UTF-8"
  },
  "preferences": {
    "css.intUnit": "px",
    "css.floatUnit": "em",
    "output.selfClosingStyle": "html",
    "output.tagCase": "lower",
    "output.attributeCase": "lower",
    "markup.href": true,
    "comment.enabled": false
  },
  "excludeLanguages": ["markdown", "plaintext"]
}
```

## Troubleshooting

### Server Not Starting
```bash
# Check if Node.js is available
node --version

# Test server manually
cd emmet/packages/lsp
npm run build
node dist/server.js --stdio
# Should wait for input (Ctrl+C to exit)
```

### No Completions Showing
1. Check editor LSP logs
2. Verify file language is supported
3. Ensure cursor is not in comments or strings
4. Try typing a longer abbreviation (minimum 2 characters)

### Performance Issues
1. Increase debounce delay in server settings
2. Disable preview for large files
3. Check if multiple LSP servers are conflicting

### Debug Mode
```bash
# Run with verbose logging
emmet-lsp --stdio --verbose

# Or set environment variable
DEBUG=emmet-lsp emmet-lsp --stdio
```

### Getting Help
```bash
# Check server version and options
emmet-lsp --help

# Run test suite
npm run test

# Get tracking statistics
# (Available via LSP request: emmet/getTrackingStats)
```

## Development Setup

If you want to contribute or modify the server:

### 1. Clone and Setup
```bash
git clone https://github.com/emmetio/emmet.git
cd emmet
npm install

# The server imports the root `emmet` package, so build the monorepo once
npm run build:full
```

### 2. Development Workflow
```bash
cd packages/lsp

# Build and watch for changes
npm run build:watch

# Run the test suite (unit + protocol tests, straight from TypeScript sources)
npm run test

# Lint code
npm run lint
npm run lint:fix
```

### 3. Project Structure
```
src/
├── server.ts              # Main LSP server
├── types.ts               # TypeScript definitions  
├── abbreviation-tracker.ts # Real-time tracking logic
├── completion-provider.ts  # Completion suggestions
└── utils/                 # Utility functions

examples/                  # Example files for testing
scripts/                   # Build and test scripts
```

## Support

- **Issues**: [GitHub Issues](https://github.com/emmetio/emmet/issues)
- **Documentation**: [Emmet.io](https://emmet.io)
- **Community**: [Emmet Discord](https://discord.gg/emmet) (if available)

## License

MIT License - see [LICENSE](../../LICENSE) for details.