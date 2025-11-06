import { Position, TextDocument } from 'vscode-languageserver-textdocument';
import { extract, type ExtractedAbbreviation, type ExtractOptions } from '../../..';
import { AbbreviationTracker, DocumentTrackingState, EmmetSyntax, SupportedLanguage, LANGUAGE_CONFIG_MAP } from './types';

/**
 * Utility class for tracking Emmet abbreviations in real-time
 */
export class AbbreviationTrackerService {
    private documentStates = new Map<string, DocumentTrackingState>();
    private debounceTimers = new Map<string, NodeJS.Timeout>();
    private readonly debounceDelay: number;

    constructor(debounceDelay: number = 150) {
        this.debounceDelay = debounceDelay;
    }

    /**
     * Initialize tracking for a document
     */
    initializeDocument(documentUri: string): void {
        if (!this.documentStates.has(documentUri)) {
            this.documentStates.set(documentUri, {
                abbreviations: new Map(),
                lastChangeTime: Date.now()
            });
        }
    }

    /**
     * Clean up tracking for a closed document
     */
    closeDocument(documentUri: string): void {
        this.documentStates.delete(documentUri);
        const timer = this.debounceTimers.get(documentUri);
        if (timer) {
            clearTimeout(timer);
            this.debounceTimers.delete(documentUri);
        }
    }

    /**
     * Update cursor position for a document
     */
    updateCursorPosition(documentUri: string, position: Position): void {
        const state = this.documentStates.get(documentUri);
        if (state) {
            state.cursorPosition = position;
        }
    }

    /**
     * Track abbreviations in a document with debounced updates
     */
    trackAbbreviations(
        document: TextDocument,
        position?: Position,
        callback?: (tracker: AbbreviationTracker | null) => void
    ): void {
        const uri = document.uri;
        this.initializeDocument(uri);

        // Clear existing timer
        const existingTimer = this.debounceTimers.get(uri);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new debounced timer
        const timer = setTimeout(() => {
            const tracker = this.extractAbbreviationAtPosition(document, position);
            this.updateDocumentState(uri, tracker);

            if (callback) {
                callback(tracker);
            }

            this.debounceTimers.delete(uri);
        }, this.debounceDelay);

        this.debounceTimers.set(uri, timer);
    }

    /**
     * Get the current abbreviation tracker for a document
     */
    getCurrentTracker(documentUri: string): AbbreviationTracker | null {
        const state = this.documentStates.get(documentUri);
        if (!state || state.abbreviations.size === 0) {
            return null;
        }

        // Return the most recent abbreviation
        let latestTracker: AbbreviationTracker | null = null;
        let latestTime = 0;

        for (const tracker of state.abbreviations.values()) {
            if (tracker.lastUpdated > latestTime) {
                latestTime = tracker.lastUpdated;
                latestTracker = tracker;
            }
        }

        return latestTracker;
    }

    /**
     * Get all abbreviations for a document
     */
    getDocumentAbbreviations(documentUri: string): AbbreviationTracker[] {
        const state = this.documentStates.get(documentUri);
        return state ? Array.from(state.abbreviations.values()) : [];
    }

    /**
     * Extract abbreviation at a specific position in the document
     */
    private extractAbbreviationAtPosition(
        document: TextDocument,
        position?: Position
    ): AbbreviationTracker | null {
        if (!this.isEmmetLanguage(document.languageId)) {
            return null;
        }

        const currentPosition = position || this.getCursorPosition(document);
        const line = this.getLineText(document, currentPosition.line);
        const syntax = this.getEmmetSyntax(document.languageId);

        const extracted = this.extractFromLine(line, currentPosition.character, syntax);

        if (!extracted || extracted.abbreviation.length < 2) {
            return null;
        }

        const tracker: AbbreviationTracker = {
            abbreviation: extracted.abbreviation,
            position: currentPosition,
            range: {
                start: {
                    line: currentPosition.line,
                    character: extracted.start
                },
                end: {
                    line: currentPosition.line,
                    character: extracted.end
                }
            },
            expanded: '',
            isValid: false,
            lastUpdated: Date.now(),
            documentUri: document.uri
        };

        return tracker;
    }

    /**
     * Extract abbreviation from a line of text
     */
    private extractFromLine(
        line: string,
        position: number,
        syntax: EmmetSyntax
    ): ExtractedAbbreviation | undefined {
        const options: ExtractOptions = {
            type: syntax,
            lookAhead: true,
            prefix: ''
        };

        return extract(line, position, options);
    }

    /**
     * Update document state with new tracker
     */
    private updateDocumentState(documentUri: string, tracker: AbbreviationTracker | null): void {
        const state = this.documentStates.get(documentUri);
        if (!state) {
            return;
        }

        state.lastChangeTime = Date.now();

        if (tracker) {
            const key = `${tracker.position.line}:${tracker.position.character}`;
            state.abbreviations.set(key, tracker);

            // Clean up old abbreviations (keep only the last 10)
            if (state.abbreviations.size > 10) {
                const entries = Array.from(state.abbreviations.entries());
                entries.sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);

                // Remove the oldest entries
                for (let i = 0; i < entries.length - 10; i++) {
                    state.abbreviations.delete(entries[i]![0]);
                }
            }
        }
    }

    /**
     * Get current cursor position (fallback to end of document)
     */
    private getCursorPosition(document: TextDocument): Position {
        const state = this.documentStates.get(document.uri);
        if (state?.cursorPosition) {
            return state.cursorPosition;
        }

        // Fallback: return end of last line
        const lineCount = document.lineCount;
        const lastLine = document.getText({
            start: { line: lineCount - 1, character: 0 },
            end: { line: lineCount, character: 0 }
        }).replace(/\n$/, '');

        return {
            line: lineCount - 1,
            character: lastLine.length
        };
    }

    /**
     * Get text content of a specific line
     */
    private getLineText(document: TextDocument, lineNumber: number): string {
        return document.getText({
            start: { line: lineNumber, character: 0 },
            end: { line: lineNumber + 1, character: 0 }
        }).replace(/\n$/, '');
    }

    /**
     * Check if language is supported by Emmet
     */
    private isEmmetLanguage(languageId: string): languageId is SupportedLanguage {
        return languageId in LANGUAGE_CONFIG_MAP;
    }

    /**
     * Get Emmet syntax type for language
     */
    private getEmmetSyntax(languageId: string): EmmetSyntax {
        const config = LANGUAGE_CONFIG_MAP[languageId as SupportedLanguage];
        return config ? config.syntax : 'markup';
    }

    /**
     * Check if abbreviation tracking is enabled for a position
     */
    isTrackingEnabled(document: TextDocument, position: Position): boolean {
        if (!this.isEmmetLanguage(document.languageId)) {
            return false;
        }

        const line = this.getLineText(document, position.line);

        // Don't track inside comments
        if (this.isInsideComment(line, position.character, document.languageId)) {
            return false;
        }

        // Don't track inside strings (basic detection)
        if (this.isInsideString(line, position.character)) {
            return false;
        }

        return true;
    }

    /**
     * Basic comment detection
     */
    private isInsideComment(line: string, position: number, languageId: string): boolean {
        const beforeCursor = line.substring(0, position);

        // HTML/XML style comments
        if (['html', 'xml', 'vue', 'svelte'].includes(languageId)) {
            const commentStart = beforeCursor.lastIndexOf('<!--');
            const commentEnd = beforeCursor.lastIndexOf('-->');
            return commentStart > commentEnd;
        }

        // CSS style comments
        if (['css', 'scss', 'sass', 'less', 'stylus'].includes(languageId)) {
            const commentStart = beforeCursor.lastIndexOf('/*');
            const commentEnd = beforeCursor.lastIndexOf('*/');
            return commentStart > commentEnd;
        }

        // JavaScript style comments
        if (['javascript', 'typescript', 'jsx', 'tsx', 'javascriptreact', 'typescriptreact'].includes(languageId)) {
            // Single line comment
            if (beforeCursor.includes('//')) {
                return true;
            }
            // Multi line comment
            const commentStart = beforeCursor.lastIndexOf('/*');
            const commentEnd = beforeCursor.lastIndexOf('*/');
            return commentStart > commentEnd;
        }

        return false;
    }

    /**
     * Basic string detection
     */
    private isInsideString(line: string, position: number): boolean {
        const beforeCursor = line.substring(0, position);

        // Count quotes to determine if we're inside a string
        const singleQuotes = (beforeCursor.match(/'/g) || []).length;
        const doubleQuotes = (beforeCursor.match(/"/g) || []).length;
        const backticks = (beforeCursor.match(/`/g) || []).length;

        return (singleQuotes % 2 === 1) || (doubleQuotes % 2 === 1) || (backticks % 2 === 1);
    }

    /**
     * Get statistics for debugging
     */
    getStats(): {
        documentsTracked: number;
        totalAbbreviations: number;
        activeTimers: number;
    } {
        let totalAbbreviations = 0;
        for (const state of this.documentStates.values()) {
            totalAbbreviations += state.abbreviations.size;
        }

        return {
            documentsTracked: this.documentStates.size,
            totalAbbreviations,
            activeTimers: this.debounceTimers.size
        };
    }
}

/**
 * Singleton instance for global use
 */
export const abbreviationTracker = new AbbreviationTrackerService();
