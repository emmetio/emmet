/**
 * Calculates how close `str1` matches `str2` using fuzzy match.
 * How matching works:
 * – first characters of both `str1` and `str2` *must* match
 * – `str1` length larger than `str2` length is allowed only when `unmatched` is true
 * – ideal match is when `str1` equals to `str2` (score: 1)
 * – next best match is `str2` starts with `str1` (score: 1 × percent of matched characters)
 * – other scores depend on how close characters of `str1` to the beginning of `str2`
 * @param partialMatch Allow length `str1` to be greater than `str2` length
 */
export default function scoreMatch(str1: string, str2: string, partialMatch = false) {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();

    if (str1 === str2) {
        return 1;
    }

    // Both strings MUST start with the same character
    if (!str1 || !str2 || str1.charCodeAt(0) !== str2.charCodeAt(0)) {
        return 0;
    }

    const str1Len = str1.length;
    const str2Len = str2.length;

    if (!partialMatch && str1Len > str2Len) {
        return 0;
    }

    // Characters from `str1` which are closer to the beginning of a `str2` should
    // have higher score.
    // For example, if `str2` is `abcde`, it’s max score is:
    // 5 + 4 + 3 + 2 + 1 = 15 (sum of character positions in reverse order)
    // Matching `abd` against `abcde` should produce:
    // 5 + 4 + 2 = 11
    // Acronym bonus for match right after `-`. Matching `abd` against `abc-de`
    // should produce:
    // 6 + 5 + 4 (use `d` position in `abd`, not in abc-de`)

    const minLength = Math.min(str1Len, str2Len);
    const maxLength = Math.max(str1Len, str2Len);
    let i = 1;
    let j = 1;
    let score = maxLength;
    let ch1 = 0;
    let ch2 = 0;
    let found = false;
    let acronym = false;

    while (i < str1Len) {
        ch1 = str1.charCodeAt(i);
        found = false;
        acronym = false;

        while (j < str2Len) {
            ch2 = str2.charCodeAt(j);

            if (ch1 === ch2) {
                found = true;
                score += maxLength - (acronym ? i : j);
                break;
            }

            // add acronym bonus for exactly next match after unmatched `-`
            acronym = ch2 === 45 /* - */;
            j++;
        }

        if (!found) {
            if (!partialMatch) {
                return 0;
            }
            break;
        }

        i++;
    }

    const matchRatio = i / maxLength;
    const delta = maxLength - minLength;
    const maxScore = sum(maxLength) - sum(delta);
    return (score * matchRatio) / maxScore;
}

/**
 * Calculates sum of first `n` numbers, e.g. 1+2+3+...n
 */
function sum(n: number): number {
    return n * (n + 1) / 2;
}
