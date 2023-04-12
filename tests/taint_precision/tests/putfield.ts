import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one, test_one_should_fail} from "../../test_header";


test_suite("----------------- Put Field Tests (1) -------------------", function() {

    /*
        Tests minmal test case
        b = {};
        var a = b.styles = {};
        a.c = 1; 
        
        Found in colors
    */

    var b = {};
    var k = {};

    test_one("Setting taint on k", function() {
        __jalangi_set_taint__(k);
    });

    test_one("k should be tainted", function() {
        __jalangi_assert_taint_true__(k);
    })

    // @ts-ignore: allows us to repro the error
    var a = b.styles = k;

    test_one("b.styles should be tainted", function() {
        // @ts-ignore: allows us to repro the error
        __jalangi_assert_taint_true__(b.styles);
    })

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });


    //setting this should not crash
    // @ts-ignore: allows us to repro the error
    a.c = "Hello";

    test_one("k should still be tainted", function() {
        __jalangi_assert_taint_true__(k);
    });

});


