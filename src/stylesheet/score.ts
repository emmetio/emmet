/**
 * Calculates fuzzy match score of how close `abbr` matches given `string`.
 * @param abbr Abbreviation to score
 * @param str String to match
 * @return Match score
 */
export default function calculateScore(abbr: string, str: string): number {
    abbr = abbr.toLowerCase();
    str = str.toLowerCase();

    if (abbr === str) {
        return 1;
    }

    // a string MUST start with the same character as abbreviation
    if (!str || abbr.charCodeAt(0) !== str.charCodeAt(0)) {
        return 0;
    }

    const abbrLength = abbr.length;
    const stringLength = str.length;
    let i = 1;
    let j = 1;
    let score = stringLength;
    let ch1: number;
    let ch2: number;
    let found: boolean;
    let acronym: boolean;

    while (i < abbrLength) {
        ch1 = abbr.charCodeAt(i);
        found = false;
        acronym = false;

        while (j < stringLength) {
            ch2 = str.charCodeAt(j);

            if (ch1 === ch2) {
                found = true;
                score += (stringLength - j) * (acronym ? 2 : 1);
                break;
            }

            // add acronym bonus for exactly next match after unmatched `-`
            acronym = ch2 === 45 /* - */;
            j++;
        }

        if (!found) {
            break;
        }

        i++;
    }

    return score && score * (i / abbrLength) / sum(stringLength);
}

/**
 * Calculates sum of first `n` numbers, e.g. 1+2+3+...n
 */
function sum(n: number): number {
    return n * (n + 1) / 2;
}
