import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__,
    __assert_string_range_all_untainted__,
    __assert_string_range_all_tainted__} from "../../taint_header";
import {test_suite, test_one, test_one_should_fail} from "../../test_header";


function spread(...args) {
    return args[0];
}

test_suite("----------------- Spread tests (1) -------------------", function() {

    let a = "test";

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    let b = spread(a);

    test_one("b should be tainted", function() {
        __jalangi_assert_taint_true__(b);
    });
});


test_suite("----------------- Spread tests (2) -------------------", function() {

    let a = "test";
    let b = [];

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    b.push(a);
    
    var id = function(...args) {
        return args;
    }

    test_one("...b should be tainted", function() {
        __jalangi_assert_taint_true__(id(...b));
    });
});
