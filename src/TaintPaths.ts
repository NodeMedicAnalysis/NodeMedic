import * as graphviz from 'graphviz';
import { Maybe, F } from './Flib';
import { inspect } from './Trace';
import { taintEntry } from './State';
import { writeFileSync } from 'fs';


// Generate taint flow paths
let TAINTPATHS: boolean = false;
// JSON output of taint flow paths
let TAINTPATHSJSON: boolean = false;

export function setTAINTPATHS(v: boolean) {
    TAINTPATHS = v;
}

export function setTAINTPATHSJSON(v: boolean) {
    TAINTPATHSJSON = v;
}

export interface PathNode {
    label: string,
    parents: Set<PathNode>
    value: string,
    tainted: boolean,
}

export function emptyPathNode(value: any): PathNode {
    return {
        label: 'Untainted',
        parents: new Set(),
        value: `${inspect(value)}`,
        tainted: false,
    };
}

export function joinTEPaths(taintEntries: taintEntry[]): PathNode[] {
    let resultPaths = [];
    for (let i in taintEntries) {
        let tE: taintEntry = taintEntries[i];
        resultPaths.push(tE.path);
    }
    return resultPaths;
}

export function newPathNode(label: string, parents: PathNode[], value: any): PathNode {
    if (parents.length == 0) {
        // If there are no parents then this is not tainted
        return {
            label: label,
            parents: new Set([emptyPathNode(value)]),
            value: `${inspect(value)}`,
            tainted: false,
        }
    } else {
        let anyTainted = false;
        for (let i in parents) {
            if (!F.isUndefinedOrNull(parents[i])) {
                let parent = parents[i];
                anyTainted = anyTainted || parent.tainted;
            }
        }
        anyTainted = anyTainted || (label == 'Tainted');
        return {
            label: label,
            parents: new Set(parents),
            value: `${inspect(value)}`,
            tainted: anyTainted,
        }
    }
}

function describePathInner(g: any, pn: PathNode, childNode: Maybe<object>, id: number) {
    let sanitizedValue1 = pn.value.split('"').join('');
    let sanitizedValue2 = sanitizedValue1.split('`').join('');
    let parentNode = g.addNode(`(${id}) ${pn.label}\n${sanitizedValue2}`);
    F.matchMaybe(childNode, {
        Just: (node: object) => {
            let e = g.addEdge(parentNode, node);
            if (pn.tainted) {
                e.set('color', 'red');
            }
        },
        Nothing: () => {}
    });
    pn.parents.forEach((parent: PathNode) => {
        id = describePathInner(g, parent, F.Just(parentNode), id + 1);
    });
    return id;
}

function describePathInnerJSON(out: any, pn: PathNode, id: number) {
    let this_id = id;
    let sanitizedValue1 = pn.value.split('"').join('');
    let sanitizedValue2 = sanitizedValue1.split('`').join('');
    let flows_from = [];
    pn.parents.forEach((parent: PathNode) => {
        id = id + 1;
        flows_from.push(id.toString());
        id = describePathInnerJSON(out, parent, id);
    });
    out[this_id] = {
        'operation': `${pn.label}`,
        'value': `${sanitizedValue2}`,
        'tainted': pn.tainted,
        'flows_from': flows_from,
    };
    return id;
}

export function describePath(pn: PathNode, filename?: string) {
    if (TAINTPATHS) {
        // Create digraph G
        // @ts-ignore
        let g = graphviz.digraph("Taint_Paths");
        describePathInner(g, pn, F.Nothing(), 1);
        // Generate a PNG output
        let filePath = (filename == null) ? 'taint.pdf' : `taint_${filename}.pdf`;
        try {
            g.output('pdf', filePath);
        } catch(err) {
            throw Error(`Failed to output JSON taint path: ${err}`);
        }
    }
    if (TAINTPATHSJSON) {
        let out = {};
        describePathInnerJSON(out, pn, 1);
        let filePath = (filename == null) ? 'taint.json' : `taint_${filename}.json`;
        try {
            writeFileSync(filePath, JSON.stringify(out, null, 4));
        } catch(err) {
            throw Error(`Failed to output JSON taint path: ${err}`);
        }
    }
}
