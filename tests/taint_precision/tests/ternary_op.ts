import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";

// d = a ? b : c;

test_suite("-------------- Ternary Op (1) ----------------", function() {

    // Case 1: a is tainted
    var a = true;
    var b = 1;
    var c = 2;
    var d;

    test_one("a should be tainted", function() {
        __jalangi_set_taint__(a);
        __jalangi_assert_taint_true__(a);
    })

    test_one("d in d = a ? b : c should not be tainted", function() {
        d = a ? b : c;
        __jalangi_assert_taint_false__(d);
    });

});

test_suite("-------------- Ternary Op (2) ----------------", function() {

    // Case 2: b is tainted
    var a = true;
    var b = 1;
    var c = 2;
    var d;

    test_one("b should be tainted", function() {
        __jalangi_set_taint__(b);
        __jalangi_assert_taint_true__(b);
    })

    test_one("d in d = a ? b : c should be tainted", function() {
        d = a ? b : c;
        __jalangi_assert_taint_true__(d);
    });

}); 


test_suite("-------------- Ternary Op (3) ----------------", function() {

    // Case 3: c is tainted
    var a = true;
    var b = 1;
    var c = 2;
    var d;

    test_one("c should be tainted", function() {
        __jalangi_set_taint__(c);
        __jalangi_assert_taint_true__(c);
    })

    test_one("d in d = a ? b : c should not be tainted", function() {
        d = a ? b : c;
        __jalangi_assert_taint_false__(d);
    });

});
