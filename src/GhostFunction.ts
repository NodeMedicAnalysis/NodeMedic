import { F } from './Flib';
import { Tracer } from './Trace';
import { TSet, TSetProp, TCheck, TGetTaintAll,
         TGetTaintAny, TGetPropTaint, addFuncSink, getValue } from './Taint'
import { isWrapped } from './Wrapper'
import { State } from './State';
import { Config } from './Config';

export const ghostFunctionNames = [
    '__jalangi_set_taint__', '__jalangi_set_prop_taint__',
    '__jalangi_check_taint__', '__jalangi_clear_taint__', '__jalangi_clear_prop_taint__',
    '__jalangi_assert_taint_true__', '__jalangi_assert_prop_taint_true__',
    '__jalangi_assert_some_prop_tainted__', '__jalangi_assert_taint_false__',
    '__jalangi_assert_prop_taint_false__', '__jalangi_get_taint__', '__jalangi_assert_wrapped__',
    '__jalangi_assert_not_wrapped__', '__assert_string_range_all_tainted__',
    '__string_range_set_taint__', '__assert_string_range_all_untainted__',
    '__string_range_clear_taint__', '__assert_array_range_all_tainted__',
    '__assert_array_range_all_untainted__', '__jalangi_set_sink__',
    '__jalangi_check_taint_string__',
];

const registeredGhostFunctions = new Map();

export function registerGhostFunction(name: string, f: Function) {
    if (isGhostFunction(name)) {
        throw Error('Registering an already declared ghost function is not allowed');
    }
    registeredGhostFunctions.set(name, f);
    globalizeFunction(name);
}

export function isGhostFunction(name: string): boolean {
    return ghostFunctionNames.includes(name) || registeredGhostFunctions.has(name);
}


// injects the function name into the global scope so it can be called without being imported
// note that it is injected with an empty body
function globalizeFunction(funcName: string) {
    // http://marcosc.com/2012/03/dynamic-function-names-in-javascript/
    let func = new Function(
        "return function " + funcName + "(){}"
    )();
    global[funcName] = func;
}

// inject the ghost functions into the global scope so we don't have to import it every time we run 
// the analysis
export function globalizeGhostFunctions() {
    ghostFunctionNames.forEach(funcName => {
        globalizeFunction(funcName);
    });
}

/** Calls the corresponding Taint layer and returns the new state.
 * 
 * @param name Name of the ghost function being called.
 */
export function dispatchGhostFunction(s: State, name: string, args: Array<any>, c: Config, t: Tracer): State {
    if (!isGhostFunction(name)) {
        F.unreachable("Dispatched ghost function of unknown name");
    }

    // dispatch new ghost functions
    if (registeredGhostFunctions.has(name)) {
        return registeredGhostFunctions.get(name)(s, args);
    }


    switch(name) {
        /** Sets taint on the target variable
         * 
         * Function prototype:
         * __jalangi_set_taint__(x: any)
         */
        case '__jalangi_set_taint__': {
            let s2 = F.eitherThrow(TSet(s, args[0], true));
            return s2;
        }


        /** Removes taint from the target variable
         *
         * Function prototype:
         * __jalangi_clear_taint(x: any)
         */
        case '__jalangi_clear_taint__': {
            let s2 = F.eitherThrow(TSet(s, args[0], false));
            return s2;
        }

        /** Sets taint on the target variable's property
         * 
         * Function prototype:
         * __jalangi_set_taint__(x: any, y: any)
         */
        case '__jalangi_set_prop_taint__': {
            let s2 = F.eitherThrow(TSetProp(s, args[0], args[1].toString(), true));
            return s2;
        }

        /** Removes taint from the target variable's property
         *
         * Function prototype:
         * __jalangi_clear_taint__(x: any, y: any)
         */
        case '__jalangi_clear_prop_taint__': {
            let s2 = F.eitherThrow(TSetProp(s, args[0], args[1].toString(), false));
            return s2;
        }

        /** Sets taint on a range of string bytes [lb, ub)
         *
         * Function prototype:
         * __string_range_set_taint__(str: string, lb: int, ub: int)
         */
        case '__string_range_set_taint__': {
            let str = args[0];
            let lb = args[1];
            let ub = args[2];
            let sp = s;
            for (let i = lb; i < ub; i++) {
                sp = F.eitherThrow(TSetProp(sp, str, i.toString(), true));
            }
            return sp;
        }


        /** Clears taint on a range of string bytes [lb, ub)
         *
         * Function prototype:
         * __string_range_clear_taint__(str: string, lb: int, ub: int)
         */
        case '__string_range_clear_taint__': {
            let str = args[0];
            let lb = args[1];
            let ub = args[2];
            let sp = s;
            for (let i = lb; i < ub; i++) {
                sp = F.eitherThrow(TSetProp(sp, str, i.toString(), false));
            }
            return sp;
        }

        /** Checks taint on the target variable, and exits with the stack trace if true
         * 
         * Function prototype:
         * __jalangi_check_taint__(x: any)
         */
        case '__jalangi_check_taint__': {
            TCheck(s, args[0]);
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }

        /** Determines which bytes, if any, of a string are tainted.
         *
         *  Function prototype:
         *  __jalangi_check_taint_string__(str: string)
         */
        case '__jalangi_check_taint_string__': {
            let str = args[0] as string;
            let tainted_indices = [];
            for (let i = 0; i < str.length; i++) {
                let tBit = F.eitherThrow(TGetPropTaint(s, str, i.toString()));
                if (tBit) {
                    tainted_indices.push(i);
                }
            }
            if (tainted_indices.length > 0) {
               console.log(`String has tainted indices: [${tainted_indices}]`);
            }
            TCheck(s, str);
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }
        
        /** Throws an error if the target variable is not wrapped
         * 
         * Function prototype:
         * __jalangi_assert_wrapped__(x: any)
         */
        case '__jalangi_assert_wrapped__': {
            let wrapped = isWrapped(s, args[0]);
            if (!wrapped) {
                throw Error(`${t.inspect(args[0])} is not wrapped`)
            }
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }

        /** Throws an error if the target variable is wrapped
         * 
         * Function prototype:
         * __jalangi_assert_not_wrapped__(x: any)
         */
        case '__jalangi_assert_not_wrapped__': {
            let wrapped = isWrapped(s, args[0]);
            if (wrapped) {
                throw Error(`${t.inspect(args[0])} is not wrapped`)
            }
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }
        
        /** Asserts the target variable is tainted
         * 
         * Function prototype:
         * __jalangi_assert_taint_true__(x: any)
         */
        case '__jalangi_assert_taint_true__': {
            let tBit = F.eitherThrow(TGetTaintAll(s, args[0]));
            if (!tBit) {
                throw Error("Argument expected to be tainted");
            }
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }

        /** Asserts that at least one property of the target variable
         *  is tainted.
         *
         * Function prototype:
         * __jalangi_assert_some_prop_tainted__(x: any)
         */
        case '__jalangi_assert_some_prop_tainted__': {
            let tBit = F.eitherThrow(TGetTaintAny(s, args[0]));
            if (!tBit) {
                throw Error("Argument expected to be at lesat one tainted property");
            }
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }

        /** Asserts the target variable's property is tainted
         * 
         * Function prototype:
         * __jalangi_assert_prop_taint_true__(x: any)
         */
        case '__jalangi_assert_prop_taint_true__': {
            let tBit = F.eitherThrow(TGetPropTaint(s, args[0], args[1].toString()));
            if (!tBit) {
                throw Error("Property expected to be tainted");
            }
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }

        /** Asserts the target variable is not tainted
         * 
         * Function prototype:
         * __jalangi_assert_taint_false__(x: any)
         */
        case '__jalangi_assert_taint_false__': {
            let tBit = F.eitherThrow(TGetTaintAll(s, args[0]));
            if (tBit) {
                throw Error("Argument expected to be untainted");
            }
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }

         /** Asserts the target variable's property is not tainted
         * 
         * Function prototype:
         * __jalangi_assert_prop_taint_false__(x: any)
         */
        case '__jalangi_assert_prop_taint_false__': {
            let tBit = F.eitherThrow(TGetPropTaint(s, args[0], args[1].toString()));
            if (tBit) {
                throw Error("Propety expected to be untainted");
            }
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }

        /** Adds the function as a sink in our infrastructure
         * 
         *  Function prototype:
         * __jalangi_set_sink__(x: Function)
         */
        case '__jalangi_set_sink__': {
            if (typeof args[0] !== 'function') {
                throw Error("Sink must be a function");
            }
            let unwrapped_func : any = getValue(s, args[0]);
            addFuncSink(unwrapped_func);
            return s;
        }
        
        /** Asserts that all bytes of the string corresponding to indices
         *  in the range [lb, ub) are tainted.
         *
         *  Function prototype:
         *  __assert_string_range_all_tainted__
         */
        case '__assert_string_range_all_tainted__': {
            let str = args[0];
            // The lower bound (inclusive)
            let lb = args[1];
            // The upper bound (exclusive)
            let ub = args[2];
            let untainted_indices = [];
            for (let i = lb; i < ub; i++) {
                let tBit = F.eitherThrow(TGetPropTaint(s, str, i.toString()));
                if (!tBit) {
                    untainted_indices.push(i);
                }
            }
            if (untainted_indices.length > 0) {
                throw Error(`Untainted indices: [${untainted_indices}]`);
            }
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }

        /** Asserts that all bytes of the string corresponding to indices
         *  in the range [lb, ub) are not tainted.
         *
         *  Function prototype:
         *  __assert_string_range_all_tainted__
         */
        case '__assert_string_range_all_untainted__': {
            let str = args[0];
            // The lower bound (inclusive)
            let lb = args[1];
            // The upper bound (exclusive)
            let ub = args[2];
            let tainted_indices = [];
            for (let i = lb; i < ub; i++) {
                let tBit = F.eitherThrow(TGetPropTaint(s, str, i.toString()));
                if (tBit) {
                    tainted_indices.push(i);
                }
            }
            if (tainted_indices.length > 0) {
                throw Error(`Tainted indices: [${tainted_indices}]`);
            }
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }

         /** Asserts that all bytes of the string corresponding to indices
         *  in the range [lb, ub) are tainted.
         *
         *  Function prototype:
         *  __assert_array_range_all_tainted__
         */
        case '__assert_array_range_all_tainted__': {
            let arr = args[0];
            // The lower bound (inclusive)
            let lb = args[1];
            // The upper bound (exclusive)
            let ub = args[2];
            let untainted_indices = [];
            for (let i = lb; i < ub; i++) {
                let tBit = F.eitherThrow(TGetTaintAll(s, arr[i]));
                if (!tBit) {
                    untainted_indices.push(i);
                }
            }
            if (untainted_indices.length > 0) {
                throw Error(`Untainted indices: [${untainted_indices}]`)
            }
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }

        /** Asserts that all bytes of the string corresponding to indices
         *  in the range [lb, ub) are not tainted.
         *
         *  Function prototype:
         *  __assert_array_range_all_tainted__
         */
        case '__assert_array_range_all_untainted__': {
            let arr = args[0];
            // The lower bound (inclusive)
            let lb = args[1];
            // The upper bound (exclusive)
            let ub = args[2];
            let tainted_indices = [];
            for (let i = lb; i < ub; i++) {
                let tBit = F.eitherThrow(TGetTaintAll(s, arr[i]));
                if (tBit) {
                    tainted_indices.push(i);
                }
            }
            if (tainted_indices.length > 0) {
                throw Error(`Tainted indices: [${tainted_indices}]`);
            }
            if (c.ASSERTPASSED) {
                throw Error("Completed execution");
            }
            return s;
        }

        default: {
            F.unreachable(`Unhandled ghost function: ${name}`);
        }
    }
}
