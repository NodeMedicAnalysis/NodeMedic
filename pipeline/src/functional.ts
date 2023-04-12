export class Result<A, B>{
    private _v1: A;
    private _v2?: B;
    private constructor(v1?: A, v2?: B) {
        if (v1 !== undefined) {
            this._v1 = v1;
        }
        if (v2 !== undefined) {
            this._v2 = v2;
        }
    }
    static Success<A>(v1: A): Result<A, undefined> {
        return new Result(v1, undefined);
    }
    static Failure<B>(v2: B): Result<undefined, B> {
        return new Result(undefined, v2);
    }
    isSuccess(): this is A {
        return this._v2 === undefined;
    }
    isFailure(): this is B {
        return !this.isSuccess();
    }
    unwrap(): A | B {
        if (this.isSuccess()) {
            return this._v1;
        } else {
            return this._v2;
        }
    }
    toString(): string {
        if (this.isSuccess()) {
            return `Success(${this._v1.toString()})`;
        } else {
            return `Failure(${this._v2.toString()})`;
        }
    }
}


export class Maybe<T> {
    static nothing = Symbol('nothing');
    _value: T | Symbol
    constructor(value?: T) {
        if (value === undefined) {
            this._value = Maybe.nothing;
        } else {
            this._value = value;
        }
    }
    static Just<T>(value: T): Maybe<T> {
        return new Maybe(value);
    }
    static Nothing<T>(): Maybe<T> {
        return new Maybe() as Maybe<T>;
    }
    isNothing(): boolean {
        return this._value == Maybe.nothing;
    }
    unwrap(): T {
        if (this.isNothing()) {
            throw Error('Attempted to unwrap nothing');
        }
        return (this._value as T);
    }
    orDefault(defaultValue: T): T {
        if (this.isNothing()) {
            return defaultValue;
        }
        return (this._value as T);
    }
    toString(): string {
        if (this.isNothing()) {
            return 'Nothing';
        } else {
            return `Some(${this._value.toString()})`;
        }
    }
}
