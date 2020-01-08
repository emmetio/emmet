import { Abbreviation } from '@emmetio/abbreviation';
import indentFormat from './indent-format';
import { Config } from '../../config';

export default function haml(abbr: Abbreviation, config: Config): string {
    return indentFormat(abbr, config, {
        beforeName: '%',
        beforeAttribute: '(',
        afterAttribute: ')',
        glueAttribute: ' ',
        afterTextLine: ' |',
        booleanValue: 'true',
        selfClose: '/'
    });
}
