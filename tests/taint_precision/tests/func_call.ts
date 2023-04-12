import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";

test_suite("--------------- Function Call ----------------", function() {

    function test(a: any): any {
        return a;
    }

    var arg = Object();

    var ret = Object();

    test_one("Setting taint on arg", function() {
        __jalangi_set_taint__(arg);
        
    });

    test_one("arg should be tainted", function() {
        __jalangi_assert_taint_true__(arg);
    })


    test_one("ret should not be tainted", function() {
        __jalangi_assert_taint_false__(ret);
    });

    test_one("ret in ret = test(arg) should be tainted", function() {
        ret = test(arg);
        __jalangi_assert_taint_true__(ret);
    });


    test_one("Regression: WInvokeFun should be empty at the end for external functions", function() {
        var fs = require('fs')
        var buffer = new Buffer(1024)
        var filepath = __filename
        var descriptor = fs.openSync(filepath, 'r')
        fs.readSync(descriptor, buffer, 0, 1024, 0)
        __jalangi_assert_taint_false__(descriptor)
    });

});


test_suite("--------------- Recursive Call ----------------", function() {

    function test(a: any, ctr): any {
        if (ctr > 0) {
            return test(a, ctr - 1);
        } else {
            return a;
        }
    }

    var arg = Object();

    test_one("Setting taint on arg", function() {
        __jalangi_set_taint__(arg);
        
    });

    test_one("arg should be tainted", function() {
        __jalangi_assert_taint_true__(arg);
    });

    var ret = test(arg, 10);

    test_one("ret in ret = test(arg, 10) should be tainted", function() {
        __jalangi_assert_taint_true__(ret);
    });

});
