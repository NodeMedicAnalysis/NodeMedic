import { State } from '../State';
import { Wrapped, Unwrapped } from '../Wrapper';
import { Either, NativeFunction, Maybe, F } from '../Flib';


export interface modulePolicy {
    nativeMethodWrapperPolicies: Object,
    nativeMethodTaintPolicies: Object,

    isTainted(s: State, value: Wrapped): boolean,

    WrapPre(s: State, value: Unwrapped): [State, Wrapped], 

    WGetField(s: State, r: Wrapped | Unwrapped): [State, Wrapped | Unwrapped],

    WPutFieldPre(s: State, v: Wrapped): [State, Wrapped | Unwrapped],

    WPutField(s: State, u: Unwrapped): [State, Wrapped | Unwrapped],

    WInvokeFunPre(s: State, f: Wrapped, base: Wrapped, args: Wrapped[]): [State, any, any[]],

    WInvokeFun(s: State,  f: any, base: any, args: any[], result: any): [State, any, any[], any],

    TGetField(s: State, v1: Wrapped, v2: Wrapped, v3: Wrapped): Either<State, Error>,

    TPutField(s: State, v1: Wrapped, v2: Wrapped, v3: Wrapped): Either<State, Error>,
    
    TBinary(s: State, op: string, v1: Wrapped, v2: Wrapped, v3: Wrapped): Either<State, Error>,

    TUnary(s: State, v1: Wrapped, v2: Wrapped): Either<State, Error>,

    TCall(s: State, f: NativeFunction, base: Wrapped, args: Wrapped[], result: Wrapped): Either<State, Error>,
}

export type NativeMethodWrapPrePolicy = (
    s: State,
    f: NativeFunction,
    base: Wrapped,
    args: Wrapped[],
) => Either<[State, any, any[]], Error>;

export type NativeMethodWrapPostPolicy = (
    s: State,
    f: NativeFunction,
    base: any,
    args: any[],
    result: any,
) => Either<[State, any, any[], any], Error>;

export enum WrapperPolicyType {
    pre,
    post,
}

export function nativeMethodWrapperPolicyDispatch(
    policies: any, 
    f: NativeFunction,
    policyType: WrapperPolicyType,
): Maybe<NativeMethodWrapPrePolicy | NativeMethodWrapPostPolicy> {
    if (policies.hasOwnProperty(f.name)) {
        // Apply one of our models
        if (policyType == WrapperPolicyType.pre) {
            return policies[f.name].pre as Maybe<NativeMethodWrapPrePolicy>;
        } else if (policyType == WrapperPolicyType.post) {
            return policies[f.name].post as Maybe<NativeMethodWrapPostPolicy>;
        } else {
            F.unreachable(`Unhandled policyType: ${policyType}`);
        }
    } else {
        return F.Nothing();
    }
}

export type NativeMethodTaintPolicy = (
    s: State,
    f: NativeFunction,
    base: Wrapped,
    args: Wrapped[],
    result: Wrapped,
) => Either<State, Error>;

export function nativeMethodTaintPolicyDispatch(
    policies: any, 
    f: NativeFunction
): Maybe<NativeMethodTaintPolicy> {
    if (policies.hasOwnProperty(f.name)) {
        // Apply one of our models
        return F.Just(policies[f.name] as NativeMethodTaintPolicy);
    } else {
        return F.Nothing();
    }
}
