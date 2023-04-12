// JALANGI DO NOT INSTRUMENT

const fs = require('fs')
const exec = require('child_process').exec;
const assert = require('assert');

const rewriteFile = 'src/rewrite.js'
const scriptsFolder = './tests/taint_precision/tests/_build/taint_precision/tests';
const files = fs.readdirSync(scriptsFolder);

// Default policies to apply to all tests
const defaultPolicies = {
    'string': 'precise',
    'array': 'precise',
    'object': 'precise',
};

// Test-file-specific policies that override 
// the default policies
const filePolicies = {
    'arrayImprecise.js': {
        'array': 'imprecise',
    },
    'functionPrototype.js': {
        'array': 'imprecise',
    },
    'string_taint.js': {
        'array': 'imprecise',
    },
};

const funcs = files
    .filter(function(file) {
        return !file.includes('_jalangi_');
    })
    .map(function(file) {
        console.log(`Running test: ${file}`);
        let analysis = `node lib/jalangi2-babel/src/js/commands/jalangi.js --analysis ${rewriteFile}`;
        let errorFlag = 'log_level=error';
        let assertFlag = 'assert_passed=true';
        // Construct the policy flag
        let policyLevels = [];
        Object.keys(defaultPolicies).forEach(function(policyType) {
            if (filePolicies.hasOwnProperty(file) && filePolicies[file].hasOwnProperty(policyType)) {
                policyLevels.push([policyType, filePolicies[file][policyType]]);
            } else {
                policyLevels.push([policyType, defaultPolicies[policyType]]);
            }
        });
        let policyFlag = 'policies=' + policyLevels.map((x) => `${x[0]}:${x[1]}`).join(',');
        let testCmd = `${scriptsFolder}/${file} ${errorFlag} ${assertFlag} ${policyFlag}`;
        return exec.bind(null, `${analysis} ${testCmd}`);
    });

function getResults(results, err, data) {
    if (err) {
        console.log(err);
    } else {
        console.log(data);
        results.push(data);
    }
}

function checkResults(lines) {
    console.log("Checking results...")
    var succeeded_tests = 0;
    var failed_tests = 0;
    for (let i in lines) {
        succeeded_tests += (lines[i].match(/Success/g) || []).length;
    }
    for (let i in lines) {
        failed_tests += (lines[i].match(/Failure/g) || []).length;
    }
    if (failed_tests > 0) {
        assert(false, `Test results:
                        Success: ${succeeded_tests}
                        Failure: ${failed_tests}
                        Total:   ${succeeded_tests + failed_tests}`);
    } else {
        console.log(`All ${succeeded_tests} tests have executed successfully.`);
    }
}

var all_results = [];
for (i in funcs) {
    funcs[i](getResults.bind(null, all_results));
}

// Adjust this timeout as needed for all tests to complete
setTimeout(checkResults, 240000, all_results);
