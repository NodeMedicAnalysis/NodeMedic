import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one, test_one_should_fail} from "../../test_header";


test_suite("--------------- Promisify ----------------", function() {

    // Exec is wrapped in a promise
    var exec =  require("util").promisify(require('child_process').exec);

    var test = "ls";

    test_one("Setting taint on test", function() {
        __jalangi_set_taint__(test);
    });

    test_one_should_fail("Wrapped exec sink should be hit", function() {
        exec(test).then(function(result) {});
    });

});
