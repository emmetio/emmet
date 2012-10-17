/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, emmet */
define(function (require, exports, module) {
	"use strict";

	var modeMap = {
		'text/html': 'html',
		'application/xml': 'xml',
		'text/xsl': 'xsl',
		'text/css': 'css',
		'text/x-less': 'less'
	};

	var emmet = require('emmet');

	$.extend(exports, {
		context: null,
		setupContext: function(context) {
			this.context = context;
			var indentation = '\t';
			if (!context.getOption('indentWithTabs')) {
				indentation = emmet.__r('utils').repeatString(' ', context.getOption('indentUnit'));
			}
			
			emmet.__r('resources').setVariable('indentation', indentation);
		},

		getSelectionRange: function() {
			var caretPos = this.getCaretPos();
			return {
				start: caretPos,
				end: caretPos + this.getSelection().length
			};
		},

		createSelection: function(start, end) {
			if (start == end) {
				this.context.setCursor(this.context.posFromIndex(start));
			} else {
				this.context.setSelection(this.context.posFromIndex(start), this.context.posFromIndex(end));
			}
		},

		getCurrentLineRange: function() {
			var caret = this.context.getCursor(true);
			return {
				start: this.context.indexFromPos({line: caret.line, ch: 0}),
				end:   this.context.indexFromPos({line: caret.line, ch: this.context.getLine(caret.line).length})
			};
		},

		getCaretPos: function(){
			return this.context.indexFromPos(this.context.getCursor(true));
		},

		setCaretPos: function(pos){
			this.createSelection(pos, pos);
		},

		getCurrentLine: function() {
			return this.context.getLine( this.context.getCursor(true).line ) || '';
		},

		replaceContent: function(value, start, end, noIndent) {
			var _ = emmet.__r('_');
			if (_.isUndefined(end)) 
				end = _.isUndefined(start) ? content.length : start;
			if (_.isUndefined(start)) start = 0;
			var utils = emmet.__r('utils');
			
			// indent new value
			if (!noIndent) {
				value = utils.padString(value, utils.getLinePaddingFromPosition(this.getContent(), start));
			}
			
			// find new caret position
			var tabstopData = emmet.__r('tabStops').extract(value, {
				escape: function(ch) {
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
			this.context.compoundChange(function() {
				that.context.replaceRange(value, that.context.posFromIndex(start), that.context.posFromIndex(end));
				that.createSelection(firstTabStop.start, firstTabStop.end);
			});
		},

		getContent: function(){
			return this.context.getValue();
		},

		getSyntax: function() {
			var syntax = this.context.getOption('mode');
			if (syntax in modeMap)
				syntax = modeMap[syntax];
			
			var caretPos = this.getCaretPos();

			if (!emmet.__r('resources').hasSyntax(syntax))
				syntax = 'html';

			if (syntax == 'html') {
				// get the context tag
				var pair = emmet.__r('html_matcher').getTags(this.getContent(), caretPos);
				if (pair && pair[0] && pair[0].type == 'tag' && pair[0].name.toLowerCase() == 'style') {
					// check that we're actually inside the tag
					if (pair[0].end <= caretPos && pair[1].start >= caretPos)
						syntax = 'css';
				}
			}

			return syntax;
		},

		/**
		 * Returns current output profile name (@see emmet#setupProfile)
		 * @return {String}
		 */
		getProfileName: function() {
			if (this.context.getOption('profile'))
				return this.context.getOption('profile');

			switch(this.getSyntax()) {
				 case 'xml':
				 case 'xsl':
					return 'xml';
				 case 'html':
					var profile = emmet.__r('resources').getVariable('profile');
					if (!profile) { // no forced profile, guess from content
						// html or xhtml?
						profile = this.getContent().search(/<!DOCTYPE[^>]+XHTML/i) != -1 ? 'xhtml': 'html';
					}

					return profile;
			}

			return 'xhtml';
		},

		/**
		 * Ask user to enter something
		 * @param {String} title Dialog title
		 * @return {String} Entered data
		 * @since 0.65
		 */
		prompt: function(title) {
			return prompt(title);
		},

		/**
		 * Returns current selection
		 * @return {String}
		 * @since 0.65
		 */
		getSelection: function() {
			return this.context.getSelection() || '';
		},

		/**
		 * Returns current editor's file path
		 * @return {String}
		 * @since 0.65 
		 */
		getFilePath: function() {
			return location.href;
		}
	});
});