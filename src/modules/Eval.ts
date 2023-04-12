import { State, PropMap, taintEntry, setMt, ID, setPath } from "../State";
import { Wrapped } from "../Wrapper";
import { Either, F } from "../Flib";
import { getTaintEntry, anyPropertiesTainted, initPropMap, oid, getValue } from "../Taint";
import { registerGhostFunction } from "../GhostFunction";
import { BaseContext } from "./BaseContext";
import { inspect } from "../Trace";
import { describePath, newPathNode } from "../TaintPaths";

export const evalPre = "__jalangi_push_eval_ctx__";
export const evalPost = "__jalangi_pop_eval_ctx__";
const DO_NOT_REWRITE_STR = "__nodetaint_do_not_rewrite__";

const EVAL_CTX: Array<any>  = [];

// If true, a tainted code string reaching eval will
// result in an assertion failure
var EVALSINK: boolean = true;


function initEvalModule() {
    registerGhostFunction(evalPre, function(s: State, args: Array<any>) {
        pushEvalCtx();
        return s;
    });
    registerGhostFunction(evalPost, function(s: State, args: Array<any>){
        popEvalCtx();
        return s;
    });

    // define sentinel for not rewriting
    global[DO_NOT_REWRITE_STR] = 0;
}

export function setEvalSink(b: boolean) {
    EVALSINK = b;
    if (!EVALSINK) {
        // initialize the module
        initEvalModule();
    }
}

export function pushEvalCtx() {
    EVAL_CTX.push(Object());
}

export function popEvalCtx() {
    if (EVAL_CTX.length <= 0) {
        throw Error("Mismatch in evalctx handling");
    }
    EVAL_CTX.pop();
}

// returns true if we are in a tainted evaluation context where we have to taint all LHS
export function isEvalCtx() {
    return (!EVALSINK) && EVAL_CTX.length > 0;
}


//
/** Rewrites the code to be eval'd if the code is tainted, or returns the code as is otherwise 
 * 
 * Rewriting is done to introduce a tainted eval context.
 * Similar to the tainted scope work done in   
 * https://pdfs.semanticscholar.org/49f3/a6ade36ffc7082cd0611d508170af190deca.pdf
 * 
 * evalPre is a ghost function that pushes the eval context.
 * evalPost is a ghost function that pops the eval context.
 * 
 * While in an eval context, all LHS (i.e. all writes) are tainted. 
 * 
 * This is defined in the EvalContext object.
 * 
 */
export function EvalApplyRewritePolicy(s: State, code: string, w: Wrapped): Either<[State, [string]], Error> {
    if (!EVALSINK) {
        F.matchEither(getTaintEntry(s, w), {
            Left: (tE) => {
                let tainted = false;
                if (tE.taintBit) {
                    tainted = true;
                }
                F.matchMaybe(tE.map, {
                    Just: (x: PropMap) => {
                        let anyTainted: boolean = F.eitherThrow(anyPropertiesTainted(s, w));
                        if (anyTainted) {
                            tainted = true;
                        }
                    },
                    Nothing: () => {},
                });

                if (tainted && !code.includes(DO_NOT_REWRITE_STR)) {
                    code = `var __orig__ = undefined; ${evalPre}(); try{ __orig__ = eval(\"${DO_NOT_REWRITE_STR};${code}\");}finally{${evalPost}(); __orig__;}`
                }
            },
            Right: (_) => {
                // do nothing, since it means the wrapping does not exist so no taint exists
            }
        });
    } else {
        TEvalPolicy(s, w);
    }
    return F.Left([s, [code]]);
}

// checks whether a tainted argument has reached eval, and decides what to do based on whether 
// eval is a sink
export function TEvalPolicy(s: State, code: Wrapped): Either<State, Error> {
    let id = F.eitherThrow(oid(s, code));
    let tE: taintEntry = F.eitherThrow(getTaintEntry(s, code));
    let tEP = setPath(
        tE,
        newPathNode(`call:eval`, [tE.path], getValue(s, code))
    );
    let MtP = s.Mt.set(id, tEP);
    let sP = setMt(s, MtP);
    if (EVALSINK) {
        if (tE.taintBit) {
            describePath(tEP.path);
            setTimeout(() => {
                throw Error(`Sink function eval reached with tainted argument ${inspect(code)}\n`);
            });
            throw Error(`Sink function eval reached with tainted argument ${inspect(code)}\n`);
        }
        F.matchMaybe(tE.map, {
            Just: (_: PropMap) => {
                let anyTainted: boolean = F.eitherThrow(anyPropertiesTainted(sP, code));
                if (anyTainted) {
                    describePath(tEP.path);
                    setTimeout(() => {
                        throw Error(`Sink function eval reached with tainted argument ${inspect(code)}\n`);
                    });
                    throw Error(`Sink function eval reached with tainted argument ${inspect(code)}\n`);
                }
            },
            Nothing: () => {},
        });
    }
    return F.Left(sP);
}

export class EvalContext extends BaseContext {
    TWrite (s: State, valP: Wrapped): Either<State, Error> {
        let id: ID | Object = F.eitherThrow(oid(s, valP));
        let tE: taintEntry = F.eitherThrow(getTaintEntry(s, valP));
        let tEP = {
            taintBit: true, 
            map: initPropMap(valP, true),
            path: tE.path,
        };
        let MtP = s.Mt.set(id, tEP);

        let sP = setMt(s, MtP);
        return F.Left(sP);
    }
}

export const EvalContextSingleton = new EvalContext();