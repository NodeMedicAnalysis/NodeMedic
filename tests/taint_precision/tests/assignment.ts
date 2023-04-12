import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";


test_suite("----------------- Assignment Tests -------------------", function() {

    var x = "Hello";
    
    test_one("x is tainted", function() {
        __jalangi_set_taint__(x);
        __jalangi_assert_taint_true__(x);
    });

    var y = {
        name: x,
        test: "World",
    };

    test_one("y.name is tainted", function() {
        __jalangi_assert_taint_true__(y.name);
    });

    test_one("y.test is not tainted", function() {
        __jalangi_assert_taint_false__(y.test);
    });

    test_one("y is not tainted", function() {
        __jalangi_assert_taint_false__(y);
    });

    var z = {
        old: 'Test',
    };

    z['new'] = y.name;
    test_one("z[new] is tainted", function() {
        __jalangi_assert_taint_true__(z['new']);
    });

    test_one("z is not tainted", function() {
        __jalangi_assert_taint_false__(z);
    });

    var b = x;
    test_one("b is tainted", function() {
        __jalangi_assert_taint_true__(b);
    });

    var c = x || false;
    test_one("c is tainted", function() {
        __jalangi_assert_taint_true__(c);
    });

    var d = 1;
    test_one("d is tainted", function() {
        __jalangi_set_taint__(d);
        __jalangi_assert_taint_true__(d);
    });

    var e = 2;
    test_one("e is not tainted", function() {
        __jalangi_assert_taint_false__(e);
    });

    var f = d + e;
    test_one("f is tainted", function() {
        __jalangi_assert_taint_true__(f);
    });

});
