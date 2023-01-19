import type { Abbreviation } from '@emmetio/abbreviation';
import indentFormat from './indent-format.js';
import type { Config } from '../../config.js';

export default function slim(abbr: Abbreviation, config: Config): string {
    return indentFormat(abbr, config, {
        beforeAttribute: ' ',
        glueAttribute: ' ',
        beforeTextLine: '| ',
        selfClose: '/'
    });
}
