import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";


test_suite("--------------- Binary Operations (1) ----------------", function() {
    let a = 1;
    let b = 2;

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    let c = a + b;

    test_one("c in c = a + b should be tainted", function() {
        __jalangi_assert_taint_true__(c);
    });

    let d = b + a;

    test_one("d in d = b + a should be tainted", function() {
        __jalangi_assert_taint_true__(d);
    });
});

test_suite("--------------- Binary Operations (2) ----------------", function() {
    let a = 'hello';
    let b = undefined;

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    let c = a + b;

    test_one("c in c = a + b should be tainted", function() {
        __jalangi_assert_taint_true__(c);
    });

    let d = b + a;

    test_one("d in d = b + a should be tainted", function() {
        __jalangi_assert_taint_true__(d);
    });
});
