import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one, test_one_should_fail} from "../../test_header";


test_suite("----------------- Object prototype modification -------------------", function() {

    var a = Object();
    
    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    var b = Object;

    test_one_should_fail("Modifying b's prototype should fail", function() {
        // @ts-ignore
        b.prototype = a;
    });

});

test_suite("----------------- String prototype modification -------------------", function() {

    var a = Object();
    
    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    var b = String;

    test_one_should_fail("Modifying b's prototype should fail", function() {
        // @ts-ignore
        b.prototype = a;
    });

});

test_suite("----------------- Array prototype modification -------------------", function() {

    var a = Object();
    
    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    var b = Array;

    test_one_should_fail("Modifying b's prototype should fail", function() {
        // @ts-ignore
        b.prototype = a;
    });

});
