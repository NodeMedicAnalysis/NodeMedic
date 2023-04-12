import { Maybe } from './functional';
import { Path } from './utilities';


export enum SinkType {
    evalSink = 'eval',
    execSink = 'exec',
}


export interface EntryPoint {
    functionName: string,
    numArguments: number,
    isMethod: boolean,
    isConstructor: boolean,
    fromConstructor: boolean,
}

export interface TriageResult {
    analysisTimeSec: number,
    rating: string,
    score: number,
}


export interface TriageData {
    countNodes: number,
    longestPath: number,
    countLeaves: number,
    countControllableLeaves: number,
    countImplicit: number,
    implicit: Array<string>,
    countExplicit: number,
    explicit: Array<string>,
    countAccess: number,
    objectAccess: Array<string>,
    operations: number,
    sink: string,
    result: TriageResult,
}


export interface ExploitResult {
    exploitFunction: string,
    exploitString: string,
}


export interface PackageResult {
    name: string,
    version: string,
    completed: boolean,
    results: ExploitResult[] | null,
    error: string | null,
}


export class PackageData {
    _name: string;
    _index: Maybe<number>;
    _version: Maybe<string>;
    _downloadCount: Maybe<number>;
    _packagePath: Maybe<Path>;
    _hasMain: Maybe<boolean>;
    _browserAPIs: Maybe<Array<string>>;
    _sinks: Maybe<Array<string>>;
    _sinksHit: Maybe<Array<string>>;
    _entryPoints: Maybe<Array<EntryPoint>>;
    _treeMetadata: Maybe<object>;
    _triageData: Maybe<TriageData>;
    _sinkType: Maybe<SinkType>;
    _candidateExploit: Maybe<string>;
    _exploitResults: Maybe<Array<ExploitResult>>;
    _taskResults: Record<string, Record<string, any>>;
    constructor(name: string) {
        this._name = name;
        this._index = Maybe.Nothing();
        this._version = Maybe.Nothing();
        this._downloadCount = Maybe.Nothing();
        this._packagePath = Maybe.Nothing();
        this._hasMain = Maybe.Nothing();
        this._browserAPIs = Maybe.Nothing();
        this._sinks = Maybe.Nothing();
        this._sinksHit = Maybe.Nothing();
        this._entryPoints = Maybe.Nothing();
        this._treeMetadata = Maybe.Nothing();
        this._triageData = Maybe.Nothing();
        this._sinkType = Maybe.Nothing();
        this._candidateExploit = Maybe.Nothing();
        this._exploitResults = Maybe.Nothing();
        this._taskResults = {};
    }
    identifier(): string {
        let version = '*';
        if (!this._version.isNothing()) {
            version = this._version.unwrap();
        }
        return `${this._name}@${version}`;
    }
    name(): string {
        return this._name;
    }
    version(): string {
        if (this._version.isNothing()) {
            return '*';
        } else {
            return this._version.unwrap();
        }
    }
    path(): Path {
        if (this._packagePath.isNothing()) {
            throw Error('Attempted to access unset package path');
        }
        return this._packagePath.unwrap();
    }
    entryPoints(): Array<EntryPoint> {
        if (this._entryPoints.isNothing()) {
            throw Error('Attempted to access unset entryPoints');
        }
        return this._entryPoints.unwrap();
    }
    sinkType(): SinkType {
        if (this._sinkType.isNothing()) {
            throw Error('Attempted to access unset sinkType');
        }
        return this._sinkType.unwrap();
    }
    candidateExploit(): string {
        if (this._candidateExploit.isNothing()) {
            throw Error('Attempted to access unset exploit');
        }
        return this._candidateExploit.unwrap();
    }
    setIndex(idx: number) {
        this._index = Maybe.Just(idx);
    }
    setVersion(versionStr: string) {
        this._version = Maybe.Just(versionStr);
    }
    setDownloadCount(count: number) {
        this._downloadCount = Maybe.Just(count);
    }
    setPackagePath(packagePath: Path) {
        this._packagePath = Maybe.Just(packagePath);
    }
    setHasMain(hasMain: boolean) {
        this._hasMain = Maybe.Just(hasMain);
    }
    setBrowserAPIs(browserAPIs: Array<string>) {
        this._browserAPIs = Maybe.Just(browserAPIs);
    }
    setSinks(sinks: Array<string>) {
        this._sinks = Maybe.Just(sinks);
    }
    setSinksHit(sinksHit: Array<string>) {
        this._sinksHit = Maybe.Just(sinksHit);
    }
    setEntryPoints(entryPoints: Array<EntryPoint>) {
        this._entryPoints = Maybe.Just(entryPoints);
    }
    setTreeMetadata(treeMetadata: object) {
        this._treeMetadata = Maybe.Just(treeMetadata);
    }
    setTriageData(triageData: TriageData) {
        this._triageData = Maybe.Just(triageData);
    }
    setSinkType(sinkType: SinkType) {
        this._sinkType = Maybe.Just(sinkType);
    }
    setCandidateExploit(exploit: string) {
        this._candidateExploit = Maybe.Just(exploit);
    }
    setExploitResults(exploitResults: Array<ExploitResult>) {
        this._exploitResults = Maybe.Just(exploitResults);
    }
    registerTaskResult(taskName: string, taskResult: Record<string, any>) {
        this._taskResults[taskName] = taskResult;
    }
    toJSON(): object {
        let obj = {};
        let self = this;
        Object.getOwnPropertyNames(self).forEach(function (name, idx, arr) {
            let value = self[name];
            if (value instanceof Maybe) {
                if (value.isNothing()) {
                    value = '';
                } else {
                    value = value.unwrap();
                }
            }
            if (value instanceof Path) {
                value = value.toString();
            }
            name = name.substring(1);
            if (name == 'name') {
                name = 'id';
            }
            obj[name] = value;
        });
        return obj;
    }
    fromJSON(rawPackage: object) {
        // Maybe fields
        if ('index' in rawPackage && rawPackage['index'] !== '') {
            this.setIndex(rawPackage['index'] as number);
        }
        if ('version' in rawPackage && rawPackage['version'] !== '') {
            this.setVersion(rawPackage['version'] as string);
        }
        if ('downloadCount' in rawPackage && rawPackage['downloadCount'] !== '') {
            this.setDownloadCount(rawPackage['downloadCount'] as number);
        }
        if ('packagePath' in rawPackage && rawPackage['packagePath'] !== '') {
            this.setPackagePath(new Path([rawPackage['packagePath'] as string]));
        }
        if ('hasMain' in rawPackage && rawPackage['hasMain'] !== '') {
            this.setHasMain(rawPackage['hasMain'] as boolean);
        }
        if ('browserAPIs' in rawPackage && rawPackage['browserAPIs'] !== '') {
            this.setBrowserAPIs(rawPackage['browserAPIs'] as string[]);
        }
        if ('sinks' in rawPackage && rawPackage['sinks'] !== '') {
            this.setSinks(rawPackage['sinks'] as string[]);
        }
        if ('sinksHit' in rawPackage && rawPackage['sinksHit'] !== '') {
            this.setSinksHit(rawPackage['sinksHit'] as string[]);
        }
        if ('entryPoints' in rawPackage && rawPackage['entryPoints'] !== '') {
            this.setEntryPoints(rawPackage['entryPoints'] as EntryPoint[]);
        }
        if ('treeMetadata' in rawPackage && rawPackage['treeMetadata'] !== '') {
            this.setTreeMetadata(rawPackage['treeMetadata'] as object);
        }
        if ('triageData' in rawPackage && rawPackage['triageData'] != '') {
            this.setTriageData(rawPackage['triageData'] as TriageData);
        }
        if ('sinkType' in rawPackage && rawPackage['sinkType'] !== '') {
            this.setSinkType(rawPackage['sinkType'] as SinkType);
        }
        if ('candidateExploit' in rawPackage && rawPackage['candidateExploit'] !== '') {
            this.setCandidateExploit(rawPackage['candidateExploit'] as string);
        }
        if ('exploitResults' in rawPackage && rawPackage['exploitResults'] !== '') {
            this.setExploitResults(rawPackage['exploitResults'] as ExploitResult[]);
        }
        // Record fields
        if ('taskResults' in rawPackage) {
            for (const taskName in (rawPackage['taskResults'] as object)) {
                this.registerTaskResult(taskName, rawPackage['taskResults'][taskName]);
            }
        }
    }
}
