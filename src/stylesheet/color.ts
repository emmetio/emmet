import { ColorValue } from '@emmetio/css-abbreviation';

export default function color(token: ColorValue, shortHex?: boolean): string {
    if (!token.r && !token.g && !token.b && !token.a) {
        return 'transparent';
    } else if (token.a === 1) {
        return asHex(token, shortHex);
    }

    return asRGB(token);
}

/**
 * Output given color as hex value
 * @param short Produce short value (e.g. #fff instead of #ffffff), if possible
 */
export function asHex(token: ColorValue, short?: boolean): string {
    const fn = (short && isShortHex(token.r) && isShortHex(token.g) && isShortHex(token.b))
        ? toShortHex : toHex;

    return '#' + fn(token.r) + fn(token.g) + fn(token.b);
}

/**
 * Output current color as `rgba?(...)` CSS color
 */
function asRGB(token: ColorValue): string {
    const values: Array<string | number> = [token.r, token.g, token.b];
    if (token.a !== 1) {
        values.push(frac(token.a, 8));
    }

    return `${values.length === 3 ? 'rgb' : 'rgba'}(${values.join(', ')})`;
}

export function frac(num: number, digits = 4): string {
    return num.toFixed(digits).replace(/\.?0+$/, '');
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
