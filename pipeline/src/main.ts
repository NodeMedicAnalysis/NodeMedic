import { promises as fs } from 'fs';
import { Command } from 'commander';
import { Human, Filter } from 'caterpillar';
import {
    Path, Bound, readIndex,
    writeIndex, writePackageList, loadFilteredPackageList,
    getPackageList, logger, delay,
    removePackageCache, setupDir, cleanJalangiFiles
} from './utilities';
import { Maybe } from './functional';
import { Context, Pipeline } from './pipeline';
import { buildPipeline } from './tasks';
import { PackageData } from './package';


async function runPipeline(
    targetCount: number,
    bound: Bound,
    downloadCount: number,
    fresh: boolean,
    cache: boolean,
    onlyCacheIncluded: boolean,
    cacheDir: Path,
    outputDir: Path,
    tmpDir: Path,
    packageListBounds: [Maybe<number>, Maybe<number>],
    gatheringOnly: boolean,
    analysisOnly: Maybe<Path>,
    z3Path: Maybe<Path>,
    minNumDeps: Maybe<number>,
    minDepth: Maybe<number>,
    policies: Maybe<string>,
    requireSinkHit: boolean,
    failOnOutputError: boolean,
    failOnNonZeroExit: boolean,
) {
    if (fresh) {
        logger.info(`Fresh flag is true; resetting the crawl index and clearing results`);
        await writeIndex(outputDir, 0);
        const resultFilePath: Path = outputDir.extend(['results.json']);
        await fs.writeFile(resultFilePath.toString(), JSON.stringify({ "rows": [] }));
    }

    logger.info(`Gathering ${targetCount} packages with a ${bound} bound of ${downloadCount} downloads`);

    // Load existing package list
    const filteredPackageListPath: Path = outputDir.extend(['results.json']);
    let filteredPackageList: Array<PackageData> = [];
    let startIndex = 0;
    if (!fresh) {
        startIndex = await readIndex(outputDir);
        logger.info('Loading existing filtered package list...')
        filteredPackageList = await loadFilteredPackageList(filteredPackageListPath);
        logger.info(`The existing list has ${filteredPackageList.length} packages`);
    } else {
        logger.info('Overwriting existing filtered package list...');
        await writePackageList(filteredPackageList, filteredPackageListPath);
    }

    // Get the npm package list
    logger.info('Getting package list...');
    let packageListPath: Path;
    if (analysisOnly.isNothing()) {
        packageListPath = cacheDir.extend(['npmPackageList.json']);
    } else {
        packageListPath = analysisOnly.unwrap();
        logger.info(`Analysis only; reading package list at ${packageListPath}`);
    }
    const packageList: Array<PackageData> = await getPackageList(packageListPath);

    // Override the start and index index, if provided via CLI
    if (!packageListBounds[0].isNothing()) {
        startIndex = packageListBounds[0].unwrap();
    }
    let endIndex = packageList.length;
    if (!packageListBounds[1].isNothing()) {
        endIndex = packageListBounds[1].unwrap();
        if (endIndex > packageList.length) {
            throw Error(`End index ${endIndex} is out-of-bounds for list length ${packageList.length}`);
        }
    }

    // Initialize the pipeline
    const pipeline: Pipeline = buildPipeline(logger);
    const initialContext = new Context({
        'logger': logger,
        'cacheDir': cacheDir,
        'outputDir': outputDir,
        'tmpDir': tmpDir,
        'bound': bound,
        'targetDownloadCount': downloadCount,
        'sinks': ['child_process', 'eval(', 'exec(', 'execSync(', 'new Function('],
        'browserAPIs': ['window.', 'document.'],
        'z3Path': z3Path,
        'minNumDeps': minNumDeps.orDefault(-1),
        'minDepth': minDepth.orDefault(1e9),
        'policies': policies.orDefault(''),
        'requireSinkHit': requireSinkHit,
        'failOnOutputError': failOnOutputError,
        'failOnNonZeroExit': failOnNonZeroExit,
    });

    // Set the task list
    let taskList: Array<string> = undefined; // Run all tasks
    if (gatheringOnly) {
        taskList = ['downloadCount', 'setupPackage', 'filterByMain',
            'filterBrowserAPIs', 'filterSinks', 'setupDependencies',
            'getEntryPoints'];
    } else if (!analysisOnly.isNothing()) {
        taskList = ['setupPackage', 'setupDependencies', 'getEntryPoints',
            'runNonInstrumented', 'annotateNoInstrument', 'runJalangiBabel',
            'runInstrumented', 'triageFlow', 'setSinkType', 'smt', 
            'checkExploit'];
    }

    // Begin gathering
    logger.info(`Gathering from package list index ${startIndex} to ${endIndex - 1}`);
    for (let i = startIndex; i < endIndex; i++) {
        const thePackage = packageList[i];
        thePackage.setIndex(i);

        logger.info(`Testing package at index ${i}: ${thePackage.identifier()}`);
        await writeIndex(outputDir, i);

        initialContext.setProperty('thePackage', thePackage);
        await pipeline.execute(initialContext, taskList);

        // Record package data
        let included = true;
        if (analysisOnly.isNothing()) {
            // For gathering, we require the package to have passed getEntryPoints
            included = pipeline.completedTask('getEntryPoints');
        }
        let reason: string;
        try {
            reason = `Pipeline stopped at ${pipeline.lastCompleted()}`;
        } catch (err) {
            reason = `Pipeline did not complete any tasks`;
        }
        if (included) {
            filteredPackageList.push(thePackage);
            writePackageList(filteredPackageList, filteredPackageListPath);
            logger.debug(`Included package: ${reason}`);
        } else {
            // If we encounter an error, don't include the package
            logger.debug(`Discarded package: ${reason}`);
        }

        // Potentially remove the package cache
        if (!cache || (onlyCacheIncluded && !included)) {
            logger.info('Removing package cache');
            await removePackageCache(thePackage);
        }
        // Clean up analysis files
        if (included) {
            await cleanJalangiFiles(thePackage);
        }

        if (filteredPackageList.length >= targetCount) {
            logger.debug(`Target count of ${targetCount} packages has been met`);
            break;
        }

        logger.info(`Filtered package list has ${filteredPackageList.length} packages`);

        // Rate-limiting
        await delay(500);
    }
    logger.info(`List has ${filteredPackageList.length} packages`);
}


async function main() {
    // Set up command line options
    const program = new Command();
    program
        .version('0.1.0')
        .command('pipeline <targetCount> <bound> <downloadCount>')
        .option('-f, --fresh', 'restart from package list index 0 and clear results')
        .option('-l, --log-level <level>', 'set the log level [debug | info | warn | error]')
        .option('-n, --no-cache', 'no package installation cache')
        .option('-c, --cache-dir <path>', 'path to the package cache directory')
        .option('-o, --output-dir <path>', 'path to store package list output')
        .option('-t, --tmp-dir <path>', 'path to store temporary files')
        .option('-s, --start-index <int>', 'package list index to start gathering from (overrides checkpoint)')
        .option('-e, --end-index <int>', 'maximum package list index to gather from')
        .option('-g, --gathering-only', 'only execute gathering stages of the pipeline')
        .option('-a, --analysis-only <path>', 'only analyze packages in the package list at the provided path')
        .option('-z, --z3-path <path>', 'path to the Z3 solver binary')
        .option('--only-cache-included', 'only cache packages that pass the gathering filters')
        .option('--min-num-deps <int>', 'minimum number of deps for no-instrument heuristic')
        .option('--min-depth <int>', 'minimum depth to apply no-instrument header')
        .option('--policies <string>', 'taint policies to set')
        .option('--require-sink-hit', 'require that a sink was hit as a pipeline step')
        .option('--fail-on-output-error', 'fail a step if the process output has an error')
        .option('--fail-on-non-zero-exit', 'fail a step if the process exits with a non-zero exit code')
        .action(async function (
            targetCountStr: string,
            boundStr: string,
            downloadCountStr: string,
            options?: any
        ) {
            // Default log level is info
            let logLevel = logger.levels.info;
            let logLevelStr = options.logLevel;
            if (options.logLevel !== undefined) {
                switch (options.logLevel) {
                    case 'info':
                        logLevel = logger.levels.info;
                        break;
                    case 'debug':
                        logLevel = logger.levels.debug;
                        break;
                    case 'error':
                        logLevel = logger.levels.error;
                        break;
                    default:
                        throw Error(`Unsupported log level: ${logLevelStr}`);
                }
            } else {
                logLevelStr = 'info';
            }
            // Set up logger
            logger
                .pipe(new Filter({ filterLevel: logLevel })) // 6 -> info
                .pipe(new Human())
                .pipe(process.stdout);
            logger.debug(`The log level is set to ${logLevelStr}`);
            // Package list start and end index
            let packageListBounds: [Maybe<number>, Maybe<number>] = [new Maybe(), new Maybe()];
            if (options.startIndex !== undefined) {
                packageListBounds[0] = new Maybe(Number.parseInt(options.startIndex));
            }
            if (options.endIndex !== undefined) {
                packageListBounds[1] = new Maybe(Number.parseInt(options.endIndex));
            }
            let bound = Bound.lower;
            if (boundStr == 'upper') {
                bound = Bound.upper;
            }
            logger.debug(`The package list bound is "${bound}" with range: ${packageListBounds[0]}-${packageListBounds[1]}`);
            // Set up package directory
            let cacheDirStr = './packages';
            if (options.cacheDir !== undefined) {
                cacheDirStr = options.cacheDir;
            }
            const cacheDir: Path = await setupDir(cacheDirStr);
            logger.debug(`The cache directory is: ${cacheDir.toString()}`);
            // Set up output directory
            let outputDirStr = './output';
            if (options.outputDir !== undefined) {
                outputDirStr = options.outputDir;
            }
            const outputDir = await setupDir(outputDirStr);
            logger.debug(`The output directory is: ${outputDir.toString()}`);
            // Set up tmp directory
            let tmpDirStr = './tmp';
            if (options.tmpDir !== undefined) {
                tmpDirStr = options.tmpDir;
            }
            const tmpDir = await setupDir(tmpDirStr);
            logger.debug(`The tmp directory is: ${tmpDir.toString()}`);
            // Gathering or analysis-only options
            let gatheringOnly = false;
            if (options.gatheringOnly !== undefined) {
                gatheringOnly = true;
            }
            let analysisOnly: Maybe<Path> = new Maybe();
            if (options.analysisOnly !== undefined) {
                if (gatheringOnly) {
                    throw Error('Cannot simultaneously specify gathering-only and analysis-only');
                }
                const packageListPath = new Path([options.analysisOnly]);
                if (!(await packageListPath.exists())) {
                    throw Error(`Provided package list path cannot be accessed: ${packageListPath}`);
                }
                analysisOnly = new Maybe(packageListPath);
            }
            let z3Path: Maybe<Path> = Maybe.Nothing();
            if (options.z3Path !== undefined) {
                z3Path = Maybe.Just(options.z3Path);
            }
            // Set up other flags
            let targetCount = 0;
            try {
                targetCount = Number.parseInt(targetCountStr);
            } catch (err) {
                throw Error(`Target count must be an integer:\b{err}`);
            }
            let downloadCount = 0;
            try {
                downloadCount = Number.parseInt(downloadCountStr);
            } catch (err) {
                throw Error(`Download count must be an integer:\b{err}`);
            }
            let fresh = false;
            if (options.fresh !== undefined) {
                fresh = true;
            }
            logger.debug(`Fresh flag is set to ${fresh}`);
            let cache = true;
            if (options.noCache !== undefined) {
                cache = false;
            }
            logger.debug(`Cache flag is set to ${cache}`);
            let onlyCacheIncluded = false;
            if (options.onlyCacheIncluded !== undefined) {
                onlyCacheIncluded = true;
            }
            logger.debug(`Only-cache-included is set to ${onlyCacheIncluded}`);
            let minNumDeps: Maybe<number> = Maybe.Nothing();
            if (options.minNumDeps !== undefined) {
                minNumDeps = Maybe.Just(Number.parseInt(options.minNumDeps));
            }
            logger.debug(`Auto-no-instrument: min-num-deps is set to ${minNumDeps}`);
            let minDepth: Maybe<number> = Maybe.Nothing();
            if (options.minDepth !== undefined) {
                minDepth = Maybe.Just(Number.parseInt(options.minDepth));
            }
            logger.debug(`Auto-no-instrument: min-depth is set to ${minDepth}`);
            let policies: Maybe<string> = Maybe.Nothing();
            if (options.policies !== undefined) {
                policies = Maybe.Just(options.policies);
            }
            logger.debug(`Taint policies: ${policies}`);
            let requireSinkHit = false;
            if (options.requireSinkHit !== undefined) {
                requireSinkHit = true;
            }
            logger.debug(`Require sink hit?: ${requireSinkHit}`);
            let failOnOutputError = false;
            if (options.failOnOutputError !== undefined) {
                failOnOutputError = true;
            }
            logger.debug(`Fail on output error?: ${failOnOutputError}`);
            let failOnNonZeroExit = false;
            if (options.failOnNonZeroExit !== undefined) {
                failOnNonZeroExit = true;
            }
            logger.debug(`Fail on output error?: ${failOnNonZeroExit}`);
            // Global error handler
            process.on(
                'uncaughtException',
                (err) => logger.error(`Uncaught error: ${err.message}`)
            );
            process.on(
                'unhandledRejection',
                (reason) => logger.error(`Unhandled promise rejection: ${reason}`)
            )
            // Start the pipeline
            await runPipeline(
                targetCount,
                bound,
                downloadCount,
                fresh,
                cache,
                onlyCacheIncluded,
                cacheDir,
                outputDir,
                tmpDir,
                packageListBounds,
                gatheringOnly,
                analysisOnly,
                z3Path,
                minNumDeps,
                minDepth,
                policies,
                requireSinkHit,
                failOnOutputError,
                failOnNonZeroExit,
            )
            logger.info('Done with analysis');
        });
    program.parse(process.argv);
}

main();
