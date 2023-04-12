import { taintEntry, PropMap } from "./State";
import { F, Either } from './Flib';
import { emptyPathNode } from "./TaintPaths";


function encodeStringTaint(x: string, taint_map: number[]) : Either<string, Error> {
    if (x.length != taint_map.length) {
        return F.Right(Error("Taint map and string length must match"));
    }
    let codePoints: number[] = [];
    for (let i = 0; i < x.length; i++) {
        let charCode = x.codePointAt(i);
        let taintBit = taint_map[i] ? 0xF1000 :  0xF0000;
        let codePoint = taintBit | charCode;
        codePoints.push(codePoint);
    }
    let res = String.fromCodePoint(...codePoints);
    return F.Left(res);
}

function decodeStringTaint(x: string): Either<[string, number[]], Error> {
    let codePoints: number[] = [];
    let taint_map = [];
    let xP = Array.from(x);
    for (let i = 0; i < xP.length; i++) {
        let codePoint = xP[i].codePointAt(0);
        if ((codePoint & 0xF0000) > 0) {
            let taintBit = (codePoint & 0x01000) > 0 ? 1 : 0;
            taint_map.push(taintBit);
            let codePointP = codePoint ^ (taintBit ? 0xF1000 : 0xF0000);
            codePoints.push(codePointP);
        } else {
            taint_map.push(0);
            codePoints.push(codePoint);
        }
    }
    let res = String.fromCodePoint(...codePoints);
    if (res.length != taint_map.length) {
        return F.Right(Error("Taint map and string length did not match!"));
    }
    return F.Left([res, taint_map]);
}

function initializeTaintMap(len: number, taintAll: boolean, tainted: number[]): number[] {
    let taintMap: number[] = [];
    for (let i = 0; i < len; i++) {
        if (taintAll) {
            taintMap.push(1);
        } else {
            if (tainted.indexOf(i) != -1) {
                taintMap.push(1);
            } else {
                taintMap.push(0);
            }
        }
    }
    return taintMap;
}

function taintBitsFromEntry(value: string, tE: taintEntry): number[] {
    return F.matchMaybe(tE.map, {
        Just: (m: PropMap): number[] => {
            var taintedBits = [];
            m.forEach(function(taintBit, key, map) {
                if (tE.taintBit == true || taintBit == true) {
                    taintedBits.push(Number.parseInt(key));
                }
            });
            return initializeTaintMap(value.length, false, taintedBits);
        },
        Nothing: (): number[] => initializeTaintMap(value.length, tE.taintBit, []),
    });
}

const allBitsTainted = (taintBits: number[]): boolean => taintBits.every((bit) => bit == 1);

export function encodeStringFromEntry(str: string, tE: taintEntry): Either<string, Error> {
    let taintBits = taintBitsFromEntry(str, tE);
    return encodeStringTaint(str,taintBits);
}

export function decodeStringToEntry(encodedString: string): Either<[string, taintEntry], Error> {
    return F.matchEither(decodeStringTaint(encodedString), {
        Left: ([decodedResult, resultTaintBits]) => {
            let allTainted = allBitsTainted(resultTaintBits);
            let propMap = new PropMap(decodedResult);
            let oneTainted = allTainted;
            for (const i in resultTaintBits) {
                propMap.set(i.toString(), allTainted || (resultTaintBits[i] == 1));
                oneTainted = oneTainted || (resultTaintBits[i] == 1);
            };
            // Taint the length key if at least one character was tainted
            if (oneTainted) {
                propMap.set('length', true);
            }
            let tEr: taintEntry =  {
                taintBit: allTainted,
                map: F.Just(propMap),
                // Need to correctly set this path
                path: emptyPathNode(decodedResult),
            };
            return F.Left([decodedResult, tEr]);
        },
        Right: (err) => F.Right(err),
    });
}
