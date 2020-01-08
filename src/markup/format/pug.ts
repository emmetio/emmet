import { Abbreviation } from '@emmetio/abbreviation';
import indentFormat from './indent-format';
import { Config } from '../../config';

export default function pug(abbr: Abbreviation, config: Config): string {
    return indentFormat(abbr, config, {
        beforeAttribute: '(',
        afterAttribute: ')',
        glueAttribute: ', ',
        beforeTextLine: '| ',
        selfClose: config.options['output.selfClosingStyle'] === 'xml' ? '/' : ''
    });
}
