// JALANGI DO NOT INSTRUMENT
import { strict as assert } from 'assert';

process.on('uncaughtException', function(exn) {
    console.log(`Uncaught exception: ${exn.message}`);
});


export function test_suite(msg: string, func: Function) {
    console.log(msg);
    func();
    console.log("---------- Test End ------------");
}

function printSuccess(msg: string) {
    // console.log("\033[1;32;40m" + msg + "\x1b[0m");
    console.log(msg);
}

function printFail(msg: string) {
    // console.log("\033[1;33;40m"  + msg + "\x1b[0m");
    console.log(msg);
}

export function test_assert(cond: boolean, msg?: string) {
    if (msg != undefined) {
        assert(cond, msg);
    } else {
        assert(cond);
    }
    assert(false, "Completed execution");
}

export function test_one(msg: string, func: Function) {
    console.log(`Should succeed: ${msg}`);
    try {
        func();
        printSuccess("    [x] Success1: No error, but did assertion run?");
    } catch (error) {
        if (error.message == "Completed execution") {
            printSuccess("    [x] Success2: Assertion ran without error");
        } else {
            printFail(`    [ ] Failure: ${error.message}`);
            if (error.message.indexOf('Assertion failure') != -1) {
                throw error;
            }
        }
    }
}

export function test_one_should_fail(msg: string, func: Function) {
    console.log(`Should fail: ${msg}`);
    try {
        func();
        printFail("    [ ] Failure1: Expected error, did assertion run?");
    } catch (error) {
        if (error.message == "Completed execution") {
            printFail("    [ ] Failure2: Assertion ran, but did not get expected error");
        } else {
            printSuccess("    [x] Success: Recorded an error as expected");
        }
    }
}
