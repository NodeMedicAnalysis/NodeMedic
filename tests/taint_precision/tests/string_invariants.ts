import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__,
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__, __jalangi_clear_prop_taint__,
    __jalangi_assert_some_prop_tainted__} from "../../taint_header";
import {test_suite, test_one, test_one_should_fail} from "../../test_header";

test_suite("------------- String Invariants (1) -----------", function() {

    var a = "Hello";

    test_one("Setting taint on a ", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    // s Tainted ==> allPropertiesTainted(s)
    for (let i = 0; i < a.length; i++) {
        test_one(`${a[i]} should still be tainted`, function() {
            __jalangi_assert_prop_taint_true__(a, i);
        });
    }

    test_one("Clearing taint on H", function() {
       __jalangi_clear_prop_taint__(a, 0);
    });

    test_one("H should not be tainted", function() {
        __jalangi_assert_prop_taint_false__(a, 0);
    });

    for (let i = 0; i < a.length; i++) {
        if (i == 0) {
            test_one(`${a[i]} should not be tainted`, function() {
                __jalangi_assert_prop_taint_false__(a, i);
            });
        } else {
            test_one(`${a[i]} should still be tainted`, function() {
               __jalangi_assert_prop_taint_true__(a, i);
            });
        }
    }

    // !allPropertiesTainted(s) ==> !s Tainted
    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

});


test_suite("------------- String Invariants (2) -----------", function() {

    // anyPropertyTainted(s) ==> s.Length Tainted

    let a = "Hello";

    test_one("Setting taint on H", function() {
       __jalangi_set_prop_taint__(a, 0);
    });

    test_one("H should be tainted", function() {
        __jalangi_assert_prop_taint_true__(a, 0);
    });

    for (let i = 1; i < a.length; i++) {
        test_one(`${a[i]} should not be tainted`, function() {
            __jalangi_assert_prop_taint_false__(a, i);
        })
    }

    test_one("a.length should be tainted", function() {
       __jalangi_assert_prop_taint_true__(a, 'length');
    });

});


test_suite("------------- String Invariants (3) -----------", function() {

    let a = "hi";

    test_one_should_fail("No properties of a are tainted", function() {
       __jalangi_assert_some_prop_tainted__(a);
    });

    test_one("Setting taint on h", function() {
       __jalangi_set_prop_taint__(a, 0);
    });

    test_one("Some property of a is tainted", function() {
        __jalangi_assert_some_prop_tainted__(a);
    });

    test_one("h is tainted", function() {
        __jalangi_assert_prop_taint_true__(a, 0);
    });

    test_one("i is not tainted", function() {
        __jalangi_assert_prop_taint_false__(a, 1);
    });

    test_one("a is not tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

    test_one("Setting taint on i", function() {
       __jalangi_set_prop_taint__(a, 1);
    });

    test_one("h is tainted", function() {
        __jalangi_assert_prop_taint_true__(a, 0);
    });

    test_one("i is tainted", function() {
        __jalangi_assert_prop_taint_true__(a, 1);
    });

    // a is now tainted because we've set taint
    // on all of its properties
    test_one("a is tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

});
