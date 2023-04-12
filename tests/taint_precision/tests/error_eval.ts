import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one, test_one_should_fail} from "../../test_header";

test_suite("----------------- Eval test -------------------", function() {

    var x = "console.log(\"Hello\")";
    
    test_one("x should be tainted", function() {
        __jalangi_set_taint__(x);
        __jalangi_assert_taint_true__(x);
    });
    
    test_one_should_fail("eval(x) should error", function() {
        eval(x);
    });

});
