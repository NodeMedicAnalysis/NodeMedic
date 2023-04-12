import { State } from "../State";
import { Wrapped } from "../Wrapper";
import { Either, F } from "../Flib";

export class BaseContext {
    TWrite (s: State, valP: Wrapped): Either<State, Error> {
        return F.Left(s);
    }
}

export const BaseContextSingleton = new BaseContext();