import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";

test_suite("--------------- Loops ----------------", function() {

    var a = 1;

    test_one("a should be tainted", function() {
        __jalangi_set_taint__(a);
        __jalangi_assert_taint_true__(a);
    });

    test_one("a incremented should be tainted", function() {
        for (var i = 0; i < 10; i++) {
            a += 1;
        }
        __jalangi_assert_taint_true__(a);
    });

    test_one("a incremented should be tainted  2", function() {
        for (var i = 0; i <= 10; i++) {
            a += 1;
        }
        __jalangi_assert_taint_true__(a);
    });
});
