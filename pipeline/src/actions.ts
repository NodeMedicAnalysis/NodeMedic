import * as axios from 'axios';
import * as pacote from 'pacote';
import { promises as fs } from 'fs';
import { Maybe, Result } from './functional';
import {
    Path, Response, logger,
    DownloadCountCache, Bound, checkForAPI,
    delay
} from './utilities';
import {
    PackageData, ExploitResult, SinkType,
    EntryPoint, TriageData
} from './package';
import { AsyncProcess, ProcessStatus } from './process';
import { BaseError, PipelineError, ProcessError, ProcessOutputError, ProcessTimeoutError, ResultError } from './errors';


export async function getPackageDownloadCount(thePackage: PackageData, cacheDir: Path): Promise<Maybe<number>> {
    const downloadCountCachePath: Path = cacheDir.extend(['downloadCounts.json']);
    try {
        await fs.access(downloadCountCachePath.toString());
    } catch {
        // Download cache does not exist
        await fs.writeFile(downloadCountCachePath.toString(), JSON.stringify({}));
    }
    let downloadCountCache: DownloadCountCache = JSON.parse(
        await fs.readFile(downloadCountCachePath.toString(), 'utf8')
    );
    // Download count uses *just* the package name
    if (!(thePackage.name() in downloadCountCache)) {
        // Retrieve download count
        try {
            const response: Response = await (axios as any).get(`https://api.npmjs.org/downloads/point/last-month/${thePackage.name()}`);
            downloadCountCache[thePackage.name()] = (response.data.downloads as number);
            await fs.writeFile(downloadCountCachePath.toString(), JSON.stringify(downloadCountCache));
        } catch (exn) {
            logger.error(`Failed to GET download count of ${thePackage.name()}:\n${exn}`);
            return new Maybe();
        }
    }
    return new Maybe(downloadCountCache[thePackage.name()]);
}


export async function filterByDownloadCount(
    thePackage: PackageData,
    downloadCountTarget: number,
    bound: Bound,
    cacheDir: Path,
): Promise<Result<number, BaseError>> {
    logger.debug('Filter: Download count');
    const downloadCountMonad: Maybe<number> = await getPackageDownloadCount(thePackage, cacheDir);
    if (!downloadCountMonad.isNothing()) {
        const downloadCount: number = downloadCountMonad.unwrap();
        if ((bound == Bound.lower && downloadCount >= downloadCountTarget) ||
            (bound == Bound.upper && downloadCount <= downloadCountTarget)) {
            return Result.Success(downloadCount);
        }
        return Result.Failure(new ResultError(`Package does not meet download count bound: ${bound} ${downloadCountTarget}`));
    }
    // Count not check download count; don't include
    return Result.Failure(new PipelineError(`Failed to get the download count for package ${thePackage.name()}`));
}


export async function setupPackageEnv(
    packageName: string,
    packageVersion: string,
    packageDir: Path
): Promise<Result<Path, BaseError>> {
    let packagePathParts = [packageDir.toString(), packageName, 'node_modules', packageName];
    let subPath2 = new Path([...packagePathParts.slice(0, 2)]);
    let subPath3 = new Path([...packagePathParts.slice(0, 3)]);
    let fullPath = new Path(packagePathParts);
    try {
        if (!(await packageDir.exists())) {
            // Create the packages directory
            await fs.mkdir(packageDir.toString());
        }
        if (await fullPath.exists()) {
            logger.debug('Package already exists, skipping...');
            return Result.Success(fullPath);
        } else {
            await fs.mkdir(subPath2.toString());
            await fs.mkdir(subPath3.toString());
            await fs.mkdir(fullPath.toString());
        }
        const resolved = await pacote.resolve(`${packageName}@${packageVersion}`);
        logger.debug(`Downloading package ${resolved}...`);
        const from = await pacote.extract(resolved, fullPath.toString());
        logger.debug(`Extracted package ${packageName}@${packageVersion} from ${from}`);
        return Result.Success(fullPath);
    } catch (err) {
        return Result.Failure(new PipelineError(`Encountered error in package setup: ${err}`));
    }
}


export async function getPackageVersion(packagePath: Path): Promise<Result<string, BaseError>> {
    try {
        let manifest = JSON.parse(
            await fs.readFile(packagePath.extend(['package.json']).toString(), 'utf8')
        );
        return Result.Success(manifest['version']);
    } catch (err) {
        // Could not read package manifest; don't include
        return Result.Failure(new ResultError(`Failed to read manifest for ${packagePath}:\n${err}`));
    }
}


export async function filterByMain(packagePath: Path): Promise<Result<null, BaseError>> {
    logger.debug('Filter: Manifest has main');
    let manifest: any;
    try {
        manifest = JSON.parse(
            await fs.readFile(packagePath.extend(['package.json']).toString(), 'utf8')
        );
    } catch (exn) {
        return Result.Failure(new PipelineError(`Failed to read manifest for ${packagePath}:\n${exn}`));
    }
    if ('main' in manifest) {
        try {
            await fs.access(packagePath.extend([manifest['main']]).toString());
            return Result.Success(null);
        } catch (err) {
            return Result.Failure(
                new ResultError(
                    `Failed to locate entry point file for ${packagePath}:\n${err}`
                )
            );
        }
    }
    return Result.Failure(new ResultError('Package manifest has no main'));
}


export async function filterByAPIs(
    packagePath: Path,
    apis: Array<string>,
): Promise<Result<Array<string>, PipelineError>> {
    logger.debug(`Filter: Package has APIs: ${apis}`);
    let packageAPIs: Array<string> = [];
    for (const api of apis) {
        try {
            if (await checkForAPI(packagePath, api)) {
                packageAPIs.push(api);
            }
        } catch (err) {
            // Short-circuit checking sinks if we encounter an error
            return Result.Failure(
                new PipelineError(`Encountered an error while checking for API: ${api}:\n${err}`)
            );
        }
    }
    return Result.Success(packageAPIs);
}


export async function setupPackageDependencies(
    packagePath: Path
): Promise<Result<null, BaseError>> {
    const timeoutLen = 5 * 60e3;
    if (packagePath.glob('node_modules').length > 0) {
        logger.debug('Package dependencies already installed; skipping...');
        return Result.Success(null);
    }
    const proc = new AsyncProcess(
        'npm',
        ['i'],
        timeoutLen,
        {
            cwd: packagePath.toString(),
        },
    );
    logger.debug(`Installing package dependencies: ${proc.cmd()} ${proc.args()} ${packagePath.toString()}`);
    try {
        await proc.run();
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to install package dependencies: ${err.message}`));
    }
    const result = proc.checkResult();
    if (result.isFailure()) {
        const status = result.unwrap();
        if (status == ProcessStatus.Timeout) {
            return Result.Failure(new ProcessTimeoutError(timeoutLen, proc.output()));
        }
        return Result.Failure(new ProcessError(status, proc.output()));
    }
    return Result.Success(null);
}



export async function importPackage(
    thePackage: PackageData,
): Promise<Result<null, BaseError>> {
    logger.debug(`Filter: Package can be imported`);
    const importDriver = `require('${thePackage.name()}');`;
    const importDriverPath = thePackage.path().dir().extend([`tmp_${thePackage.name()}`]);
    try {
        await fs.writeFile(importDriverPath.toString(), importDriver);
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to write import driver: ${err}`));
    }
    const timeoutLen = 60e3;
    const child = new AsyncProcess(
        'node',
        [importDriverPath.toString()],
        timeoutLen,
        { cwd: thePackage.path().toString() }
    );
    try {
        await child.run();
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to import package: ${err}`));
    }
    const result = child.checkResult();
    if (result.isFailure()) {
        const status = result.unwrap();
        if (status == ProcessStatus.Timeout) {
            return Result.Failure(new ProcessTimeoutError(timeoutLen, child.output()));
        }
        return Result.Failure(new ProcessError(result.unwrap(), child.output()));
    } else if (child.outputHasError()) {
        return Result.Failure(new ProcessOutputError(child.output()));
    }
    return Result.Success(null);
}


export async function getPackageEntryPoints(
    thePackage: PackageData,
    tmpDir: Path,
): Promise<Result<EntryPoint[], BaseError>> {
    const tempFileName: string = `tmp-${thePackage.name()}.js`;
    let helperPath: Path = tmpDir.extend([tempFileName]);
    // We encapsulate this in a subprocess so that importing
    // the package cannot cause the overall pipeline to crash
    let helperCode: string;
    try {
        helperCode = await fs.readFile(
            Path.relDir(['getEntryPoints.ts']).toString(),
            'utf8'
        );
        helperCode = helperCode.replace(
            `const PACKAGE_PATH = "";`,
            `const PACKAGE_PATH = "${thePackage.path().toString()}";`
        );
        await fs.writeFile(helperPath.toString(), helperCode);
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to create getEntryPoints driver: ${err}`));
    }
    // Execute the above driver with a timeout of 1 minute
    const timeoutLen = 60e3;
    const getEntryPointsProc = new AsyncProcess(
        'node',
        [helperPath.toString()],
        timeoutLen,
    );
    logger.debug(`Running getEntryPoints driver: ${getEntryPointsProc.cmd()} ${getEntryPointsProc.args()}`);
    try {
        await getEntryPointsProc.run();
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to execute getEntryPoints driver:\n${err}`));
    } finally {
        // clear the temp file
        await fs.unlink(helperPath.toString());
    }
    const result = getEntryPointsProc.checkResult();
    if (result.isFailure()) {
        const status = result.unwrap();
        if (status == ProcessStatus.Timeout) {
            return Result.Failure(new ProcessTimeoutError(timeoutLen, getEntryPointsProc.output()));
        }
        return Result.Failure(new ProcessError(status, getEntryPointsProc.output()));
    } else {
        let entryPointsStr = getEntryPointsProc.output();
        entryPointsStr = entryPointsStr.split('----- ENTRYPOINTS -----')[1];
        entryPointsStr = entryPointsStr.split('-----------------------')[0];
        let entryPoints: EntryPoint[] = JSON.parse(entryPointsStr);
        return Result.Success(entryPoints);
    }
}


function packageDriverTemplate(
    packageName: string,
    entryPoints: EntryPoint[],
    preamble: string,
    argument: string
): string {
    // Preamble for the package driver
    let driverPreamble = `// JALANGI DRIVER\nvar PUT = require('${packageName}');\n`
        + `var x = ${argument};\n`;
    // Generate a harness for every entry point
    let harnessStrings = entryPoints
        .filter(function({ functionName, numArguments, isMethod, isConstructor, fromConstructor }) {
            return functionName !== 'constructor';
        })
        .map(function ({ functionName, numArguments, isMethod, isConstructor, fromConstructor }) {
            let argString = '';
            if (numArguments >= 1) {
                argString = 'x,'.repeat(numArguments - 1) + 'x';
            }
            let tryPart: string;
            if (fromConstructor) {
                tryPart = `var put = new PUT();\n\tput.${functionName}(${argString})`;
            } else {
                let construct = '';
                if (isConstructor) {
                    construct = 'new ';
                }
                if (isMethod) {
                    tryPart = `${construct}PUT.${functionName}(${argString})`;
                } else {
                    tryPart = `${construct}PUT(${argString})`;
                }
            }
            return `try {\n\t${tryPart};\n} catch (e) {\n\tconsole.log(e);\n}`;
        });
    let driver = driverPreamble + preamble + harnessStrings.join('\n');
    return driver;
}


export async function setupPackageDriver(
    thePackage: PackageData,
    instrumentation: Boolean
): Promise<Result<Path, BaseError>> {
    logger.debug('Generating driver...');
    let taintedStringHarness = (instrumentation) ? '__jalangi_set_taint__(x);\n' : '';
    let suffix = (instrumentation) ? '' : '-non-inst';
    let template = packageDriverTemplate(thePackage.name(), thePackage.entryPoints(), taintedStringHarness, '{0: "0"}');
    let templatePath = thePackage.path().extend([`run-${thePackage.name()}${suffix}.js`]);
    try {
        await fs.writeFile(templatePath.toString(), template)
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to write template to ${templatePath.toString()}; ${err}`));
    }
    return Result.Success(templatePath);
}


export async function runNonInst(
    templatePath: Path,
    failOnOutputError: boolean,
    failOnNonZeroExit: boolean,
): Promise<Result<null, BaseError>> {
    const absTemplatePath: Path = Path.relParentDir([templatePath.toString()]);
    const cmd = 'node';
    const args = [
        absTemplatePath.toString(),
    ];
    // Run with a timeout of 1 minute
    const timeoutLen = 1 * 60e3;
    logger.debug(`Running non-instrumentation step: ${cmd} ${args.join(" ")}`);
    const nonInstProc = new AsyncProcess(cmd, args, timeoutLen);
    try {
        await nonInstProc.run();
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to execute non-instrumentation step:\n${err}`));
    }
    const result = nonInstProc.checkResult();
    if (result.isFailure()) {
        const status = result.unwrap();
        if (status == ProcessStatus.Timeout) {
            return Result.Failure(new ProcessTimeoutError(timeoutLen, nonInstProc.output()));
        }
        if (failOnNonZeroExit) {
            return Result.Failure(new ProcessError(status, nonInstProc.output()));
        }
    }
    if (failOnOutputError && nonInstProc.outputHasError().orDefault(false)) {
        return Result.Failure(new ProcessOutputError(nonInstProc.output()));
    }
    return Result.Success(null);
}


export async function runJalangiBabel(
    templatePath: Path,
    requireSinkHit: boolean,
    failOnOutputError: boolean,
    failOnNonZeroExit: boolean,
): Promise<Result<Maybe<Array<string>>, BaseError>> {
    const jalangiPath: Path = Path.relParentDir(['../lib/jalangi2-babel/src/js/commands/jalangi.js']);
    const analysisPath: Path = Path.relParentDir(['./analyses/sinkhit_analysis.js']);
    const absTemplatePath: Path = Path.relParentDir([templatePath.toString()]);
    const cmd = 'node';
    const args = [
        jalangiPath.toString(),
        '--analysis',
        analysisPath.toString(),
        absTemplatePath.toString(),
    ];
    // Run with a timeout of 5 minutes
    const timeoutLen = 5 * 60e3;
    logger.debug(`Running Jalangi2-babel step: ${cmd} ${args.join(" ")}`);
    const nonInstProc = new AsyncProcess(cmd, args, timeoutLen);
    try {
        await nonInstProc.run();
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to execute Jalangi2-babel step:\n${err}`));
    }
    const result = nonInstProc.checkResult();
    if (result.isFailure()) {
        const status = result.unwrap();
        if (status == ProcessStatus.Timeout) {
            return Result.Failure(new ProcessTimeoutError(timeoutLen, nonInstProc.output()));
        }
        if (failOnNonZeroExit) {
            return Result.Failure(new ProcessError(status, nonInstProc.output()));
        }
    }
    if (failOnOutputError && nonInstProc.outputHasError().orDefault(false)) {
        return Result.Failure(new ProcessOutputError(nonInstProc.output()));
    }
    const output = nonInstProc.output();
    if (output.indexOf('SINKHIT') === -1) {
        // logger.debug(`No sink hit; Output:\n<<${nonInstProc.output()}>>`);
        if (requireSinkHit) {
            return Result.Failure(new ResultError('No sink hit'));
        } else {
            return Result.Success(Maybe.Nothing());
        }
    }
    const sinkRegex = /SINKHIT:(.+)/g;
    const matches = Array.from(output.matchAll(sinkRegex));
    let sinksHit: Set<string> = new Set();
    for (const match of matches) {
        if (match.length < 2) {
            return Result.Failure(new PipelineError('Failed to parse sinkhit output'));
        }
        sinksHit.add(match[1]);
    }
    return Result.Success(Maybe.Just(Array.from(sinksHit)));
}


async function getManifestDependencies(
    manifestPath: Path,
    includeDev?: boolean,
): Promise<Set<string>> {
    // By default we do not include devDependencies
    if (includeDev === undefined) {
        includeDev = false;
    }
    if (!(await manifestPath.exists())) {
        return new Set();
    }
    const manifest = JSON.parse(await fs.readFile(manifestPath.toString(), 'utf8'));
    let deps: Set<string> = new Set();
    if ('dependencies' in manifest) {
        for (const dep of Object.keys(manifest['dependencies'])) {
            deps.add(dep);
        }
    }
    if (includeDev && 'devDependencies' in manifest) {
        for (const dep of Object.keys(manifest['devDependencies'])) {
            deps.add(dep);
        }
    }
    return deps;
}


function difference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    let _difference = new Set(setA);
    setB.forEach(function (elem) {
        _difference.delete(elem);
    });
    return _difference;
}


async function getJSFiles(
    packagePath: Path,
    packageName: string
): Promise<Set<string>> {
    const includeFiles: Set<string> = new Set();
    const jsFiles = packagePath.glob('**/*.js');
    for (const path of jsFiles) {
        const maybeIsDir = await path.isDir();
        if (!maybeIsDir.isNothing() && !maybeIsDir.unwrap()) {
            includeFiles.add(path.toString());
        }
    }
    const excludeFiles: Set<string> = new Set();
    packagePath.glob('**/node_modules/**/*.js').forEach(function (path: Path) {
        excludeFiles.add(path.toString());
    });
    const jalangiFiles: Set<string> = new Set();
    packagePath.glob('**/*_jalangi_.js').forEach(function (path: Path) {
        jalangiFiles.add(path.toString());
    });
    const driverFiles: Set<string> = new Set([
        packagePath.extend([`run-${packageName}.js`]).toString(),
        packagePath.extend([`run-${packageName}-non-inst.js`]).toString(),
    ]);
    let files: Set<string> = new Set(includeFiles);
    files = difference(files, excludeFiles);
    files = difference(files, jalangiFiles);
    files = difference(files, driverFiles);
    return files;
}


interface DependencyNode {
    parent: string,
    children: DependencyNode[],
    jsFiles: string[],
}


async function getDependencyTree(
    tree: DependencyNode,
    nodeModulesPath: Path,
    packageName: string,
    root: boolean,
    includeDev?: boolean,
    _visited?: Set<string>,
) {
    if (includeDev === undefined) {
        includeDev = false;
    }
    if (_visited === undefined) {
        _visited = new Set();
    }
    const packagePath = root
        ? nodeModulesPath.dir()
        : nodeModulesPath.extend([packageName]);
    // Get package's JavaScript files
    tree['jsFiles'] = Array.from(await getJSFiles(packagePath, packageName));
    // Get dependencies from the manifest
    const manifestPath = packagePath.extend(['package.json']);
    const childDeps: string[] = Array.from(await getManifestDependencies(manifestPath, includeDev));
    // Check for internal node_modules folders
    const internalNodeModules: Path = packagePath.extend(['node_modules']);
    let internalDeps: string[] = [];
    if (!root && internalNodeModules.exists()) {
        internalDeps = internalNodeModules.glob('*').map(function(path: Path) { return path.base() });
    }
    for (const dep of childDeps) {
        // Recurse for each unvisited dependency
        if (internalDeps.includes(dep)) {
            const subtree: DependencyNode = {
                'parent': dep,
                'children': [],
                'jsFiles': [],
            }
            await getDependencyTree(
                subtree, internalNodeModules, dep, false, includeDev, _visited
            );
            tree['children'].push(subtree);
        } else {
            const uniqueDepName = nodeModulesPath.extend([dep]).toString();
            if (!_visited.has(uniqueDepName)) {
                _visited.add(uniqueDepName);
                const subtree: DependencyNode = {
                    'parent': dep,
                    'children': [],
                    'jsFiles': [],
                }
                await getDependencyTree(
                    subtree, nodeModulesPath, dep, false, includeDev, _visited
                );
                tree['children'].push(subtree);
            }
        }
    }
}


async function modifyNoInstrumentHeader(
    jsFilePath: Path,
    operation: string,
): Promise<Result<null, BaseError>> {
    // Carefully read the file
    if (!jsFilePath.exists()) {
        return Result.Failure(new PipelineError(`Cannot add header; file does not exist:${jsFilePath.toString()}`));
    }
    let jsFileData: string;
    try {
        jsFileData = await fs.readFile(jsFilePath.toString(), { encoding: 'utf8' });
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to read file:\n${err}`));
    }
    const noInstrumentHeader = '// JALANGI DO NOT INSTRUMENT\n';
    // Check if the header is already present
    let alreadyHasHeader = jsFileData.includes(noInstrumentHeader);
    // Modify the file according to the specified operation
    let newJSFileData: string = jsFileData;
    if (operation == 'add') {
        if (alreadyHasHeader) {
            // logger.debug(`No-instrument header already present for ${jsFilePath.toString()}`);
        } else {
            newJSFileData = `${noInstrumentHeader}${jsFileData}`;
        }
    } else if (operation == 'remove') {
        if (!alreadyHasHeader) {
            // logger.debug(`No-instrument header already not present for ${jsFilePath.toString()}`);
        } else {
            newJSFileData = jsFileData.replace(noInstrumentHeader, '');
        }
    } else {
        return Result.Failure(new PipelineError(`Unhandled operation: ${operation}`));
    }
    // Carefully write the file
    try {
        await fs.writeFile(jsFilePath.toString(), newJSFileData);
    } catch (err) {
        return Result.Failure(new PipelineError(`Cannot write file:\n${err}`));
    }
    return Result.Success(null);
}


async function walkDependencyTree(
    tree: DependencyNode,
    minDepth: number,
    fn: (tree: DependencyNode) => Promise<Result<any, BaseError>>,
    _depth?: number,
): Promise<Result<null, BaseError>> {
    if (_depth < 0) {
        return Result.Failure(new PipelineError(`Depth must be non-negative; depth: ${_depth}`));
    }
    if (_depth === undefined) {
        _depth = 0;
    }
    const applyFn =
        (minDepth == -1 && _depth > 0 && tree['children'].length == 0) // Only apply the function to leaf nodes
        || (minDepth != -1 && _depth >= minDepth); // Apply when the depth is met
    if (applyFn) {
        const result = await fn(tree);
        if (result.isFailure()) {
            return Result.Failure(result.unwrap() as BaseError);
        }
    }
    for (const child of tree['children']) {
        const childResult = await walkDependencyTree(child, minDepth, fn, _depth + 1);
        if (childResult.isFailure()) {
            return Result.Failure(childResult.unwrap() as BaseError);
        }
    }
    return Result.Success(null);
}


async function modifyTreeNoInstrument(
    tree: DependencyNode,
    minDepth: number,
    operation: string,
): Promise<Result<null, BaseError>> {
    return await walkDependencyTree(tree, minDepth, async function (tree: DependencyNode) {
        for (const file of tree['jsFiles']) {
            const result = await modifyNoInstrumentHeader(new Path([file]), operation);
            if (result.isFailure()) {
                return Result.Failure(result.unwrap() as BaseError);
            }
        }
        return Result.Success(null);
    });
}


async function getPackageSize(
    tree: DependencyNode,
): Promise<number> {
    let size = 0;
    for (const pathStr of tree.jsFiles) {
        const fileSize: Maybe<number> = await (new Path([pathStr])).size();
        if (!fileSize.isNothing()) {
            size = size + fileSize.unwrap();
        }
    }
    for (const child of tree['children']) {
        size = size + (await getPackageSize(child));
    }
    return size;
}


async function getPackageLineCount(
    tree: DependencyNode,
): Promise<number> {
    let size = 0;
    for (const pathStr of tree.jsFiles) {
        const proc = new AsyncProcess('wc', ['-l', pathStr], 10e3);
        await proc.run();
        const output = proc.output();
        if (output != '') {
            const loc = output.split(' ').filter((s) => s != '')[0];
            size = size + parseInt(loc);
        }
    }
    for (const child of tree['children']) {
        size = size + (await getPackageLineCount(child));
    }
    return size;
}


async function getTreeDepth(
    tree: DependencyNode,
): Promise<number> {
    let maxChildDepth = 0;
    for (const child of tree['children']) {
        const childDepth = 1 + (await getTreeDepth(child));
        if (childDepth > maxChildDepth) {
            maxChildDepth = childDepth;
        }
    }
    return maxChildDepth;
}


export async function annotateNoInstrument(
    thePackage: PackageData,
    minNumDeps: number,
    minDepth: number,
): Promise<Result<object, BaseError>> {
    const tree: DependencyNode = {
        'parent': thePackage.name(),
        'children': [],
        'jsFiles': [],
    };
    let _visited: Set<string> = new Set();
    await getDependencyTree(
        tree,
        thePackage.path().extend(['node_modules']),
        thePackage.name(),
        true,
        false, // Do not include developer dependencies
        _visited,
    );
    // Compute dependency tree statistics
    const numDeps = _visited.size + 1;
    let uniqueDeps: Set<string> = new Set();
    _visited.forEach(function(dep: string) {
        const path = new Path([dep]);
        const base = path.base();
        if (!uniqueDeps.has(base)) {
            uniqueDeps.add(base);
        }
    });
    const numUniqueDeps = uniqueDeps.size + 1;
    logger.debug(`The package has ${numDeps} dependencies. Unique: ${numUniqueDeps}`);
    // Calculate the package code size (in bytes)
    const packageSize = await getPackageSize(tree);
    logger.debug(`Package size: ${packageSize} bytes`);
    // Calculate the dependency tree depth
    const treeDepth = await getTreeDepth(tree);
    logger.debug(`Dependency tree depth: ${treeDepth}`);
    // Calculate package line count
    const lineCount = await getPackageLineCount(tree);
    logger.debug(`Package lines: ${lineCount}`);
    const treeMetadata = {
        'numDeps': numDeps,
        'numUniqueDeps': numUniqueDeps,
        'packageSize': packageSize,
        'treeDepth': treeDepth,
        'lineCount': lineCount,
    };
    // logger.debug(`Dependency tree: ${inspect(tree, false, 10)}`);
    // Removing existing headers from the package and all dependencies
    logger.debug('Removing existing no-instrument headers');
    const removeResult = await modifyTreeNoInstrument(tree, 0, 'remove');
    if (removeResult.isFailure()) {
        return Result.Failure(new PipelineError(`Failed to remove no-instrument headers: ${removeResult.unwrap() as BaseError}`));
    }
    // Add new no-instrument headers to every dependency
    // at the given depth if the heuristic is satisfied
    let heuristic: boolean;
    if (minNumDeps == -1) {
        heuristic = false;
    } else {
        heuristic = numDeps >= minNumDeps;
    }
    if (heuristic) {
        logger.debug('Heuristic satisfied; adding no-instrument header');
        const addResult = await modifyTreeNoInstrument(tree, minDepth, 'add');
        if (addResult.isFailure()) {
            return Result.Failure(new PipelineError(`Failed to add no-instrument headers: ${addResult.unwrap() as BaseError}`));
        }
    }
    return Result.Success(treeMetadata);
}


export async function runAnalysis(
    templatePath: Path,
    policies: string,
    failOnOutputError: boolean,
    failOnNonZeroExit: boolean,
): Promise<Result<Path, BaseError>> {
    const jalangiPath: Path = Path.relParentDir(['../lib/jalangi2-babel/src/js/commands/jalangi.js']);
    const analysisPath: Path = Path.relParentDir(['../src/rewrite.js']);
    const absTemplatePath: Path = Path.relParentDir([templatePath.toString()]);
    // Run with a timeout of 15 minutes
    const timeoutLen = 15 * 60e3;
    const cmd = 'node';
    const args = [
        jalangiPath.toString(),
        '--analysis',
        analysisPath.toString(),
        absTemplatePath.toString(),
        'log_level=error',
        'taint_paths=true',
        'taint_paths_json=true',
    ];
    if (policies !== '') {
        args.push(`policies=${policies}`);
    }
    const analysisProc = new AsyncProcess(cmd, args, timeoutLen);
    logger.debug(`Running analysis: ${analysisProc.cmd()} ${analysisProc.args().join(" ")}`);
    try {
        await analysisProc.run();
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to execute analysis:\n${err}`));
    }
    if (analysisProc.timeout()) {
        return Result.Failure(new ProcessTimeoutError(timeoutLen, analysisProc.output()));
    } else {
        const output = analysisProc.output();
        if (!output.includes('Sink function')) {
            if (failOnNonZeroExit && !analysisProc.exitZero()) {
                return Result.Failure(new ProcessError(analysisProc.status(), analysisProc.output()));
            }
            if (failOnOutputError && analysisProc.outputHasError().orDefault(false)) {
                return Result.Failure(new ProcessOutputError(output));
            }
        }
    }
    // Get taint JSON output
    const taintJSONPath: Path = Path.relCwd(['taint_0.json']);
    const newTaintJSONPath: Path = templatePath.dir().extend(['taint_0.json']);
    try {
        await fs.access(taintJSONPath.toString());
    } catch (err) {
        return Result.Failure(new ResultError(`Taint path JSON output not found:\n${err.message}`));
    }
    try {
        await fs.copyFile(
            taintJSONPath.toString(),
            newTaintJSONPath.toString(),
        );
        await fs.unlink(taintJSONPath.toString());
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to move taint JSON output: ${err.message}`));
    }
    // Get taint PDF output
    const taintPDFPath: Path = Path.relCwd(['taint_0.pdf']);
    const newTaintPDFPath: Path = templatePath.dir().extend(['taint_0.pdf']);
    if (await taintPDFPath.exists()) {
        try {
            await fs.copyFile(
                taintPDFPath.toString(),
                newTaintPDFPath.toString(),
            );
            await fs.unlink(taintPDFPath.toString());
        } catch (err) {
            return Result.Failure(new PipelineError(`Failed to move taint PDF output: ${err.message}`));
        }
    }
    return Result.Success(newTaintJSONPath);
}


export async function triageFlow(
    taintJSONPath: Path
): Promise<Result<TriageData, BaseError>> {
    let triageModelPath: Path = Path.relDir(['../analyses/triage.py']);
    let args = [
        triageModelPath.toString(),
        taintJSONPath.toString(),
    ];
    const timeoutLen = 10e3;
    const proc = new AsyncProcess(
        'python3',
        args,
        10e3,
    );
    logger.debug(`Running triage model: ${proc.cmd()} ${proc.args()}`);
    try {
        await proc.run();
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to run triage model: ${err}`));
    }
    const result = proc.checkResult();
    if (result.isFailure()) {
        const status = result.unwrap();
        if (status == ProcessStatus.Timeout) {
            return Result.Failure(new ProcessTimeoutError(timeoutLen, proc.output()));
        }
        return Result.Failure(new ProcessError(result.unwrap(), proc.output()));
    }
    if (proc.stdout().isNothing()) {
        return Result.Failure(new PipelineError(`Triage model output is empty`));
    }
    let triageStr = proc.output();
    let triageData: TriageData = JSON.parse(triageStr);
    return Result.Success(triageData);
}


export async function checkSinkType(
    taintJSONPath: Path
): Promise<Result<SinkType, BaseError>> {
    let taintData: any;
    try {
        taintData = JSON.parse(
            await fs.readFile(taintJSONPath.toString(), 'utf8')
        );
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to read taint JSON file:\n${err.message}`));
    }
    let sinkFunction: string = taintData['1']['operation'];
    if (sinkFunction.includes('exec')) {
        return Result.Success(SinkType.execSink);
    } else if (sinkFunction.includes('eval') || sinkFunction.includes('Function')) {
        return Result.Success(SinkType.evalSink);
    }
    return Result.Failure(new ResultError('No sink found'));
}


export async function generateSMT(
    taintJSONPath: Path
): Promise<Result<Path, BaseError>> {
    let smtGenPath: Path = Path.relDir(['../analyses/smt_generator.py']);
    let smtPath: Path = taintJSONPath.dir().extend(['exploit.z3']);
    let flags = [
        '--smt',
    ];
    let args = [
        smtGenPath.toString(),
        ...flags,
        taintJSONPath.toString(),
    ];
    const proc = new AsyncProcess(
        'python3',
        args,
        10e3,
    );
    logger.debug(`Generating SMT formula: ${proc.cmd()} ${proc.args()}`);
    try {
        await proc.run();
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to generate SMT formula: ${err}`));
    }
    const result = proc.checkResult();
    if (result.isFailure()) {
        return Result.Failure(new ProcessError(result.unwrap(), proc.output()));
    }
    if (proc.stdout().isNothing()) {
        return Result.Failure(new PipelineError(`SMT gen output is empty`));
    }
    try {
        await fs.writeFile(smtPath.toString(), proc.stdout().unwrap());
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to write generated SMT: ${err}`));
    }
    return Result.Success(smtPath);
}


export async function solveSMT(
    smtPath: Path,
    z3Path: Maybe<Path>
): Promise<Result<Path, BaseError>> {
    let smtOutPath: Path = Path.relParentDir([smtPath.dir().toString(), 'smt.out']);
    const z3Cmd: string = z3Path.isNothing() ? 'z3' : z3Path.unwrap().toString();
    const z3proc = new AsyncProcess(z3Cmd, ['-T:60', smtPath.toString()], 1 * 60e3)
    logger.debug(`Solving SMT: z3 ${z3proc.args()}`);
    await z3proc.run();
    if (z3proc.timeout()) {
        return Result.Failure(new ResultError(`Failed to solve SMT within timeout: ${z3proc.timeoutLen()}ms`));
    } else {
        const output = z3proc.output();
        if (output.indexOf('unsat') != -1) {
            return Result.Failure(new ResultError(`SMT formula was unsatisfiable. Output:\n<<${output}>>`));
        }
        if (output.indexOf('unknown') != -1) {
            return Result.Failure(new ResultError(`SMT formula could not be solved. Output:\n<<${output}>>`));
        }
        if (output.indexOf('sat') != -1) {
            logger.debug(`SMT formula was satisfiable. Writing to ${smtOutPath.toString()}:\n<<${output}>>`);
            await fs.writeFile(smtOutPath.toString(), output);
            return Result.Success(smtOutPath);
        }
        if (!z3proc.exitZero()) {
            // The exit code should be available here
            return Result.Failure(new PipelineError(`SMT solver terminated with non-zero exit code ${z3proc.exitCode().unwrap()}. Output:\n<<${output}>>`));
        }
        return Result.Failure(new PipelineError(`Unhandled error in SMT solver execution. Output:\n<<${output}>>`));
    }
}


export async function parseSMTOut(smtOutPath: Path): Promise<Result<string, BaseError>> {
    let data: string;
    try {
        data = await fs.readFile(smtOutPath.toString(), 'utf8');
    } catch (err) {
        return Result.Failure(new PipelineError(`Failed to read SMT output: ${err}`));
    }
    logger.debug(data);
    const solutionRegex = /"(.+)"/;
    const matches = data.match(solutionRegex);
    if (matches.length < 2) {
        return Result.Failure(new PipelineError('Failed to parse SMT output'));
    }
    const match: string = matches[1];
    const exploit = `"${match.replace('\\x00', ' ')}"`;
    logger.debug(`Found exploit: ${exploit}`);
    return Result.Success(exploit);
}


export async function checkExecExploit(): Promise<Result<null, BaseError>> {
    let successFilePath: Path = Path.relCwd(['success']);
    try {
        // Check for the side effect
        await fs.access(successFilePath.toString());
    } catch (err) {
        return Result.Failure(new ResultError(`Exploit not successful; ${err.message}`));
    }
    try {
        // Remove the side effect
        await fs.unlink(successFilePath.toString());
    } catch (err) {
        return Result.Failure(
            new PipelineError(
                `Failed to remove side effect: ${successFilePath.toString()}; ${err.message}`
            )
        );
    }
    logger.debug('Exploit was successful!');
    return Result.Success(null);
}


export async function checkExploit(
    thePackage: PackageData,
    failOnNonZeroExit: boolean,
): Promise<Result<ExploitResult[], BaseError>> {
    // Remove any existing `success` files
    let successFilePath: Path = Path.relCwd(['success']);
    if ((await successFilePath.exists())) {
        try {
            // Remove the side effect
            await fs.unlink(successFilePath.toString());
        } catch (err) {
            return Result.Failure(
                new PipelineError(
                    `Failed to remove side effect: ${successFilePath.toString()}; ${err.message}`
                )
            );
        }
    }
    let successfulExploits: ExploitResult[] = [];
    let i = 0;
    for (const entryPoint of thePackage.entryPoints()) {
        let preamble: string;
        if (thePackage.sinkType() == SinkType.execSink) {
            preamble = '';
        } else {
            preamble = 'global.CTF = function() {console.log("GLOBAL.CTF HIT")}\n';
        }
        const driver: string = packageDriverTemplate(
            thePackage.name(), [entryPoint], preamble, thePackage.candidateExploit()
        );
        const pocPath = thePackage.path().extend([`poc${i}.js`]);
        try {
            await fs.writeFile(pocPath.toString(), driver);
        } catch (err) {
            return Result.Failure(new PipelineError(`Failed to write check exploit driver: ${err.message}`));
        }
        const timeoutLen = 60e3;
        const checkProcess = new AsyncProcess('node', [pocPath.toString()], timeoutLen);
        try {
            await checkProcess.run();
        } catch (err) {
            return Result.Failure(new PipelineError(`Failed to test exploit: ${err.message}`));
        }
        const result: Result<null, ProcessStatus> = checkProcess.checkResult();
        if (failOnNonZeroExit && result.isFailure()) {
            const status = result.unwrap();
            if (status == ProcessStatus.Timeout) {
                return Result.Failure(new ProcessTimeoutError(timeoutLen, checkProcess.output()));
            }
            return Result.Failure(new ProcessError(status, checkProcess.output()));
        }
        // Delay 1 second for execution
        await delay(5000);
        let success = false;
        if (thePackage.sinkType() == SinkType.execSink) {
            const checkResult = await checkExecExploit();
            if (checkResult.isFailure()) {
                const error = checkResult.unwrap();
                if (!(error instanceof ResultError)) {
                    return Result.Failure(error);
                }
            } else {
                success = true;
            }
        } else {
            // eval exploit
            success = checkProcess.stdout().orDefault('').includes('GLOBAL.CTF HIT');
        }
        if (success) {
            const result: ExploitResult = {
                exploitFunction: entryPoint.functionName,
                exploitString: thePackage.candidateExploit()
            };
            successfulExploits.push(result);
        }
        i += 1;
    }
    return Result.Success(successfulExploits);
}
