import { spawn } from 'child_process';
import { Maybe, Result } from './functional';


export enum ProcessStatus {
    NotRun = 'NotRun',
    Running = 'Running',
    Incomplete = 'Incomplete',
    ExitZero = 'ExitZero',
    ExitNonZero = 'ExitNonZero',
    Timeout = 'Timeout',
}


export class AsyncProcess {
    private _cmd: string;
    private _args: Array<string>;
    private _timeoutLen: number;
    private _stdout: Maybe<string>;
    private _stderr: Maybe<string>;
    private _exitCode: Maybe<number>;
    private _status: ProcessStatus;
    private _options: Maybe<Record<string, any>>;
    constructor(cmd: string, args: Array<string>, timeoutLen: number, options?: Record<string, any>) {
        this._cmd = cmd;
        this._args = args;
        this._timeoutLen = timeoutLen;
        this._stdout = Maybe.Nothing();
        this._stderr = Maybe.Nothing();
        this._exitCode = Maybe.Nothing();
        this._status = ProcessStatus.NotRun;
        if (options !== undefined) {
            this._options = Maybe.Just(options);
        } else {
            this._options = Maybe.Nothing();
        }
    }
    cmd() {
        return this._cmd;
    }
    args() {
        return this._args;
    }
    timeoutLen() {
        return this._timeoutLen;
    }
    stdout(): Maybe<string> {
        return this._stdout;
    }
    stderr(): Maybe<string> {
        return this._stderr;
    }
    output(): string {
        return this._stdout.orDefault('') + this._stderr.orDefault('');
    }
    exitCode(): Maybe<number> {
        return this._exitCode;
    }
    status(): ProcessStatus {
        return this._status;
    }
    async run() {
        this._status = ProcessStatus.Running;
        const child = spawn(this._cmd, this._args, this._options.orDefault({}));
        let timeoutHit = false;
        const timeoutHandle = setTimeout(() => {
            try {
                process.kill(child.pid, 'SIGKILL');
                timeoutHit = true;
            } catch (err) {
                throw Error(`Failed to kill child in timeout:\n${err.message}`);
            }
        }, this._timeoutLen);
        let stdout = '';
        for await (const chunk of child.stdout) {
            stdout += chunk;
        }
        let stderr = '';
        for await (const chunk of child.stderr) {
            stderr += chunk;
        }
        let exitCode: number = await new Promise((resolve, reject) => {
            child.on('close', resolve);
            clearTimeout(timeoutHandle);
        });
        if (stdout !== '') {
            this._stdout = Maybe.Just(stdout);
        }
        if (stderr !== '') {
            this._stderr = Maybe.Just(stderr);
        }
        if (timeoutHit) {
            this._status = ProcessStatus.Timeout;
        } else {
            this._exitCode = Maybe.Just(exitCode);
            if (exitCode === 0) {
                this._status = ProcessStatus.ExitZero;
            } else {
                this._status = ProcessStatus.ExitNonZero;
            }
        }
    }
    incomplete(): boolean {
        return this._status === ProcessStatus.NotRun || this._status === ProcessStatus.Running;
    }
    timeout(): boolean {
        return this._status === ProcessStatus.Timeout;
    }
    exitZero(): boolean {
        return this._status === ProcessStatus.ExitZero;
    }
    exitNonZero(): boolean {
        return this._status === ProcessStatus.ExitNonZero;
    }
    checkResult(): Result<null, ProcessStatus> {
        if (this.incomplete()) {
            return Result.Failure(ProcessStatus.Incomplete);
        }
        if (this.timeout()) {
            return Result.Failure(ProcessStatus.Timeout);
        }
        if (this.exitNonZero()) {
            return Result.Failure(ProcessStatus.ExitNonZero);
        }
        return Result.Success(null);
    }
    outputHasError(): Maybe<boolean> {
        if (this._status === ProcessStatus.NotRun || this._status === ProcessStatus.Running) {
            return Maybe.Nothing();
        }
        if (this._stdout.isNothing() && this._stderr.isNothing()) {
            return Maybe.Nothing();
        } else {
            const errorTypes = ['SyntaxError', 'TypeError', 'ReferenceError', 'RangeError', 'Error'];
            const stdout = this._stdout.orDefault('');
            const stderr = this._stderr.orDefault('');
            for (const errorType of errorTypes) {
                if (stdout.indexOf(errorType) != -1) {
                    return Maybe.Just(true);
                }
                if (stderr.indexOf(errorType) != -1) {
                    return Maybe.Just(true);
                }
            }
            return Maybe.Just(false);
        }
    }
}
