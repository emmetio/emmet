import { Abbreviation } from '@emmetio/abbreviation';
import { ResolvedConfig } from '../../types';
import indentFormat from './indent-format';

export default function pug(abbr: Abbreviation, config: ResolvedConfig): string {
    return indentFormat(abbr, config, {
        beforeAttribute: ' ',
        glueAttribute: ' ',
        beforeTextLine: '| '
    });
}
