import { equal } from 'assert';
import Scanner from '@emmetio/scanner';
import parseColor, { asHex, asRGB } from '../src/color';

function color(abbr: string, output?: 'hex' | 'shortHex' | 'rgb') {
    const c = parseColor(new Scanner(abbr))!;

    if (output === 'hex') {
        return asHex(c);
    }

    if (output === 'shortHex') {
        return asHex(c, true);
    }

    if (output === 'rgb') {
        return asRGB(c);
    }

    if (!c.r && !c.g && !c.b && !c.a) {
        return 'transparent';
    }
    return c.a === 1 ? asHex(c) : asRGB(c);
}

describe('Color value', () => {
    it('create', () => {
        equal(color('#0'), '#000000');
        equal(color('#123'), '#112233');
        equal(color('#ffcc00'), '#ffcc00');
        equal(color('#fc0.5'), 'rgba(255, 204, 0, 0.5)');
    });

    it('convert to hex', () => {
        equal(color('#123', 'hex'), '#112233');
        equal(color('#123', 'shortHex'), '#123');
        equal(color('#0', 'shortHex'), '#000');
        equal(color('#ffcc00', 'shortHex'), '#fc0');
    });

    it('convert to RGB', () => {
        equal(color('#123', 'rgb'), 'rgb(17, 34, 51)');
        equal(color('#123.3', 'rgb'), 'rgba(17, 34, 51, 0.3)');
    });
});
