import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";


test_suite("------------------ Undefined -------------------", function() {
    let a = undefined;

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    })

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    let b = 2;

    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    let c;

    test_one("c should not be tainted", function() {
        __jalangi_assert_taint_false__(c);
    });

    c = a + b;

    test_one("c in c = a + b should be tainted", function() {
        __jalangi_assert_taint_true__(c);
    });
});

test_suite("------------------ Null -------------------", function() {
    let a = null;

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    })

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    let b = null;

    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    let c = a + b;

    test_one("c in c = a + b should be tainted", function() {
        __jalangi_assert_taint_true__(c);
    });
});