import { TextDocument } from 'vscode-languageserver-textdocument';
import { EmmetSyntax, LANGUAGE_CONFIG_MAP, SupportedLanguage, SyntaxFamily } from './types';

/** Shortest abbreviation worth tracking or suggesting */
export const MIN_ABBREVIATION_LENGTH = 2;

export function isEmmetLanguage(languageId: string): languageId is SupportedLanguage {
    return languageId in LANGUAGE_CONFIG_MAP;
}

export function getEmmetSyntax(languageId: string): EmmetSyntax {
    return getLanguageConfig(languageId)?.syntax ?? 'markup';
}

export function getSyntaxFamily(languageId: string): SyntaxFamily {
    return getLanguageConfig(languageId)?.family ?? 'html';
}

/** Text of a single document line, without the trailing line ending */
export function getLineText(document: TextDocument, lineNumber: number): string {
    return document.getText({
        start: { line: lineNumber, character: 0 },
        end: { line: lineNumber + 1, character: 0 }
    }).replace(/\r?\n$/, '');
}

function getLanguageConfig(languageId: string) {
    return isEmmetLanguage(languageId) ? LANGUAGE_CONFIG_MAP[languageId] : undefined;
}
