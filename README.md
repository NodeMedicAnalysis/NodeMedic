# NodeMedic

This is the repository for NodeMedic, an end-to-end dynamic provenance analysis 
tool for vulnerability discovery, triage, and confirmation in Node.js packages.

Please note that this repository is **no longer actively maintained**; please instead
**use our follow-up work, [NodeMedic-FINE](https://github.com/NodeMedicAnalysis/NodeMedic-FINE)**, 
which has an updated version of NodeMedic at its core.

## Docker installation
Run the following command to build the docker container:

`docker build --platform=linux/amd64 -t nodemedic:latest .`

A fresh build takes around 3 minutes on an M1 MacBook Air.
After building, the newly created image should be visible:

```bash
$ docker image ls
REPOSITORY                        TAG          IMAGE ID       CREATED          SIZE
nodemedic                         latest       73694473ffee   31 seconds ago   1.53GB
```

Starting the docker container:

`docker run --rm -it nodemedic:latest`

The `--rm` flag will remove the container after disconnecting from it.

The following should be visible in the terminal:

`root@62815f8be20d:/nodemedic# `

On ARM-based systems (e.g., Apple Silicon MacBooks), you may see this warning:
```
WARNING: The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8) and no specific platform was requested
```
It can safely be ignored.


## Local Installation

As an alternative to using the Docker installation, it is also possible to
set up the infrastructure locally. This is not the recommended way of using it 
because the infrastructure will be downloading and analyzing 
potentially-malicious npm packages.

Installation has been tested on macOS Ventura, Debian Buster, and Ubuntu Focal.

Required system dependencies
```
make
npm
nodejs:15.5.0
typescript
graphviz
z3
python3
pip3
```

Installation tips for Ubuntu users:
- make: `apt install build-essential`
- npm: `apt install npm`
- Node.js: `npm i -g n; n 15.5.0`
- TypeScript: `npm install -g typescript`
- graphviz: `apt install graphviz`
- Z3: `apt install z3`
- python3 and pip3: `apt install python3 python3-pip`

​
Installation tips for MacOS users (assuming a package manager such as `brew`
is installed):
- make: `xcode-select --install`
- npm: `brew install npm`
- Node.js: `npm i -g n; n 15.5.0`
- TypeScript: `npm install -g typescript`
- graphviz: `brew install graphviz`
- Z3: `brew install z3`
- python3 and pip3: `brew install python3`


Installation of the NodeMedic infrastructure from the project root directory:

Install Jalangi2 and set up with our patch:
- `cd lib && ./setup-deps.sh`

Install provenance analysis npm dependencies:
- `npm i`

Install pipeline dependencies:
- `cd pipeline && npm i`
- `cd pipeline && tsc -b`
- `cd pipeline/analyses && python3 -m pip install -r requirements.txt`

Build the provenance analysis:
- `make`

To verify the installation is successful, see the sections below on running the
taint precision unit tests and the case studies.

## Run taint precision unit tests

At this point, instructions can be followed locally, or inside the docker 
container. Locally, commands are run from the root of this repo. In the docker
container, commands are run from `/nodemedic`, which should be the default
location upon starting the container.

Run the command `make test`:

```bash
$ make test
tsc -b
tsc -b tests/taint_precision/tests/
node --trace-uncaught --stack-trace-limit=20 tests/taint_precision/run_unit.js
Running test: arrayImprecise.js
...
```

Default expected runtime is 240 seconds (an artificial delay was added to ensure
that all tests complete on slower machines before checking results). It can
be changed by modifying this line of [tests/taint_precision/run_unit.js](tests/taint_precision/run_unit.js):

```javascript
setTimeout(checkResults, 240000, all_results);
```

Full expected output can be found in [docs/expected_test_output.txt](docs/expected_test_output.txt). In 
general, the expected final output is:

```bash
Checking results...
All 589 tests have executed successfully.
```


## Run provenance analysis on a single package

`make analyze FILE=path/to/package/driver.js`

Provenance analysis arguments can be found in the Makefile. The default
arguments are the ones that proved to be best in our evaluation.

### Running the case studies

The case studies can be run using the script: `install_run_casestudies.sh`.
It is recommended to run this within a Docker container as vulnerable
packages will be downloaded and executed.

Full expected output for the case studies can  be found in: 
[docs/expected_casestudies_output.txt](docs/expected_casestudies_output.txt).
This expected output was generated in the docker container. Outside the docker
container the output will be similar, but some text such as file paths may
differ.

Below, we include steps for manually running each case study as well as
explanations of the output.

#### `accesslog`

Run: `(cd tests/case_studies/accesslog && npm i)`

To execute the automatically-generated driver
run: `make analyze FILE=tests/case_studies/accesslog/run-accesslog.js`

Expected output:
```javascript
Error: Sink function Function() { [native code] } reached with tainted arguments [object Arguments]
```

A provence graph will be generated at `./taint_0.json`. It can be viewed 
via its graphical representation at `./taint_0.pdf`. The expected 
provenance graph can be seen in: `tests/case_studies/accesslog/expected_taint_0.pdf`.
There may be slight differences in the visual position of nodes in the graph.

To execute our manually-crafted proof-of-concept (PoC) 
exploit: `node tests/case_studies/accesslog/poc.js`

Note: This exploit just prints a string to the console.

Expected output:
```
GLOBAL.CTF HIT
\undefined
```

#### `font-converter`

Run: `(cd tests/case_studies/font-converter && npm i)`

To execute the automatically-generated driver,
run: `make analyze FILE=tests/case_studies/font-converter/run-font-converter.js`

Expected output:
```
Error: Sink function exec(command, options, callback) {
  const opts = normalizeExecArgs(command, options, callback);
  return module.exports.execFile(opts.file,
                                 opts.options,
                                 opts.callback);
} reached with tainted arguments [object Arguments]
```

A provence graph will be generated at `./taint_0.json`. It can be viewed 
via its graphical representation at `./taint_0.pdf`. The expected 
provenance graph can be seen in: `tests/case_studies/font-converter/expected_taint_0.pdf`.
There may be slight differences in the visual position of nodes in the graph.

To execute the automatically-generated proof-of-concept (PoC) 
exploit: `node tests/case_studies/font-converter/poc.js`

Expected output: None.
This exploit creates a file: `./success`.

#### `comsvr-memory`

This case study cannot be replicated because `comsvr-memory` has been
unpublished from npm.

Nonetheless, we have included all of the case study files for inspection:
- The auto-generated driver: `tests/case_studies/comvsr-memory/run-comsvr-memory.js`.
- The auto-generated PoC: `tests/case_studies/comvsr-memory/run-comsvr-memory.js`.
- The generated provenance graph: `tests/case_studies/comvsr-memory/expected_taint_0.pdf`.


## Run the end-to-end pipeline

The end-to-end pipeline is in the `pipeline` directory. The pipeline can be run
in three modes:
- Gathering only: The infrastructure attempts to gather packages from
    npm that meet certain criteria.
- Analysis only: The infrastructure analyzes a given list of packages.
- Gathering and analysis: The infrastructure first performs gathering and then
  analysis.

In both cases, the root command for running the pipeline is 
the `./pipeline/run_pipeline.sh` script.

### Supported arguments

The pipeline supports the following arguments:
```
pipeline % ./run_pipeline.sh --help
Usage: main pipeline [options] <targetCount> <bound> <downloadCount>

Options:
  -f, --fresh                 restart from package list index 0 and clear results
  -l, --log-level <level>     set the log level [debug | info | warn | error]
  -n, --no-cache              no package installation cache
  -c, --cache-dir <path>      path to the package cache directory
  -o, --output-dir <path>     path to store package list output
  -t, --tmp-dir <path>        path to store temporary files
  -s, --start-index <int>     package list index to start gathering from (overrides checkpoint)
  -e, --end-index <int>       maximum package list index to gather from
  -g, --gathering-only        only execute gathering stages of the pipeline
  -a, --analysis-only <path>  only analyze packages in the package list at the provided path
  -z, --z3-path <path>        path to the Z3 solver binary
  --only-cache-included       only cache packages that pass the gathering filters
  --min-num-deps <int>        minimum number of deps for no-instrument heuristic
  --min-depth <int>           minimum depth to apply no-instrument header
  --policies <string>         taint policies to set
  --require-sink-hit          require that a sink was hit as a pipeline step
  --fail-on-output-error      fail a step if the process output has an error
  --fail-on-non-zero-exit     fail a step if the process exits with a non-zero exit code
  -h, --help                  display help for command
```


### Gathering

When running only gathering, the following arguments are relevant:
```
<targetCount> <bound> <downloadCount>
```

The `targetCount` is the number of packages to gather. The `bound` and 
`downloadCount` allow for filtering of packages by their download counts.
The bound can be `lower`, for a minimum download count, or `upper` for a
maximum download count. The `downloadCount` itself is an integer.

The following flags are relevant:
```
  -f, --fresh                 restart from package list index 0 and clear results
  -l, --log-level <level>     set the log level [debug | info | warn | error]
  -n, --no-cache              no package installation cache
  -c, --cache-dir <path>      path to the package cache directory
  -o, --output-dir <path>     path to store package list output
  -t, --tmp-dir <path>        path to store temporary files
  -s, --start-index <int>     package list index to start gathering from (overrides checkpoint)
  -e, --end-index <int>       maximum package list index to gather from
  -g, --gathering-only        only execute gathering stages of the pipeline
  --only-cache-included       only cache packages that pass the gathering filters
  --fail-on-output-error      fail a step if the process output has an error
  --fail-on-non-zero-exit     fail a step if the process exits with a non-zero exit code
```

> Note: Running this stage automatically downloads the npm repository package
index (if it is not found in `--cache-dir`) from https://replicate.npmjs.com/_all_docs. 
This is a somewhat large download (~200MB) and is often slow (~4KB/s). Consider 
manually downloading it _once_ and storing it in `--cache_dir` as 
`npmPackageList.json`. If the download is too slow, we have provided a mirror 
with an old version of the package index at https://cmu.app.box.com/index.php?rm=box_download_shared_file&shared_name=0a3qlxpyukwmhn6s15j1ee9dz67382mr&file_id=f_881152671310. 
Download from that URL manually or replace the URL here: [pipeline/src/utilities.ts#L235](pipeline/src/utilities.ts#L235) for the pipeline to automatically download it.

For example, to gather 2 packages that have a lower bound of 2 downloads each
(and meet our other criteria; see Section 5.1 of the paper), we run the
following command from the pipeline directory:

```bash
cd pipeline
./run_pipeline.sh 2 lower 2 --gathering-only --fresh --cache-dir ./packages --output-dir ./output --tmp-dir ./tmp --log-level info 
```

Since `--gathering-only` is specified, only gathering will be run. The `--fresh`
flag causes existing gathering state to be reset.

This will store installed packages in `./packages`, the list of gathered
packages in `./output` and temporary files in `./tmp`. We set the log level to
`info` to more easily see what the infrastructure is doing.

The command line output should look like:
```
info: Fresh flag is true; resetting the crawl index and clearing results
info: Gathering 2 packages with a lower bound of 2 downloads
info: Overwriting existing filtered package list...
info: Getting package list...
info: Gathering from package list index 0 to 1129558
info: Testing package at index 0: a@*
info: Stopping pipeline at task filterSinks
info: Filtered package list has 0 packages
...
info: Filtered package list has 1 packages
info: Testing package at index 55: a-cypress-testrail-reporter-that-works@*
info: List has 2 packages
info: Done with analysis
```

Full expected output cannot be provided because the npm repository is dynamic;
packages are frequently added and removed.

The produced list of packages can be found in the configured output directory
as a file called `results.json`:

```bash
$ cat output/results.json 
{"rows":[{"id":"a-csv","index":53,"version":"2.0.0","downloadCount":572,
...
```

An example full output file can be found in 
[docs/example_pipeline_gathering_results.json](docs/example_pipeline_gathering_results.json).
The structure of the output file is described below in the Pipeline Output
subsection.


### Analysis

When running only analysis, the following arguments are still relevant:
```
<targetCount> <bound> <downloadCount>
```

The `targetCount` is the number of packages to analyze. The `bound` and 
`downloadCount` must still be provided but can be set to `lower` and `0`.

The following flags are relevant:
```
  -f, --fresh                 restart from package list index 0 and clear results
  -l, --log-level <level>     set the log level [debug | info | warn | error]
  -n, --no-cache              no package installation cache
  -c, --cache-dir <path>      path to the package cache directory
  -o, --output-dir <path>     path to store package list output
  -t, --tmp-dir <path>        path to store temporary files
  -a, --analysis-only <path>  only analyze packages in the package list at the provided path
  -z, --z3-path <path>        path to the Z3 solver binary
  --min-num-deps <int>        minimum number of deps for no-instrument heuristic
  --min-depth <int>           minimum depth to apply no-instrument header
  --policies <string>         taint policies to set
  --require-sink-hit          require that a sink was hit as a pipeline step
  --fail-on-output-error      fail a step if the process output has an error
  --fail-on-non-zero-exit     fail a step if the process exits with a non-zero exit code
```

Different from the gathering stage, running the analysis requires a list of
package names and versions to analyze of the following format:

```json
{
    "rows": [
        {
            "id": "package name",
            "version": "package version"
        }
        ...
    ]
}
```

The entries can contain additional fields as long as "id" and "version" are 
present.

For example, we create a file `./to_analyze.json` containing the output from
the gathering stage ([docs/example_pipeline_gathering_results.json](docs/example_pipeline_gathering_results.json)).

We then run the pipeline (from the pipeline directory):

```bash
cd pipeline
./run_pipeline.sh 2 lower 0 --analysis-only ./to_analyze.json --fresh --cache-dir ./packages --output-dir ./output --tmp-dir ./tmp --log-level info 
```

Since `--analysis-only <path>` is specified, only the analysis will be run. 
The given `<path>` is the one from which the packages-to-analyze will be read. 
The `--fresh` flag causes existing analysis state to be reset.

This will store installed packages in `./packages`, the analysis results 
in `./output` and temporary files in `./tmp`. We set the log level to
`info` to more easily see what the infrastructure is doing.

The command line output should look like:
```
info: Fresh flag is true; resetting the crawl index and clearing results
info: Gathering 2 packages with a lower bound of 0 downloads
info: Overwriting existing filtered package list...
info: Getting package list...
info: Analysis only; reading package list at /nodemedic/pipeline/to_analyze.json
info: Gathering from package list index 0 to 1
...
info: List has 2 packages
info: Done with analysis
```

Full expected output cannot be provided because the npm repository is dynamic;
packages are frequently added and removed.

The produced list of packages can be found in the configured output directory
as a file called `results.json`:

```bash
$ cat output/results.json 
{"rows":[{"id":"a-csv","index":0,"version":"2.0.0",
...
```

An example full output file can be found in 
[docs/example_pipeline_analysis_results.json](docs/example_pipeline_analysis_results.json).
The structure of the output file is described below in the Pipeline Output
subsection. Note that for the packages analyzed for this example, both were
not found to have potentially vulnerable flows, as evidenced by the `runInstrumented`
result "Taint path JSON output not found".


### Gathering and analysis
To run both gathering and analysis, follow the steps listed in in Gathering
subsection, but leave out the flag `--gathering-only` (and `--analysis-only`).
Flags from both the gathering and analysis stages can be used to configure
program behavior, and the output will be as previously described.

### Pipeline output

The pipeline output follows the following structure. At the top level, it is a
list of "rows" where each row is an entry about a gathered and/or analyzed
package.

```json
{
    "rows": [
        <packageEntry>
    ]
}
```

The package entry has the following form:

```json
"id": package name,
"index": index in the npm package repo,
"version": package version,
"downloadCount": package download count,
"packagePath": package to installed package,
"hasMain": whether the package has a main script,
"browserAPIs": list of browser apis found in the package
"sinks": list of NodeMedic-supported sinks found in the package,
"sinksHit": list of sinks hit if `--require-sink-hit` flag is specified,
"entryPoints": list of package public APIs, e.g., [
    <entryPoint>
],
"treeMetadata": metadata about the packages dependency tree (size, depth, etc.),
"sinkType": type of sink (broadly split into ACI, exec, and ACE, eval),
"triageData": triage data about the package, including the computed rating,
"candidateExploit": candidate exploit synthesized for the package,
"exploitResults": results of executing candidate exploit,
"taskResults": object with status and runtime for every task run, e.g., {
    "task name": <taskResult>
}
```

The task results have the format:
```json
{ 
    "status": "Continue" meaning continue to next task | "Abort" meaning halt the pipeline, 
    "time": runtime in milliseconds,
    "result": error information, if any, indicating why the status is "Abort"
}
```

The list of possible tasks are:
- `downloadCount`: Queries the download count for a package.
- `setupPackage`: Downloads and unpacks package source code.
- `filterByMain`: Filters out packages that don't have a `main` script in their `package.json`.
- `filterByBrowserAPIs`: Filters out packages that contain browser APIs.
- `filterSinks`: Filters out packages that don't contain a NodeMedic-supported sink.
- `setupDependencies`: Downloads and sets up package dependencies.
- `getEntryPoints`: Imports the package to determine its public APIs.
- `runNonInstrumented`: Runs the package without instrumentation to check for inherent errors.
- `annotateNoInstrument`: Marks package dependencies for over-approximate analysis.
- `runJalangiBabel`: Runs package with blank Jalangi2 analysis to check runtime and inherent errors.
- `runInstrumented`: Runs the NodeMedic provenance analysis on the package.
- `triageFlow`: Runs the triage model on the generated provenance graph.
- `setSinkType`: Sets the type of the sink (command injection or code execution).
- `smt`: Runs exploit synthesis on the provenance graph generated during provenance analysis.
- `checkExploit`: Checks whether any synthesized candidate exploits were successful.
