import * as _ from 'underscore';
import { F, Maybe, Literal } from './Flib';
import { SafeMap, Stack } from './DataStructures';
import { Wrapped } from './Wrapper';
import { inspect } from './Trace';
import { PathNode } from './TaintPaths';



/**
 * The number of map elements to print
 * 
 * Set to `-1` to print all elements
 */ 
var MAPPRINTSIZE: number = 5;

// export type ID = Object;
export interface ID {
    __id__: number
}

export type Taint = boolean;
export type IID = number;

export class PropMap extends SafeMap<string, Taint> {
    constructor(obj: Object) {
        super(F.Nothing());
        var self = this;
        if (obj != undefined && obj != null) {
            // we get the indices and length properties of the string primitive
            Object.getOwnPropertyNames(obj).forEach(function(key, index) {
                self.set(key.toString(), false);
            });
        }
    }
}

export interface taintEntry {
    taintBit: Taint,
    map: Maybe<PropMap>,
    path: PathNode,
}

export function setPath(tE: taintEntry, path: PathNode): taintEntry {
    let tEP: taintEntry = {
        taintBit: tE.taintBit,
        map: tE.map,
        path: path,
    };
    return tEP;
}

export enum Context {
    Unset = 'Unset',
    CondExpr = 'CondExpr',
}

export enum CallType {
    InternalCall = 'InternalCall',
    ExternalCall = 'ExternalCall',
    NativeCall = 'NativeCall',
    UnknownCall = 'UnknownCall',
}

export interface taintTree {
    property: string | Symbol,
    id: Maybe<ID>,
    children: taintTree[],
}

export interface Frame {
    // IDS ::= . | IDS, id
    // A stack of identifiers for values
    IDS: Stack<ID>,
    // The externality of the function called
    callType: CallType,
    // IID of the calling frame
    callerIID: IID,
    // Function argument taint trees
    taintTreeMap: WeakMap<Object, taintTree[]>,
}

export interface State {
    // The current frame
    frame: Frame,
    // Mw ::= . | Mw, (ref o) -> (id, p)
    // Maps wrapped literals (which are objects) 
    // to their IDs and their actual literals
    Mw: SafeMap<Wrapped, [ID, Literal]>;
    // Mt ::= . | Mt, id -> taintEntry
    Mt: SafeMap<ID | Object, taintEntry>;
    // Evaluation context
    C: Context;
    // Frames
    F: SafeMap<IID, Stack<Frame>>;
}

export function initFrame(callType: CallType, callerIID: IID): Frame {
    let frame: Frame = {
        IDS: new Stack(F.Nothing()),
        callType: callType,
        callerIID: callerIID,
        taintTreeMap: new WeakMap(),
    };
    return frame;
}

export function initState(): State {
    let s: State = {
        frame: initFrame(CallType.InternalCall, 0),
        Mw: new SafeMap(F.Nothing()),
        Mt: new SafeMap(F.Nothing()),
        C: Context.Unset,
        F: new SafeMap(F.Nothing()),
    };
    return s;
}

export function setIDS(s: State, IDS: Stack<ID>): State {
    let fP: Frame = {
        IDS: IDS,
        callType: s.frame.callType,
        callerIID: s.frame.callerIID,
        taintTreeMap: s.frame.taintTreeMap,
    }
    let sP: State = {
        frame: fP,
        Mw: s.Mw,
        Mt: s.Mt,
        C: s.C,
        F: s.F,
    };
    return sP;
}

export function getIDS(s: State): Stack<ID> {
    return s.frame.IDS;
}

export function setCallType(s: State, callType: CallType): State {
    let fP: Frame = {
        IDS: s.frame.IDS,
        callType: callType,
        callerIID: s.frame.callerIID,
        taintTreeMap: s.frame.taintTreeMap,
    }
    let sP: State = {
        frame: fP,
        Mw: s.Mw,
        Mt: s.Mt,
        C: s.C,
        F: s.F,
    };
    return sP;
}

export function setTaintTreeMap(s: State, taintTreeMap: WeakMap<object, taintTree[]>): State {
    let fP: Frame = {
        IDS: s.frame.IDS,
        callType: s.frame.callType,
        callerIID: s.frame.callerIID,
        taintTreeMap: taintTreeMap,
    }
    let sP: State = {
        frame: fP,
        Mw: s.Mw,
        Mt: s.Mt,
        C: s.C,
        F: s.F,
    };
    return sP;
}

export function getTaintTreeMap(s: State): WeakMap<object, taintTree[]>{
    return s.frame.taintTreeMap;
}

export function setFrame(s: State, frame: Frame): State {
    let sP: State = {
        frame: frame,
        Mw: s.Mw,
        Mt: s.Mt,
        C: s.C,
        F: s.F,
    };
    return sP;
}

export function setMw(s: State, Mw: SafeMap<Wrapped, [ID, Literal]>): State {
    let sP: State = {
        frame: s.frame,
        Mw: Mw,
        Mt: s.Mt,
        C: s.C,
        F: s.F,
    };
    return sP;
}

export function setMt(s: State, Mt: SafeMap<ID | Object, taintEntry>): State {
    let sP = {
        frame: s.frame,
        Mw: s.Mw,
        Mt: Mt,
        C: s.C,
        F: s.F,
    };
    return sP;
}

export function setC(s: State, C: Context): State {
    let sP = {
        frame: s.frame,
        Mw: s.Mw,
        Mt: s.Mt,
        C: C,
        F: s.F,
    };
    return sP;
}

export function setF(s: State, F: SafeMap<IID, Stack<Frame>>): State {
    let sP = {
        frame: s.frame,
        Mw: s.Mw,
        Mt: s.Mt,
        C: s.C,
        F: F,
    };
    return sP;
}

export function describeID(id: ID | Object): string {
    if (_.has(id, '__id__')) {
        return `ID(${(id as ID).__id__})`;
    } else {
        return `${inspect(id)}`;
    }
}

function describeIDS(IDS: Stack<ID>): string {
    let outStr = '[';
    IDS.l.forEach(function(value: ID, _) {
        outStr += `${describeID(value)}, `;
    })
    return outStr + ']';
}

function describeFrame(frame: Frame): string {
    let outStr = '{'
        + `\n\t${describeIDS(frame.IDS)}`
        + `\n\tcallType: ${frame.callType}`
        + `\n\tcallerIID: ${frame.callerIID}`;
    return outStr + '\n }'; 
}

function serializeMapings(
    m: SafeMap<any, any>,
    fKey: Function,
    fValue: Function,
    maxlen: number, 
    indent: number
): string {
    let indentInner = '\t'.repeat(indent);
    let mappings = [];
    m.forEach(function(value, key) {
        mappings.push(`\n${indentInner}${fKey(key)} : ${fValue(value)}`);
    });
    let outStr = '{';
    if (maxlen >= 0 && maxlen < mappings.length) {
        let mapPrintStartIdx = mappings.length - maxlen;
        outStr += mappings.slice(mapPrintStartIdx, mappings.length).join('');
        outStr += `\n${indentInner}...`;      
    } else {
        outStr += mappings.join('');
        
    }
    return outStr + '\n }';
}

function describeMw(Mw: SafeMap<Wrapped, [ID, Literal]>): string {
    return serializeMapings(Mw, inspect, x => describeID(x[0]), MAPPRINTSIZE, 1);
}

function describePropMap(m: PropMap): string {
    return serializeMapings(m, inspect, inspect, MAPPRINTSIZE, 3);
}

function describeTE(tE: taintEntry): string {
    return F.matchMaybe(tE.map, {
        Just: (m: PropMap) => `{ \n\t\ttaint: ${tE.taintBit}, \n\t\tmap: ${describePropMap(m)} \n\t}`,
        Nothing: () => `{ taint: ${tE.taintBit} }`,
    })
}

function validMw(Mw: SafeMap<Wrapped, [ID, Literal]>) {
    Mw.forEach(function([id, _], wrapped) {
        if (!id.hasOwnProperty('__id__')) {
            throw Error(`${inspect(wrapped)} has wrong id: ${describeID(id)}`);
        }
    });
}

function describeMt(Mt: SafeMap<ID | Object, taintEntry>): string {
    return serializeMapings(Mt, describeID, describeTE, MAPPRINTSIZE, 1);
}

export function describeState(s: State, debug_mode: boolean): string {
    if (!debug_mode)
        return "";
        
    validMw(s.Mw);

    let outStr = '=======================';
    outStr += `\n frame: ${describeFrame(s.frame)}`;
    outStr += `\n Mw: ${describeMw(s.Mw)}`;
    outStr += `\n Mt: ${describeMt(s.Mt)}`;
    outStr += `\n C: ${s.C}`;
    return outStr + '\n==============================';
}

export function debugCheckTaintEntry(s: State, v: any): string {
    var outStr = `v is ${inspect(v)}`;
    F.matchMaybe(s.Mw.get(v), {
        Just: ([id, _]) => {
            outStr += `\nid is ${describeID(id)}`;
            F.matchMaybe(s.Mt.get(id), {
                Just: (tE) => {
                    outStr += `\ntE is ${describeTE(tE)}`;
                },
                Nothing: () => {
                    outStr += `\nNo tE for v`;
                }
            });
        },
        Nothing: () => {
            if (typeof v == 'object') {
                outStr += `\nv is an object`;
                F.matchMaybe(s.Mt.get(v), {
                    Just: (tE) => {
                        outStr += `\ntE is ${describeTE(tE)}`;
                    },
                    Nothing: () => {
                        outStr += `\nNo tE for v`;
                    }
                });
            } else {
                outStr += `\nNo id for v`;
            }
        }
    });
    return outStr;
}

export function assertSaneStateTransform(bef: State, aft: State) {
    if (bef.Mw.size() > aft.Mw.size()) {
        // we lost some wrapping
        throw Error(`Lost wrapping: before\n
        Mw: ${describeMw(bef.Mw)}\n 
        after\n
        Mw: ${describeMw(aft.Mw)}\n`);
    }

    // Mw bef is strictly a subset of Mw aft
    bef.Mw.forEach(function([id, _], wrapped) {
        if (!aft.Mw.has_key(wrapped)) {
            throw Error(`${inspect(wrapped)} went missing in new state.\n`);
        }
    });
}

