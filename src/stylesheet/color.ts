import Scanner, { isNumber, isAlpha } from '@emmetio/scanner';
import { CSSColor } from './ast';

const enum Chars {
    Hash = 35, // #
    Dot = 46, // .
    Transparent = 116, // t
}

/**
 * Consumes a color token from given string
 */
export default function consumeColor(stream: Scanner): CSSColor | undefined {
    // supported color variations:
    // #abc   → #aabbccc
    // #0     → #000000
    // #fff.5 → rgba(255, 255, 255, 0.5)
    // #t     → transparent
    if (stream.peek() === Chars.Hash) {
        const start = stream.start = stream.pos;
        stream.next();

        stream.eat(Chars.Transparent) || stream.eatWhile(isHex);
        const base = stream.current();

        // a hex color can be followed by `.num` alpha value
        stream.start = stream.pos;
        if (stream.eat(Chars.Dot) && !stream.eatWhile(isNumber)) {
            throw stream.error('Unexpected character for alpha value of color');
        }

        const alpha = stream.current();

        return {
            type: 'CSSColor',
            ...parseColor(base, alpha),
            raw: base + alpha,
            start,
            end: stream.pos
        };
    }
}

function parseColor(value: string, alpha?: string): { r: number, g: number, b: number, a: number } {
    let a = Number(alpha != null && alpha !== '' ? alpha : 1);
    value = value.slice(1); // remove #

    let r = '0';
    let g = '0';
    let b = '0';

    if (value === 't') {
        a = 0;
    } else {
        switch (value.length) {
            case 0:
                break;

            case 1:
                r = g = b = value + value;
                break;

            case 2:
                r = g = b = value;
                break;

            case 3:
                r = value[0] + value[0];
                g = value[1] + value[1];
                b = value[2] + value[2];
                break;

            default:
                value += value;
                r = value.slice(0, 2);
                g = value.slice(2, 4);
                b = value.slice(4, 6);
        }
    }

    return {
        r: parseInt(r, 16),
        g: parseInt(g, 16),
        b: parseInt(b, 16),
        a
    };
}

/**
 * Output given color as hex value
 * @param short Produce short value (e.g. #fff instead of #ffffff), if possible
 */
export function asHex(color: CSSColor, short?: boolean): string {
    const fn = (short && isShortHex(color.r) && isShortHex(color.g) && isShortHex(color.b))
        ? toShortHex : toHex;

    return '#' + fn(color.r) + fn(color.g) + fn(color.b);
}

/**
 * Output current color as `rgba?(...)` CSS color
 * @return {String}
 */
export function asRGB(color: CSSColor): string {
    const values: Array<string | number> = [color.r, color.g, color.b];
    if (color.a !== 1) {
        values.push(color.a.toFixed(8).replace(/\.?0+$/, ''));
    }

    return `${values.length === 3 ? 'rgb' : 'rgba'}(${values.join(', ')})`;
}

/**
 * Check if given code is a hex value (/0-9a-f/)
 */
function isHex(code: number): boolean {
    return isNumber(code) || isAlpha(code, 65, 70); // A-F
}

function isShortHex(hex: number): boolean {
    return !(hex % 17);
}

function toShortHex(num: number): string {
    return (num >> 4).toString(16);
}

function toHex(num: number): string {
    return pad(num.toString(16), 2);
}

function pad(value: string, len: number): string {
    while (value.length < len) {
        value = '0' + value;
    }
    return value;
}
