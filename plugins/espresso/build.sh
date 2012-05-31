#!/bin/sh

# You don't have to use this particular script, but the following does need to happen:
# 
# 1) Zen JavaScript source needs to be concatenated with ZenEditor.js into a single file
# 2) File should be minimized somehow (we use YUICompressor for TEA)
# 3) File needs to be saved as ScriptLibraries/zen.js in final Sugar build
# 4) Contents/, Scripts/, ScriptLibraries/, and TextActions/ need to be copied into Sugar build (not shown in this script)

YUIPATH="/path/to/yuicompressor.jar"
cat ../../javascript/base64.js ../../javascript/zen_settings.js ../../javascript/zen_parser.js ../../javascript/zen_resources.js ../../javascript/zen_coding.js ../../javascript/html_matcher.js ../../javascript/zen_actions.js ../../javascript/parsers/actions.js ../../javascript/parsers/parserutils.js ../../javascript/parsers/parsexml.js ../../javascript/parsers/sex.js ../../javascript/parsers/traverse-actions.js ../../javascript/filters/comment.js ../../javascript/filters/css.js ../../javascript/filters/escape.js ../../javascript/filters/format-css.js ../../javascript/filters/format.js ../../javascript/filters/haml.js ../../javascript/filters/html.js ../../javascript/filters/single-line.js ../../javascript/filters/trim.js ../../javascript/filters/xsl.js ZenEditor.js | java -jar "$YUIPATH" -o ScriptLibraries/zen.js --type js

# Here you would copy the relevant folders/files into a ZenCoding.sugar package for distribution