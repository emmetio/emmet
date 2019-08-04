import { Abbreviation } from '@emmetio/abbreviation';
import { ResolvedConfig } from '../../types';
import indentFormat from './indent-format';

export default function haml(abbr: Abbreviation, config: ResolvedConfig): string {
    return indentFormat(abbr, config, {
        beforeName: '%',
        beforeAttribute: '(',
        afterAttribute: ')',
        glueAttribute: ' ',
        afterTextLine: ' |',
        booleanValue: 'true'
    });
}
