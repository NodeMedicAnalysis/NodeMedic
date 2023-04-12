interface Logger {
    debug: (msg: string) => void,
    info: (msg: string) => void,
    warn: (msg: string) => void,
    error: (msg: string) => void,
}


export class Context {
    private _properties: Record<string, any>;
    constructor(properties?: Record<string, any>) {
        this._properties = properties;
    }
    setProperty(key: string, value: any) {
        this._properties[key] = value;
    }
    getProperty(key: string): any {
        return this._properties[key];
    }
}


export enum TaskStatus {
    NotRun = 'NotRun',
    Started = 'Running',
    Continue = 'Continue',
    Abort = 'Abort'
}


export class Task {
    private _name: string;
    private _f: (Context) => Promise<Context>;
    private _status: TaskStatus;
    constructor(
        name: string,
        f: (Context) => Promise<Context>,
    ) {
        this._name = name;
        this._f = f;
        this._status = TaskStatus.NotRun;
    }
    name(): string {
        return this._name;
    }
    setStatus(status: TaskStatus) {
        this._status = status;
    }
    async execute(context: Context): Promise<[Context, TaskStatus]> {
        this._status = TaskStatus.Started;
        const nextContext = await this._f(context);
        return [nextContext, this._status];
    }
}


export class Pipeline {
    private _logger: Logger;
    private _tasks: Record<string, Task>;
    private _taskList: Array<string>;
    private _completedTasks: Array<string>;
    constructor(taskList: Array<string>, logger?: Logger) {
        if (logger !== undefined) {
            this._logger = logger;
        } else {
            this._logger = console;
        }
        this._tasks = {};
        this._taskList = taskList;
        this._completedTasks = [];
    }
    registerTask(task: Task) {
        this._tasks[task.name()] = task;
    }
    completedTask(taskName: string): boolean {
        return this._completedTasks.includes(taskName);
    }
    lastCompleted(): string {
        if (this._completedTasks.length == 0) {
            throw Error('No last completed: Pipeline has completed no tasks!');
        }
        return this._completedTasks[this._completedTasks.length - 1];
    }
    async execute(initialContext: Context, taskList?: Array<string>) {
        this._completedTasks = [];
        let context = initialContext;
        if (taskList === undefined) {
            taskList = this._taskList;
        }
        this._logger.debug(`Executing ${taskList.length} tasks...`);
        let count = 1;
        for (const taskName of taskList) {
            if (!Object.getOwnPropertyNames(this._tasks).includes(taskName)) {
                throw Error(`Task ${taskName} not found in registered tasks`);
            }
            try {
                this._logger.debug(`Executing task ${count} of ${taskList.length}: ${taskName}`);
                const [nextContext, status] = await this._tasks[taskName].execute(context);
                if (status === TaskStatus.Abort) {
                    this._logger.info(`Stopping pipeline at task ${taskName}`);
                    break;
                } else if (status === TaskStatus.Started || status === TaskStatus.NotRun) {
                    this._logger.error(`Error running task; stalled with status: ${status}`);
                    break;
                } else if (status == TaskStatus.Continue) {
                    this._completedTasks.push(taskName);
                    context = nextContext;
                    count++;
                }
            } catch (err) {
                this._logger.error(`Failed to execute task ${taskName}:\n${err}`);
                break;
            }
        }
        this._logger.debug(`Pipeline complete`);
    }
}
