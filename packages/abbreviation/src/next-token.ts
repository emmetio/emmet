import numbering from './numbering';
import fieldOrVariable from './field-variable';
import repeaterPlaceholder from './repeater-placeholder';
import Scanner from '@emmetio/scanner';
import { EMNode } from './ast';

export const enum AllowedTokens {
    /** Allow numbering token `$` to be consumed */
    Numbering = 1 << 1,

    /** Allow fields `${0:placeholder}` and variables `${foo}` to be consumed */
    FieldOrVariable = 1 << 2,

    /** Allow repeater placeholder `$#` to be consumed */
    Repeater = 1 << 3,

    /** Allow all token types to be consumed */
    All = Numbering | FieldOrVariable | Repeater,
}

export default function nextToken(scanner: Scanner, allowed: AllowedTokens): EMNode | undefined {
    return ((allowed & AllowedTokens.FieldOrVariable) && fieldOrVariable(scanner))
        || ((allowed & AllowedTokens.Repeater) && repeaterPlaceholder(scanner))
        || ((allowed & AllowedTokens.Numbering) && numbering(scanner))
        || void 0;
}
