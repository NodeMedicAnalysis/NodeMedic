import { F, Maybe, Either, Literal } from './Flib';
import { Stack, SafeMap } from './DataStructures';
import { State, ID, setMw, Context, setF, Frame, IID, 
         CallType, setFrame, setIDS, getIDS, initFrame,
         setCallType } from './State';
import { SafeProxy } from './SafeProxy';
import { getPolicy } from './modules/PolicyManager';
import { List } from 'immutable';


export type Wrapped = Object;
export type Unwrapped = any;

/** @internal */
var __counter = 0;

function freshID(): ID {
    return { '__id__': __counter++};
}

export function getID(IDS: Stack<ID>): [Stack<ID>, ID] {
    let top: Maybe<ID> = IDS.head();
    return F.matchMaybe(top, {
        Just: (a) => [IDS.tail(), a],
        // Generate a fresh ID
        Nothing: () => [IDS, freshID()],
    });
}

function putID(IDS: Stack<ID>, id: ID): Stack<ID> {
    return IDS.push(id);
}

export function wrap(s: State, val: any): Either<[State, Wrapped], Error> {
    if (!F.isLiteral(val)) {
        // Apply a object-specific wrapping policy
        let [sP, valP] = getPolicy(val).WrapPre(s, val);
        // Remove dummy ID from the stack
        let [IDSp, _] = getID(getIDS(sP));
        let sPP = setIDS(sP, IDSp);
        // val is an object; no wrapping needed. This also prevents
        // wrapping of already-wrapped values.
        return F.Left([sPP, valP]);
    } else {
        // note: we treat undefined like any other literal
        let [IDSp, id] = getID(getIDS(s));
        // Do not perform wrapping in a native call
        if (s.frame.callType == CallType.NativeCall 
            || s.frame.callType == CallType.UnknownCall 
        ) {
            var wrapped = val as any;
            var MwP = s.Mw;
        } else {
            var wrapped = SafeProxy(val) as any;
            var MwP = s.Mw.set(wrapped, [id, val]);
        }
        let s2 = setIDS(s, IDSp);
        let s3 = setMw(s2, MwP);
        return F.Left([s3, wrapped]);
    }
}

export function unwrap(s: State, val: any): Either<[State, Unwrapped], Error> {
    return F.matchMaybe(s.Mw.get(val), {
        Just: ([id, unwrapped]: [ID, Literal]) => {
            let IDSp = putID(getIDS(s), id);
            let sP = setIDS(s, IDSp);
            return F.Left([sP, unwrapped]);
        },
        Nothing: () => {
            // Place a dummy ID on the stack
            let IDSp = putID(getIDS(s), freshID());
            let sP = setIDS(s, IDSp);
            return F.Left([sP, val]);
        }
    });
}

export function isWrapped(s: State, val: any): val is Wrapped {
    return F.matchMaybe(s.Mw.get(val), {
        Just: (x) => true,
        Nothing: () => false,
    });
}

function WPre(s: State): Either<State, Error> {
    if (s.C == Context.CondExpr) {
        F.assert(getIDS(s).length() == 1, 'WPre: Conditional did not put an ID on the stack');
        let [s2, _] = F.eitherThrow(wrap(s, {}));
        F.assert(getIDS(s2).length() == 0, 'WPre: IDS must be empty at end');
        return F.Left(s2);
    } else {
        F.assert(getIDS(s).length() == 0, 'WPre: IDS must be empty if s.C != CondExpr');
        return F.Left(s);
    }
}

export function WLiteral(s0: State, val: Literal): Either<[State, Wrapped], Error> {
    let s = F.eitherThrow(WPre(s0));
    F.assert(getIDS(s).length() == 0, 'WLiteral: IDS must be empty at start');
    let [s2, wrapped] = F.eitherThrow(wrap(s, val));
    F.assert(getIDS(s2).length() == 0, 'WLiteral: IDS must be empty at end');
    return F.Left([s2, wrapped]);
}

export function WWrite(s0: State, val: any): Either<[State, Wrapped], Error> {
    if (s0.C == Context.CondExpr) {
        F.assert(getIDS(s0).length() == 1, 'WWrite: |IDS| == 1 after CondExpr');
        let [s, wrapped] = F.eitherThrow(wrap(s0, val));
        F.assert(getIDS(s).length() == 0, 'WWrite: IDS must be empty at end');
        return F.Left([s, wrapped]);
    } else {
        F.assert(getIDS(s0).length() == 0, 'WWrite: IDS must be empty at end');
        return F.Left([s0, val]);
    }
}

export function WGetFieldPre(
    s0: State,
    x1: Wrapped, 
    x2: Wrapped
): Either<[State, [Unwrapped, Unwrapped]], Error> {
    let s = F.eitherThrow(WPre(s0));
    F.assert(getIDS(s).length() == 0, `WGetFieldPre: IDS must be empty at start`);
    let [s1, u1] = F.eitherThrow(unwrap(s, x1));
    let [s2, u2] = F.eitherThrow(unwrap(s1, x2));
    return F.Left([s2, [u1, u2]]);
}

export function WGetField(
    s2: State, 
    u1: Unwrapped, 
    u2: Unwrapped, 
    r: Unwrapped
): Either<[State, [Wrapped, Wrapped, Wrapped]], Error> {
    // Before: r := u1.u2;
    let [s3, x2p] = F.eitherThrow(wrap(s2, u2));
    let [s4, x1p] = F.eitherThrow(wrap(s3, u1));
    let [s5, rP] = getPolicy(u1).WGetField(s4, r);
    F.assert(getIDS(s5).length() == 0, 'WGetField: IDS must be empty at end');
    return F.Left([s5, [x1p, x2p, rP]]);
}

export function WPutFieldPre(
    s0: State,
    x1: Wrapped, 
    x2: Wrapped,
    x3: Wrapped,
): Either<[State, [Unwrapped, Unwrapped, Wrapped | Unwrapped]], Error> {
    let s = F.eitherThrow(WPre(s0));
    F.assert(getIDS(s).length() == 0, 'WPutFieldPre: IDS must be empty at start');
    let [s1, u1] = F.eitherThrow(unwrap(s, x1));
    let [s2, u2] = F.eitherThrow(unwrap(s1, x2));
    let [s3, u3] = getPolicy(u1).WPutFieldPre(s2, x3);
    return F.Left([s3, [u1, u2, u3]]);
}

export function WPutField(
    s2: State, 
    u1: Unwrapped, 
    u2: Unwrapped, 
    r: Unwrapped
): Either<[State, [Wrapped, Wrapped, Wrapped | Unwrapped]], Error> {
    // Before: u1.u2 := r
    let [s3, x2] = F.eitherThrow(wrap(s2, u2));
    let [s4, x1] = F.eitherThrow(wrap(s3, u1));
    let [s5, rP] = getPolicy(u1).WPutField(s4, r);
    F.assert(getIDS(s5).length() == 0, 'WPutField: IDS must be empty at end');
    return F.Left([s5, [x1, x2, rP]]);
}

function saveFrame(s: State, callType: CallType, iid: IID): State {
    let Fp = F.matchMaybe(s.F.get(iid), {
        Just: (frameBucket: Stack<Frame>) => {
            let frameBucketP = frameBucket.push(s.frame);
            return s.F.set(iid, frameBucketP);
        },
        Nothing: () => {
            let l: List<Frame> = List();
            let lP = l.push(s.frame);
            let frameBucket: Stack<Frame> = new Stack(F.Just(lP));
            return s.F.set(iid, frameBucket);
        },
    });
    let sP1 = setFrame(s, initFrame(callType, iid));
    let sP2 = setF(sP1, Fp);
    return sP2;
}

function restoreFrame(s: State, iid: IID): State {
    return F.matchMaybe(s.F.get(iid), {
        Just: (frameBucket: Stack<Frame>) => {
            let [frameBucketP, maybeFrame] = frameBucket.pop();
            // If the frame is empty, delete it
            if (frameBucketP.length() == 0) {
                var Fp: SafeMap<IID, Stack<Frame>> = s.F.delete(iid);
            } else {
                var Fp = s.F.set(iid, frameBucketP);
            }
            let sP: State = setF(s, Fp);
            // We delete empty bindings so this will
            // not cause an error
            let frameP = F.maybeThrow(maybeFrame);
            let sP1: State = setFrame(sP, frameP);
            return sP1;
        },
        Nothing: () => {
            throw Error(`Could not find stack matching ID: ${iid}`);
        }
    });
}

export function WInvokeFunPre(
    iid: IID,
    s0: State,
    f: Function, 
    base: Wrapped, 
    args: Wrapped[], 
    isMethod: boolean,
    isExternal: boolean,
    isNative: boolean
): Either<[State, [Unwrapped, Unwrapped, Unwrapped[]]], Error> {
    let s = F.eitherThrow(WPre(s0));
    F.assert(getIDS(s).length() == 0, 'WInvokeFunPre: IDS must be empty at start');
    F.assert(
        isNative ? isExternal : true,
        `Every native function should be external`
    );
    // Unwrap the function
    let [s1, uf] = F.eitherThrow(unwrap(s, f));
    if (isExternal) {
        if (isMethod) {
            // Unwrap the base
            var [s2, ub] = F.eitherThrow(unwrap(s1, base));
        } else {
            // If it's not a method then base is global, so
            // don't attempt to unwrap
            var [s2, ub] = [s1, base as Unwrapped];
        }

        // Unwrap the arguments
        let [si, baseP, unwrapped_args] = 
            getPolicy(ub).WInvokeFunPre(s2, f, base, args);
        // Save the current ID stack
        let callType = CallType.ExternalCall;
        if (isNative) {
            callType = CallType.NativeCall;
        }
        let sP = saveFrame(si, callType, iid);
        return F.Left([sP, [uf, ub, unwrapped_args]]);
    } else {
        let callType = CallType.InternalCall;
        // Save the current ID stack
        let s2 = saveFrame(s1, callType, iid);
        // Only unwrapped the function
        return F.Left([s2, [uf, base, args]]);
    }
}

export function WFunctionEnter(
    s: State,
    f: Function,
): Either<State, Error> {
    // FunctionEnter is only reached for internal calls,
    // however certain functions must be treated natively
    let callType = CallType.InternalCall;
    if (['toString', 'valueOf'].indexOf(f.name) != -1) {
        callType = CallType.NativeCall;
    }
    // Save the current ID stack if it wasn't already saved
    if (getIDS(s).length() != 0) {
        let s1 = saveFrame(s, callType, -1);
        let s2 = F.eitherThrow(WPre(s1));
        return F.Left(s2);
    } else {
        let s1 = setCallType(s, callType);
        let s2 = F.eitherThrow(WPre(s1));
        return F.Left(s2);
    }
}

export function WFunctionExit(
    s: State,
    threwException: boolean,
): Either<State, Error> {
    if (threwException) {
        // Clear the frame if an exception was thrown
        let fP = initFrame(s.frame.callType, s.frame.callerIID)
        let s1 = setFrame(s, fP);
        F.assert(
            getIDS(s1).length() == 0, 
            'WFunctionExit: IDS must be empty after exception'
        );
        return F.Left(s1);
    } else {
        // Restore the ID stack
        if (s.frame.callerIID == -1) {
            let s1 = restoreFrame(s, -1);
            // let s2 = setCallType(s, callType);
            return F.Left(s1);
        } else {
            return F.Left(s);
        }
    }
}

export function WInvokeFun(
    iid: IID,
    s: State, 
    f: Function, 
    base: Unwrapped, 
    args: Unwrapped[], 
    result: Unwrapped,
    isMethod: boolean, 
    isNative: boolean,
    isExternal: boolean,
): Either<[State, [Wrapped, Wrapped, Wrapped[], Wrapped]], Error> {
    let sP = restoreFrame(s, iid);
    if (isNative || isExternal) {
        // Wrap the arguments
        let [si, baseP, wrapped_args, resultP] = getPolicy(base).WInvokeFun(sP, f, base, args, result);
        if (isMethod) {
            // Wrap the actual base
            var [s2, wb] = F.eitherThrow(wrap(si, base));
        } else {
            // Base is global; don't wrap
            var [s2, wb] = [si, base as Wrapped];
        }
        // Wrap the function
        let [s3, wf] = F.eitherThrow(wrap(s2, f));
        // Wrap the result
        let [s4, wr] = F.eitherThrow(wrap(s3, result));
        F.assert(getIDS(s4).length() == 0, 'WInvokeFun: IDS must be empty at end');
        return F.Left([s4, [wf, wb, wrapped_args, wr]]);
    } else {
        // Wrap the function
        let [s1, wf] = F.eitherThrow(wrap(sP, f));
        // Wrap the result
        let [s2, wr] = F.eitherThrow(wrap(s1, result));
        F.assert(getIDS(s2).length() == 0, 'WInvokeFun: IDS must be empty at end');
        return F.Left([s2, [wf, base, args, wr]]);
    }
}

/** Pre binary operation hook for the wrapper instrumentation
 * 
 * Does the following operations according to the semantics
 * var u1; u1 := Unwrap x1;
 * var u2; u2 := Unwrap x2;
 * 
 * @param s 
 * @param x1 
 * @param x2 
 */
export function WBinaryPre(
    s0: State,
    x1: Wrapped, 
    x2: Wrapped
): Either<[State, [Unwrapped, Unwrapped]], Error> {
    let s = F.eitherThrow(WPre(s0));
    F.assert(getIDS(s).length() == 0, 'WBinaryPre: IDS must be empty at start');
    let [s1, u1] = F.eitherThrow(unwrap(s, x1));
    let [s2, u2] = F.eitherThrow(unwrap(s1, x2));
    return F.Left([s2, [u1, u2]]);
}

/** Post binary operation hook for the wrapper instrumentation
 * 
 * Does the following operations according to the semantics
 * 
 *  x2 := Wrap u2;
    x1 := Wrap u1;
    r := Wrap r;
 * 
 * @param s2 
 * @param u1 
 * @param u2 
 * @param r 
 */
export function WBinary(
    s2: State, 
    u1: Unwrapped, 
    u2: Unwrapped, 
    r: Unwrapped
): Either<[State, [Wrapped, Wrapped, Wrapped]], Error> {
    // Before: r := u1 op u2;
    let [s3, x2p] = F.eitherThrow(wrap(s2, u2));
    let [s4, x1p] = F.eitherThrow(wrap(s3, u1));
    let [s5, rP] = F.eitherThrow(wrap(s4, r));
    F.assert(getIDS(s5).length() == 0, 'WBinary: IDS must be empty at end');
    return F.Left([s5, [x1p, x2p, rP]]);
}

export function WEvalPre(s0: State, code: Wrapped, isInternal: boolean): Either<[State, [Unwrapped]], Error> {
    let s = F.eitherThrow(WPre(s0));
    F.assert(getIDS(s).length() == 0, 'WEvalPre: IDS must be empty at start');
    let [s2, codeP] = F.eitherThrow(unwrap(s, code));
    if (isInternal) {
        // If the call is internal, e.g. instrumentCodePre added by the instrumentation
        // then WEval will never be called
        var s3 = F.eitherThrow(wrap(s2, {}))[0];
    } else {
        var s3 = s2;
    }
    return F.Left([s3, [codeP]]);
}

export function WEval(s: State, code: Unwrapped): Either<[State, [Wrapped]], Error> {
    let [s2, codeP] = F.eitherThrow(wrap(s, code));
    F.assert(getIDS(s2).length() == 0, 'WEval: IDS must be empty at end');
    return F.Left([s2, [codeP]]);
}

/** Pre unary operation hook for the wrapper instrumentation
 * 
 * Does the following operations according to the semantics
 * var u; u := Unwrap x;
 * 
 * @param s 
 * @param x
 */
export function WUnaryPre (
    s0: State,
    x: Wrapped
): Either <[State, [Unwrapped]], Error> {
    let s = F.eitherThrow(WPre(s0));
    F.assert(getIDS(s).length() == 0, 'WUnaryPre: IDS must be empty at start');
    let [s1, u] = F.eitherThrow(unwrap(s, x));
    return F.Left([s1, [u]]);
}

/** Post unary operation hook for the wrapper implementation
 * 
 * Does the following operations according to the semantics
 * 
 * x := Wrap u;
 * r := Wrap r;
 * 
 * @param s1 
 * @param u 
 * @param r 
 */
export function WUnary (
    s1: State, 
    u: Unwrapped, 
    r: Unwrapped
): Either<[State, [Wrapped, Wrapped]], Error> {
    // Before r := op u1
    let [s2, xp] = F.eitherThrow(wrap(s1, u));
    let [s3, rP] = F.eitherThrow(wrap(s2, r));
    F.assert(getIDS(s3).length() == 0, 'WUnary: IDS must be empty at end');
    return F.Left([s3, [xp, rP]]);
}

export function WConditional(
    s0: State,
    condResult: Wrapped
): Either<[State, [Unwrapped]], Error> {
    let s = F.eitherThrow(WPre(s0));
    F.assert(getIDS(s).length() == 0, 'WConditional: IDS must be empty at start');
    let [s2, ucondResult] = F.eitherThrow(unwrap(s, condResult));
    F.assert(getIDS(s2).length() == 1, 'WConditional: |IDS| == 1 at end');
    return F.Left([s2, [ucondResult]]);
}

export function WEndExpr(
    s0: State
): Either<State, Error> {
    let s = F.eitherThrow(WPre(s0));
    F.assert(getIDS(s).length() == 0, 'WEndExpr: IDS must be empty at start');
    return F.Left(s);
}
