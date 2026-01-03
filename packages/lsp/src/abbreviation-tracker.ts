import { Position, TextDocument } from 'vscode-languageserver-textdocument';
import { extract } from '../../..';
import { AbbreviationTracker, DocumentTrackingState } from './types';
import {
    MIN_ABBREVIATION_LENGTH,
    getEmmetSyntax,
    getLineText,
    getSyntaxFamily,
    isEmmetLanguage
} from './language';
import { isInsideCommentOrString } from './syntax-context';

const DEFAULT_DEBOUNCE_DELAY = 150;

/**
 * Tracks the abbreviation under the cursor of every open document
 */
export class AbbreviationTrackerService {
    private documentStates = new Map<string, DocumentTrackingState>();
    private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private readonly debounceDelay: number;

    constructor(debounceDelay: number = DEFAULT_DEBOUNCE_DELAY) {
        this.debounceDelay = debounceDelay;
    }

    /**
     * Initialize tracking for a document
     */
    initializeDocument(documentUri: string): void {
        if (!this.documentStates.has(documentUri)) {
            this.documentStates.set(documentUri, { tracker: null });
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
        this.initializeDocument(documentUri);
        this.documentStates.get(documentUri)!.cursorPosition = position;
    }

    /**
     * Track the abbreviation under the cursor with debounced updates. Without an
     * explicit position the last cursor position reported by the client is used
     */
    trackAbbreviations(
        document: TextDocument,
        position?: Position,
        callback?: (tracker: AbbreviationTracker | null) => void
    ): void {
        const uri = document.uri;
        this.initializeDocument(uri);

        const existingTimer = this.debounceTimers.get(uri);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => {
            this.debounceTimers.delete(uri);

            const tracker = this.extractAbbreviation(document, position);
            const state = this.documentStates.get(uri);
            if (state) {
                state.tracker = tracker;
            }

            if (callback) {
                callback(tracker);
            }
        }, this.debounceDelay);

        // Debounced tracking should never keep the process alive on its own
        timer.unref();
        this.debounceTimers.set(uri, timer);
    }

    /**
     * Get the current abbreviation tracker for a document
     */
    getCurrentTracker(documentUri: string): AbbreviationTracker | null {
        return this.documentStates.get(documentUri)?.tracker ?? null;
    }

    /**
     * Extract the abbreviation at the cursor position
     */
    private extractAbbreviation(
        document: TextDocument,
        position?: Position
    ): AbbreviationTracker | null {
        if (!isEmmetLanguage(document.languageId)) {
            return null;
        }

        const cursor = this.resolveCursorPosition(document, position);
        if (!cursor) {
            return null;
        }

        const line = getLineText(document, cursor.line);

        if (isInsideCommentOrString(line, cursor.character, getSyntaxFamily(document.languageId))) {
            return null;
        }

        const extracted = extract(line, cursor.character, {
            type: getEmmetSyntax(document.languageId),
            lookAhead: true,
            prefix: ''
        });

        if (!extracted || extracted.abbreviation.length < MIN_ABBREVIATION_LENGTH) {
            return null;
        }

        return {
            abbreviation: extracted.abbreviation,
            range: {
                start: { line: cursor.line, character: extracted.start },
                end: { line: cursor.line, character: extracted.end }
            },
            documentUri: document.uri
        };
    }

    /**
     * Position to extract at: the requested one or the last cursor position
     * reported by the client. A position the document no longer has is dropped
     * rather than guessed — there’s nothing to track until the client tells us
     * where the cursor is
     */
    private resolveCursorPosition(document: TextDocument, position?: Position): Position | null {
        const cursor = position ?? this.documentStates.get(document.uri)?.cursorPosition;

        if (!cursor || cursor.line >= document.lineCount) {
            return null;
        }

        return cursor.character <= getLineText(document, cursor.line).length
            ? cursor
            : null;
    }

    /**
     * Get statistics for debugging
     */
    getStats(): {
        documentsTracked: number;
        activeTrackers: number;
        activeTimers: number;
    } {
        let activeTrackers = 0;
        for (const state of this.documentStates.values()) {
            if (state.tracker) {
                activeTrackers++;
            }
        }

        return {
            documentsTracked: this.documentStates.size,
            activeTrackers,
            activeTimers: this.debounceTimers.size
        };
    }
}
