import { hrtime } from 'process';
import { Path, Bound } from "./utilities";
import { Maybe, Result } from "./functional";
import {
    filterByAPIs, filterByMain, filterByDownloadCount,
    setupPackageEnv, setupPackageDependencies, setupPackageDriver,
    getPackageVersion, getPackageEntryPoints, runNonInst,
    runAnalysis, checkSinkType, generateSMT, solveSMT,
    parseSMTOut, checkExploit, annotateNoInstrument,
    runJalangiBabel, triageFlow,
} from "./actions";
import { Context, Task, TaskStatus, Pipeline } from "./pipeline";
import { PackageData, EntryPoint, ExploitResult, SinkType, TriageData } from "./package";
import { BaseError, ResultError } from "./errors";


function completeTask(
    context: Context,
    task: Task,
    thePackage: PackageData,
    startTime: bigint, // nanoseconds
) {
    const elapsedTime = Number(
        (hrtime.bigint() - startTime) / BigInt(1e6) // milliseconds
    );
    const logger = context.getProperty('logger');
    logger.debug(`[Step][${task.name()}]: Complete`);
    thePackage.registerTaskResult(task.name(), {
        'status': TaskStatus.Continue.toString(),
        'time': elapsedTime,
    });
    task.setStatus(TaskStatus.Continue);
    return context;
}


function abortTaskWithError(
    context: Context,
    task: Task,
    thePackage: PackageData,
    error: BaseError,
    startTime: bigint, // nanoseconds
) {
    const elapsedTime = Number(
        (hrtime.bigint() - startTime) / BigInt(1e6) // milliseconds
    );
    const logger = context.getProperty('logger');
    logger.debug(`[Step][${task.name()}]: ${error.toString()}`);
    thePackage.registerTaskResult(task.name(), {
        'status': TaskStatus.Abort.toString(),
        'time': elapsedTime,
        'result': error.toJSON(),
    });
    task.setStatus(TaskStatus.Abort);
    return context;
}


export function buildPipeline(logger): Pipeline {
    const pipeline = new Pipeline(
        [
            'downloadCount',
            'setupPackage',
            'filterByMain',
            'filterBrowserAPIs',
            'filterSinks',
            'setupDependencies',
            'getEntryPoints',
            'runNonInstrumented',
            'annotateNoInstrument',
            'runJalangiBabel',
            'runInstrumented',
            'triageFlow',
            'setSinkType',
            'smt',
            'checkExploit',
        ],  
        logger
    );
    pipeline.registerTask(
        new Task(
            'downloadCount',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                logger.debug(`[Step][${this.name()}]: Check download count`);
                const targetDownloadCount: number = context.getProperty('targetDownloadCount');
                const thePackage: PackageData = context.getProperty('thePackage');
                const startTime = hrtime.bigint();
                if (targetDownloadCount > 0) {
                    const bound: Bound = context.getProperty('bound');
                    const outputDir: Path = context.getProperty('outputDir');
                    const result: Result<number, BaseError> = await filterByDownloadCount(
                        thePackage, targetDownloadCount, bound, outputDir
                    );
                    if (result.isFailure()) {
                        return abortTaskWithError(context, this, thePackage, result.unwrap() as BaseError, startTime);
                    }
                    thePackage.setDownloadCount(result.unwrap() as number);
                } else {
                    logger.debug(`[Step][${this.name()}]: Skipping check because target is 0`);
                }
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'setupPackage',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const thePackage: PackageData = context.getProperty('thePackage');
                const cacheDir: Path = context.getProperty('cacheDir');
                logger.debug(`[Step][${this.name()}]: Setup package environment`);
                const startTime = hrtime.bigint();
                const packagePathResult = await setupPackageEnv(
                    thePackage.name(), thePackage.version(), cacheDir
                );
                if (packagePathResult.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, packagePathResult.unwrap() as BaseError, startTime);
                }
                const packagePath: Path = packagePathResult.unwrap() as Path;
                logger.debug(`Package path is: ${packagePath}`);
                thePackage.setPackagePath(packagePath);
                logger.debug(`[Step][${this.name()}]: Get and set package version`);
                const packageVersionResult = await getPackageVersion(
                    thePackage.path()
                );
                if (packageVersionResult.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, packageVersionResult.unwrap() as BaseError, startTime);
                }
                const packageVersion: string = packageVersionResult.unwrap() as string;
                thePackage.setVersion(packageVersion);
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'filterByMain',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const thePackage: PackageData = context.getProperty('thePackage');
                logger.debug(`[Step][${this.name()}]: Check for main`);
                const startTime = hrtime.bigint();
                const result = await filterByMain(thePackage.path());
                if (result.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result.unwrap() as BaseError, startTime);
                }
                thePackage.setHasMain(true);
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'filterBrowserAPIs',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const thePackage: PackageData = context.getProperty('thePackage');
                const browserAPIs: Array<string> = context.getProperty('browserAPIs');
                logger.debug(`[Step][${this.name()}]: Ensure no browser APIs are used`);
                const startTime = hrtime.bigint();
                const result: Result<Array<string>, BaseError> = await filterByAPIs(
                    thePackage.path(), browserAPIs
                );
                if (result.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result.unwrap() as BaseError, startTime);
                }
                const packageBrowserAPIs = result.unwrap() as Array<string>;
                thePackage.setBrowserAPIs(packageBrowserAPIs);
                if (packageBrowserAPIs.length > 0) {
                    return abortTaskWithError(context, this, thePackage, new ResultError(`Package has browser APIs: ${packageBrowserAPIs}`), startTime);
                }
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'filterSinks',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const thePackage: PackageData = context.getProperty('thePackage');
                const sinks: Array<string> = context.getProperty('sinks');
                logger.debug(`[Step][${this.name()}]: Check for presence of sinks`);
                const startTime = hrtime.bigint();
                const result: Result<Array<string>, BaseError> = await filterByAPIs(
                    thePackage.path(), sinks
                );
                if (result.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result.unwrap() as BaseError, startTime);
                }
                const packageSinks = result.unwrap() as Array<string>;
                thePackage.setSinks(packageSinks);
                if (packageSinks.length == 0) {
                    return abortTaskWithError(context, this, thePackage, new ResultError('Package has no sinks'), startTime);
                }
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'setupDependencies',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const thePackage: PackageData = context.getProperty('thePackage');
                logger.debug(`[Step][${this.name()}]: Setup package dependencies`);
                const startTime = hrtime.bigint();
                const result = await setupPackageDependencies(thePackage.path());
                if (result.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result.unwrap() as BaseError, startTime);
                }
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'getEntryPoints',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const thePackage: PackageData = context.getProperty('thePackage');
                const tmpDir: Path = context.getProperty('tmpDir');
                logger.debug(`[Step][${this.name()}]: Get package entry points`);
                const startTime = hrtime.bigint();
                const result: Result<EntryPoint[], BaseError> = await getPackageEntryPoints(thePackage, tmpDir);
                if (result.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result.unwrap() as BaseError, startTime);
                }
                const entryPoints = result.unwrap() as EntryPoint[];
                thePackage.setEntryPoints(entryPoints);
                if (entryPoints.length == 0) {
                    return abortTaskWithError(context, this, thePackage, new ResultError('Package has no entry points'), startTime);
                }
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'runNonInstrumented',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const thePackage: PackageData = context.getProperty('thePackage');
                const failOnOutputError: boolean = context.getProperty('failOnOutputError');
                const failOnNonZeroExit: boolean = context.getProperty('failOnNonZeroExit');
                logger.debug(`[Step][${this.name()}]: Setup non-instrumented package driver`);
                const startTime = hrtime.bigint();
                const result: Result<Path, BaseError> = await setupPackageDriver(thePackage, false);
                if (result.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result.unwrap() as BaseError, startTime);
                }
                const nonInstTemplatePath = result.unwrap() as Path;
                logger.debug(`[Step][${this.name()}]: Run non-instrumented package driver`);
                const result2 = await runNonInst(nonInstTemplatePath, failOnOutputError, failOnNonZeroExit);
                if (result2.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result2.unwrap() as BaseError, startTime);
                }
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'annotateNoInstrument',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const thePackage: PackageData = context.getProperty('thePackage');
                const minNumDeps: number = context.getProperty('minNumDeps');
                const minDepth: number = context.getProperty('minDepth');
                logger.debug(`[Step][${this.name()}]: Annotate no-instrument`);
                const startTime = hrtime.bigint();
                const result: Result<object, BaseError> = await annotateNoInstrument(
                    thePackage, minNumDeps, minDepth
                );
                if (result.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result.unwrap() as BaseError, startTime);
                }
                thePackage.setTreeMetadata(result.unwrap());
                return completeTask(context, this, thePackage, startTime);
            }
        )
    );
    pipeline.registerTask(
        new Task(
            'runJalangiBabel',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const thePackage: PackageData = context.getProperty('thePackage');
                const requireSinkHit: boolean = context.getProperty('requireSinkHit');
                const failOnOutputError: boolean = context.getProperty('failOnOutputError');
                const failOnNonZeroExit: boolean = context.getProperty('failOnNonZeroExit');
                logger.debug(`[Step][${this.name()}]: Setup Jalangi2-babel package driver`);
                const startTime = hrtime.bigint();
                const result: Result<Path, BaseError> = await setupPackageDriver(thePackage, false);
                if (result.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result.unwrap() as BaseError, startTime);
                }
                const nonInstTemplatePath = result.unwrap() as Path;
                logger.debug(`[Step][${this.name()}]: Run Jalangi2-babel package driver`);
                const result2: Result<Maybe<Array<string>>, BaseError> = await runJalangiBabel(
                    nonInstTemplatePath, requireSinkHit, failOnOutputError, failOnNonZeroExit,
                );
                if (result2.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result2.unwrap() as BaseError, startTime);
                }
                const maybeSinkHit: Maybe<Array<string>> = result2.unwrap() as Maybe<Array<string>>;
                thePackage.setSinksHit(maybeSinkHit.orDefault([]));
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'runInstrumented',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const thePackage: PackageData = context.getProperty('thePackage');
                const policies: string = context.getProperty('policies');
                const failOnOutputError: boolean = context.getProperty('failOnOutputError');
                const failOnNonZeroExit: boolean = context.getProperty('failOnNonZeroExit');
                logger.debug(`[Step][${this.name()}]: Setup instrumented package driver`);
                const startTime = hrtime.bigint();
                const result: Result<Path, BaseError> = await setupPackageDriver(thePackage, true);
                if (result.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result.unwrap() as BaseError, startTime);
                }
                const templatePath = result.unwrap() as Path;
                logger.debug(`[Step][${this.name()}]: Run instrumented package driver`);
                const result2: Result<Path, BaseError> = await runAnalysis(
                    templatePath, policies, failOnOutputError, failOnNonZeroExit,
                );
                if (result2.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result2.unwrap() as BaseError, startTime);
                }
                context.setProperty('taintJSONPath', result2.unwrap());
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'triageFlow',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const taintJSONPath = context.getProperty('taintJSONPath');
                const thePackage: PackageData = context.getProperty('thePackage');
                logger.debug(`[Step][${this.name()}]: Running triage model on provenance graph`);
                const startTime = hrtime.bigint();
                const triageData: Result<object, BaseError> = await triageFlow(taintJSONPath);
                if (triageData.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, triageData.unwrap() as BaseError, startTime);
                }
                thePackage.setTriageData(triageData.unwrap() as TriageData);
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'setSinkType',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const taintJSONPath = context.getProperty('taintJSONPath');
                const thePackage: PackageData = context.getProperty('thePackage');
                logger.debug(`[Step][${this.name()}]: Checking taint output for vulnerable sinks`);
                const startTime = hrtime.bigint();
                const result: Result<SinkType, BaseError> = await checkSinkType(taintJSONPath);
                if (result.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, result.unwrap() as BaseError, startTime);
                }
                thePackage.setSinkType(result.unwrap() as SinkType);
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'smt',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const taintJSONPath = context.getProperty('taintJSONPath');
                const thePackage: PackageData = context.getProperty('thePackage');
                const z3Path: Maybe<Path> = context.getProperty('z3Path');
                logger.debug(`[Step][${this.name()}]: Getting SMT statement to confirm vulnerable sink`);
                const startTime = hrtime.bigint();
                const smtPathResult: Result<Path, BaseError> = await generateSMT(taintJSONPath);
                if (smtPathResult.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, smtPathResult.unwrap() as BaseError, startTime);
                }
                logger.debug(`[Step][${this.name()}]: Solving SMT statement`);
                const smtOutPathResult: Result<Path, BaseError> = await solveSMT(
                    smtPathResult.unwrap() as Path,
                    z3Path
                );
                if (smtOutPathResult.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, smtOutPathResult.unwrap() as BaseError, startTime);
                }
                logger.debug(`[Step][${this.name()}]: Parsing SMT output`);
                const exploitResult: Result<string, BaseError> = await parseSMTOut(
                    smtOutPathResult.unwrap() as Path
                );
                if (exploitResult.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, exploitResult.unwrap() as BaseError, startTime);
                }
                thePackage.setCandidateExploit(exploitResult.unwrap() as string);
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    pipeline.registerTask(
        new Task(
            'checkExploit',
            async function (context: Context): Promise<Context> {
                const logger = context.getProperty('logger');
                const thePackage: PackageData = context.getProperty('thePackage');
                const failOnNonZeroExit: boolean = context.getProperty('failOnNonZeroExit');
                logger.debug(`[Step][${this.name()}]: Checking SMT-generated exploit to confirm vulnerability`);
                const startTime = hrtime.bigint();
                const successfulExploitsResult: Result<ExploitResult[], BaseError> = await checkExploit(thePackage, failOnNonZeroExit);
                if (successfulExploitsResult.isFailure()) {
                    return abortTaskWithError(context, this, thePackage, successfulExploitsResult.unwrap() as BaseError, startTime);
                }
                const successfulExploits = successfulExploitsResult.unwrap() as ExploitResult[];
                thePackage.setExploitResults(successfulExploits);
                if (successfulExploits.length == 0) {
                    return abortTaskWithError(context, this, thePackage, new ResultError('Package has no confirmed exploits'), startTime);
                }
                logger.info(`\tExploit(s) found for functions: ${successfulExploits.map((x) => x.exploitFunction)}`);
                return completeTask(context, this, thePackage, startTime);
            },
        )
    );
    return pipeline;
}
