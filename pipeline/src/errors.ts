import { ProcessStatus } from './process';
import { Maybe } from './functional';


export class BaseError {
    constructor() { }
    toString(): string {
        return `BaseError()`;
    }
    toJSON() {
        return {
            'errorType': 'BaseError',
        };
    }
}


export class PipelineError extends BaseError {
    private _msg: string;
    constructor(msg: string) {
        super();
        this._msg = msg;
    }
    msg(): string {
        return this._msg;
    }
    toString(): string {
        return `PipelineError(${this._msg})`;
    }
    toJSON() {
        return {
            'errorType': 'PipelineError',
            'msg': this._msg,
        };
    }
}


export class ResultError extends BaseError {
    private _result;
    constructor(result: string) {
        super();
        this._result = result;
    }
    toString(): string {
        return `ResultError(${this._result})`;
    }
    toJSON() {
        return {
            'errorType': 'ResultError',
            'result': this._result,
        };
    }
}


export class ProcessError extends BaseError {
    private _status: ProcessStatus;
    private _output: Maybe<string>
    constructor(status: ProcessStatus, output?: string) {
        super();
        this._status = status;
        if (output !== undefined) {
            this._output = Maybe.Just(output);
        } else {
            this._output = Maybe.Nothing();
        }
    }
    toString() {
        return `ProcessError(${this._status}, ${this._output.orDefault('')})`;
    }
    toJSON() {
        return {
            'errorType': 'ProcessError',
            'status': this._status.toString(),
            'output': this._output.orDefault(''),
        };
    }
}


export class ProcessOutputError extends BaseError {
    private _output: string;
    constructor(output: string) {
        super();
        this._output = output;
    }
    toString() {
        return `ProcessOutputError(${this._output})`;
    }
    toJSON() {
        return {
            'errorType': 'ProcessOutputError',
            'output': this._output,
        };
    }
}


export class ProcessTimeoutError extends BaseError {
    _timeoutLen: number;
    _output: Maybe<string>
    constructor(timeoutLen: number, output?: string) {
        super();
        this._timeoutLen = timeoutLen;
        if (output !== undefined) {
            this._output = Maybe.Just(output);
        } else {
            this._output = Maybe.Nothing();
        }
    }
    toString() {
        return `ProcessTimeoutError(${this._timeoutLen}, ${this._output.orDefault('')})`;
    }
    toJSON() {
        return {
            'errorType': 'ProcessTimeoutError',
            'timeoutLen': this._timeoutLen,
            'output': this._output.orDefault(''),
        };
    }
}
