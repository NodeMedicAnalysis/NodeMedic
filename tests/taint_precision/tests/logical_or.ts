import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";

test_suite("--------------- Logical OR (1) -----------------", function() {

    var a = Object(1);
    var b;

    test_one("a should be tainted", function() {
        __jalangi_set_taint__(a);
        __jalangi_assert_taint_true__(a);
    });

    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });
    
    test_one("b in b = a || false should be tainted", function() {
        b = a || false;
        __jalangi_assert_taint_true__(b);
    });

});

test_suite("--------------- Logical OR (2) -----------------", function() {

    var a = Object(1);
    var b: any;

    test_one("a should be tainted", function() {
        __jalangi_set_taint__(a);
        __jalangi_assert_taint_true__(a);
    });

    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    test_one("b in b = false || a should be tainted", function() {
        b = false || a;
        __jalangi_assert_taint_true__(b);
    });

});
