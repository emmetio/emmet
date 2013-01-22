define(['./emmet'], function(emmet) {
	var require = emmet.require;
	var _ = require('_');
	
    var modeMap = {
        "text/html": "html",
        "application/xml": "xml",
        "text/xsl": "xsl",
        "text/css": "css",
        "text/x-less": "less"
    };

    return {
        context: null,
        filePath: null,
        setupContext: function (context, filePath) {
            this.context = context;
            this.filePath = filePath;
            var indentation = "\t";
            if (!context.getOption("indentWithTabs")) {
                indentation = require("utils").repeatString(" ", context.getOption("indentUnit"));
            }
            
            require("resources").setVariable("indentation", indentation);
        },

        getSelectionRange: function () {
            var caretPos = this.getCaretPos();
            return {
                start: caretPos,
                end: caretPos + this.getSelection().length
            };
        },

        createSelection: function (start, end) {
            if (start == end) {
                this.context.setCursor(this.context.posFromIndex(start));
            } else {
                this.context.setSelection(this.context.posFromIndex(start), this.context.posFromIndex(end));
            }
        },

        getCurrentLineRange: function () {
            var caret = this.context.getCursor(true);
            return {
                start: this.context.indexFromPos({line: caret.line, ch: 0}),
                end:   this.context.indexFromPos({line: caret.line, ch: this.context.getLine(caret.line).length})
            };
        },

        getCaretPos: function () {
            return this.context.indexFromPos(this.context.getCursor(true));
        },

        setCaretPos: function (pos) {
            this.createSelection(pos, pos);
        },

        getCurrentLine: function () {
            return this.context.getLine(this.context.getCursor(true).line) || "";
        },

        replaceContent: function (value, start, end, noIndent) {
            if (_.isUndefined(end)) 
                end = _.isUndefined(start) ? value.length : start;
            if (_.isUndefined(start)) start = 0;
            var utils = require("utils");
            
            // indent new value
            if (!noIndent) {
                value = utils.padString(value, utils.getLinePaddingFromPosition(this.getContent(), start));
            }
            
            // find new caret position
            var tabstopData = require("tabStops").extract(value, {
                escape: function (ch) {
                    return ch;
                }
            });
            value = tabstopData.text;
            var firstTabStop = tabstopData.tabstops[0];
            
            if (firstTabStop) {
                firstTabStop.start += start;
                firstTabStop.end += start;
            } else {
                firstTabStop = {
                    start: value.length + start,
                    end: value.length + start
                };
            }
                
            // do a compound change to record all changes into single undo event
            var that = this;
            this.context.compoundChange(function () {
                that.context.replaceRange(value, that.context.posFromIndex(start), that.context.posFromIndex(end));
                that.createSelection(firstTabStop.start, firstTabStop.end);
            });
        },

        getContent: function () {
            return this.context.getValue();
        },

        getSyntax: function () {
            var syntax = this.context.getOption("mode");
            if (syntax in modeMap)
                syntax = modeMap[syntax];
            
            return require('actionUtils').detectSyntax(this, syntax);
        },

        /**
         * Returns current output profile name (@see emmet#setupProfile)
         * @return {String}
         */
        getProfileName: function () {
            if (this.context.getOption("profile"))
                return this.context.getOption("profile");
            
            return require('actionUtils').detectProfile(this);
        },

        /**
         * Ask user to enter something
         * @param {String} title Dialog title
         * @return {String} Entered data
         * @since 0.65
         */
        prompt: function (title) {
            return prompt(title);
        },

        /**
         * Returns current selection
         * @return {String}
         * @since 0.65
         */
        getSelection: function () {
            return this.context.getSelection() || "";
        },

        /**
         * Returns current editor"s file path
         * @return {String}
         * @since 0.65 
         */
        getFilePath: function () {
            return this.filePath;
        }
    };
});