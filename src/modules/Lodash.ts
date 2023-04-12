import { modulePolicy, NativeMethodTaintPolicy, nativeMethodTaintPolicyDispatch, nativeMethodWrapperPolicyDispatch, NativeMethodWrapPrePolicy, WrapperPolicyType } from './PolicyInterface';
import { State } from '../State';
import { Wrapped, Unwrapped } from '../Wrapper';
import { F, Either, NativeFunction } from '../Flib';
import { getObjectPolicy } from './PolicyManager';


export const LodashPolicy: modulePolicy = {

    nativeMethodWrapperPolicies: {
        'each': {
            pre: F.Just(eachWrapPre),
            post: F.Nothing(),
        },
        'forEach': {
            pre: F.Just(eachWrapPre),
            post: F.Nothing(),
        },
    },

    nativeMethodTaintPolicies: {},

    // Not used
    isTainted(s: State, v: Wrapped) { return true },

    WrapPre(s: State, value: Unwrapped): [State, Wrapped] {
        return getObjectPolicy().WrapPre(s, value);
    },

    WGetField(s: State, r: Wrapped | Unwrapped): [State, Wrapped | Unwrapped] {
        return getObjectPolicy().WGetField(s, r);
    },

    WPutFieldPre(s: State, v: Wrapped): [State, Wrapped | Unwrapped] {
        return getObjectPolicy().WPutFieldPre(s, v);
    },

    WPutField(s: State, u: Unwrapped): [State, Wrapped | Unwrapped] {
        return getObjectPolicy().WPutField(s, u);
    },

    WInvokeFunPre(s: State, f: Wrapped, base: Wrapped, args: Wrapped[]): [State, any, any[]] {
        return F.matchMaybe(nativeMethodWrapperPolicyDispatch(this.nativeMethodWrapperPolicies, (f as Function), WrapperPolicyType.pre), {
            Just: (policy: NativeMethodWrapPrePolicy) => F.eitherThrow(policy(s, (f as Function), base, args)),
            // Fall back to Object policy
            Nothing: () => getObjectPolicy().WInvokeFunPre(s, f, base, args),
        });
    },

    WInvokeFun(s: State, f: any, base: any, args: any[], result: any): [State, any, any[], any] {
        return getObjectPolicy().WInvokeFun(s, f, base, args, result);
    },

    TGetField(s: State, v1: Wrapped, v2: Wrapped, v3: Wrapped): Either<State, Error> {
        return getObjectPolicy().TGetField(s, v1, v2, v3);
    },
    
    TPutField(s: State, v1: Wrapped, v2: Wrapped, v3: Wrapped): Either<State, Error> {
        return getObjectPolicy().TPutField(s, v1, v2, v3);
    },

    TBinary(s: State, op: string, v1: Wrapped, v2: Wrapped, v3: Wrapped): Either<State, Error> {
        return getObjectPolicy().TBinary(s, op, v1, v2, v3);
    },

    TUnary(s: State, v1: Object, v2: Object): Either<State, Error> {
        return getObjectPolicy().TUnary(s, v1, v2);
    },

    TCall(
        s: State, 
        f: NativeFunction, 
        base: Wrapped, 
        args: Wrapped[], 
        result: Wrapped
    ): Either<State, Error> {
        return F.matchMaybe(nativeMethodTaintPolicyDispatch(this.nativeMethodTaintPolicies, f), {
            Just: (policy: NativeMethodTaintPolicy) => policy(s, f, base, args, result),
            // Fall back to Object policy
            Nothing: () => getObjectPolicy().TCall(s, f, base, args, result)
        });
    }
};


function eachWrapPre( 
    s: State,
    f: Function,
    base: Wrapped,
    args: Wrapped[],
): Either<[State, any, any[]], Error> {
    if (F.isNativeFunction(f)) {
        return F.Left(getObjectPolicy().WInvokeFunPre(s, f, base, args));
    } else {
        // TODO: Handle external calls here.
        // Do not unwrap the arguments
        return F.Left([s, base, args]);
    }
}
