import * as path from 'path';
import { cwd } from 'process';
import { promises as fs } from 'fs';
import * as axios from 'axios';
import { Logger } from 'caterpillar';
import { sync as globSync } from 'glob';
import { promisify } from 'util';
import { exec as execSync } from 'child_process';
const exec = promisify(execSync);
import { PackageData, PackageResult } from './package';
import { Maybe } from './functional';


export const logger = new Logger();


interface NodePath {
    root: string,
    dir: string,
    base: string,
    name: string,
}


export class Path {
    _path: NodePath;
    constructor(parts: Array<string>) {
        this._path = path.parse(path.resolve(...parts));
    }
    extend(extension: Array<string>): Path {
        return new Path([this.toString(), ...extension]);
    }
    toString(): string {
        return path.format(this._path);
    }
    dir(): Path {
        return new Path([this._path.dir]);
    }
    base(): string {
        return this._path.base;
    }
    glob(match: string): Path[] {
        const matches: string[] = globSync(match, { cwd: this.toString() });
        const matchedPaths: Path[] = [];
        for (const match of matches) {
            matchedPaths.push(this.extend([match]));
        }
        return matchedPaths;
    }
    async exists(): Promise<boolean> {
        try {
            await fs.access(this.toString());
            return true;
        } catch (err) {
            return false;
        }
    }
    async isDir(): Promise<Maybe<boolean>> {
        try {
            const stat = await fs.lstat(this.toString());
            return Maybe.Just(stat.isDirectory());
        } catch (err) {
            return Maybe.Nothing();
        }
    }
    async size(): Promise<Maybe<number>> {
        try {
            const stat = await fs.lstat(this.toString());
            return Maybe.Just(stat.size);
        } catch (err) {
            return Maybe.Nothing();
        }
    }
    static relDir(extension: Array<string>): Path {
        return new Path([__dirname, ...extension]);
    }
    static relParentDir(extension: Array<string>): Path {
        const currentDir: NodePath = path.parse(__dirname);
        return new Path([currentDir.dir, ...extension]);
    }
    static relCwd(extension: Array<string>): Path {
        return new Path([cwd(), ...extension]);
    }
}


export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export enum Bound {
    lower = 'lower',
    upper = 'upper',
}


interface npmPackageListRow {
    id: string,
}


export interface npmPackageList {
    rows: npmPackageListRow[],
}


export interface Response {
    data: any
}


export interface DownloadCountCache {
    [Key: string]: number
}


export type ProcessingTime = [number, number];


export async function checkForAPI(packagePath: Path, api: string): Promise<boolean> {
    const cmd = `grep -r --include=\*.js --exclude-dir=node_modules "${api}" . | wc`;
    try {
        const { stdout, stderr }: { stdout: string, stderr: string } = await exec(
            cmd,
            { cwd: packagePath.toString() }
        );
        const parts = stdout.split(' ').filter(part => part != '');
        return Number.parseInt(parts[0]) > 0;
    } catch (err) {
        // Could not check for API; don't include
        throw Error(`Failed to check for API ${api} in ${packagePath}:\n${err}`);
    }
}


export async function setupDir(name: string): Promise<Path> {
    let newDir: Path;
    if (path.isAbsolute(name)) {
        newDir = new Path([name]);
    } else {
        newDir = Path.relCwd([name]);
    }
    try {
        await fs.access(newDir.toString());
    } catch (exn) {
        // Create the directory if it doesn't exist
        try {
            await fs.mkdir(newDir.toString());
        } catch (exn) {
            logger.error(`Failed to create directory at ${newDir.toString()}`);
            // Fatal
            throw exn;
        }
    }
    return newDir;
}


export async function writeIndex(outputDirPath: Path, index: number) {
    const resultFilePath: Path = Path.relCwd(
        [outputDirPath.toString(), 'index.txt']
    );
    try {
        await fs.access(resultFilePath.toString());
        await fs.writeFile(resultFilePath.toString(), index.toString());
    } catch {
        // Result file does not exist
        await fs.writeFile(resultFilePath.toString(), index.toString());
    }
}


export async function readIndex(outputDirPath: Path): Promise<number> {
    const resultFilePath: Path = Path.relCwd(
        [outputDirPath.toString(), 'index.txt']
    );
    try {
        await fs.access(resultFilePath.toString());
        return Number.parseInt(
            await fs.readFile(resultFilePath.toString(), 'utf8')
        );
    } catch {
        // Result file does not exist
        return 0;
    }
}


export async function writePackageList(packageList: Array<PackageData>, filteredPackageListPath: Path) {
    try {
        await fs.writeFile(
            filteredPackageListPath.toString(),
            JSON.stringify({ "rows": packageList.map(thePackage => thePackage.toJSON()) }),
        );
    } catch (err) {
        logger.error(`Failed to write package list:\n${err}`);
        // Fatal
        throw err;
    }
}


/** Load the existing package list */
export async function loadFilteredPackageList(filteredPackageListPath: Path): Promise<PackageData[]> {
    try {
        await fs.access(filteredPackageListPath.toString());
    } catch (err) {
        // There is no existing package list
        return [];
    }
    try {
        let fileData = await fs.readFile(filteredPackageListPath.toString(), 'utf8');
        const data = JSON.parse(fileData);
        return data['rows'].map((rawPackage: any) => {
            let thePackage = new PackageData(rawPackage['id'] as string);
            thePackage.fromJSON(rawPackage);
            return thePackage;
        });
    } catch (err) {
        logger.error(`Failed to read existing package list: ${err}`);
        throw err;
    }
}


export async function getPackageList(packageListPath: Path): Promise<Array<PackageData>> {
    try {
        await fs.access(packageListPath.toString());
    } catch (err) {
        // Package list is not cached, need to re-download
        try {
            // https://replicate.npmjs.com/_all_docs' is throttled
            const response: Response = await (axios as any).get(
                'https://replicate.npmjs.com/_all_docs'
            );
            await fs.writeFile(packageListPath.toString(), JSON.stringify(response.data));
        } catch (exn) {
            logger.error(`Failed to get package list:\n${exn}`);
            // Fatal
            throw exn;
        }
    }
    try {
        let packageList = JSON.parse(await fs.readFile(packageListPath.toString(), 'utf8'));
        return (packageList as npmPackageList).rows
            // Filter by packages that have alphabetic names
            .filter(row => row.id[0].match(/[a-z]/) && row.id.match(/^[a-z\-]+$/i))
            .map(row => new PackageData(row.id));
    } catch (exn) {
        logger.error(`Failed to read package lis:\n${exn}`);
        // Fatal
        throw exn;
    }
}


export async function writeResult(outputDirPath: Path, result: PackageResult) {
    const resultFilePath: Path = Path.relCwd(
        [outputDirPath.toString(), 'results.json']
    );
    try {
        await fs.access(resultFilePath.toString());
    } catch {
        // Result file does not exist
        await fs.writeFile(resultFilePath.toString(), JSON.stringify([]));
    }
    try {
        let results: PackageResult[] = JSON.parse(
            await fs.readFile(resultFilePath.toString(), 'utf8')
        );
        results.push(result);
        await fs.writeFile(resultFilePath.toString(), JSON.stringify(results, null, 2));
    } catch (err) {
        logger.error(`Failed to serialize result: ${err.message}`);
    }
}


export async function removePackageCache(thePackage: PackageData): Promise<void> {
    logger.debug(`Removing installed env for package ${thePackage.name()}`);
    try {
        const packageDir: Path = thePackage.path().dir().dir();
        await fs.rmdir(packageDir.toString(), { recursive: true });
        logger.debug(`Cache ${packageDir.toString()} for ${thePackage.name()} has been successfully removed`);
    } catch (err) {
        throw Error(`Encountered error in removing env of package ${thePackage.name()}:\n${err}`);
    }
}


export async function cleanJalangiFiles(
    thePackage: PackageData
): Promise<void> {
    logger.debug(`Cleaning Jalangi-generated files at ${thePackage.path()}`);
    try {
        let jalangiFilePaths: Path[] = [];
        thePackage.path().glob('**/*_jalangi_.js').forEach(function (path: Path) {
            jalangiFilePaths.push(path);
        });
        thePackage.path().glob('**/*_jalangi_.json').forEach(function (path: Path) {
            jalangiFilePaths.push(path);
        });
        for (const path of jalangiFilePaths) {
            await fs.unlink(path.toString());
        }
    } catch (err) {
        throw Error(`Failed to clean Jalangi files: ${err}`);
    }
}
