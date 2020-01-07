export const enum Brackets {
    SquareL = 91,
    SquareR = 93,
    RoundL = 40,
    RoundR = 41,
    CurlyL = 123,
    CurlyR = 125,
}

export const bracePairs = {
    [Brackets.SquareL]: Brackets.SquareR,
    [Brackets.RoundL]: Brackets.RoundR,
    [Brackets.CurlyL]: Brackets.CurlyR,
};
