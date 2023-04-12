import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";


test_suite("----------------- Array tests (0) -------------------", function() {
   let a = [];

    test_one("Setting taint on a", function() {
       __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
       __jalangi_assert_taint_true__(a);
    });
});

test_suite("----------------- Array tests (1) -------------------", function() {

    let a = [];
    let b = "Hello";

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    })

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    a.push(b);

    test_one("a should still be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("a[0] should be tainted", function() {
        __jalangi_assert_taint_true__(a[0]);
    });

    let c = a.pop();

    test_one("a.pop() should be tainted", function() {
        __jalangi_assert_taint_true__(c);
    });
});

test_suite("----------------- Array tests (2) -------------------", function() {

    let a = [];
    let b = {test: "Hello"};

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    })

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    a.push(b);

    test_one("a should still be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("a[0] should be tainted", function() {
        __jalangi_assert_taint_true__(a[0]);
    });

    let c = a.pop();

    test_one("a.pop() should be tainted", function() {
        __jalangi_assert_taint_true__(c);
    });
});
