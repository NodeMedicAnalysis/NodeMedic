import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";

test_suite("------------- String Taint (Precise) -----------", function() {
    
    var a = "Hello";

    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

    test_one("No character of a should be tainted", function() {
        for (var i = 0; i < a.length; i++) {
            __jalangi_assert_prop_taint_false__(a, i);
        }
    });

    test_one("Only a[1] should be tainted", function() {
        __jalangi_set_prop_taint__(a, 1);
        for (var i = 0; i < a.length; i++) {
            if (i == 1) {
                __jalangi_assert_prop_taint_true__(a, i);
            } else {
                __jalangi_assert_prop_taint_false__(a, i);
            }
        }
    });

});
