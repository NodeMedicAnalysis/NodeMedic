var assert = require('assert');
import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one, test_one_should_fail} from "../../test_header";


test_suite("----------------- JSON tests (1) -------------------", function() {

    var x = {
        a: "Hello",
        b: 1,
        c: true,
        d: {
            e: 2,
        },
        f: "Not tainted",
    };

    test_one("Setting taint on x.a", function() {
        __jalangi_set_taint__(x.a);
    });

    test_one("Setting taint on x.b", function() {
        __jalangi_set_taint__(x.b);
    });
    
    test_one("Setting taint on x.c", function() {
        __jalangi_set_taint__(x.c);
    });

    test_one("Setting taint on x.d", function() {
        __jalangi_set_taint__(x.d);
    });
/*
    var y = JSON.stringify(x);
    var z = JSON.parse(y);

    test_one("Checking that z.a is properly parsed", function() {
        assert(z.a == "Hello");
    });

    test_one("Checking that z.b is properly parsed", function() {
        assert(z.b == 1);
    });
    
    test_one("Checking that z.c is properly parsed", function() {
        assert(z.c == true);
    });

    test_one("Checking that z.d.e is properly parsed", function() {
        assert(z.d.e == 2);
    });

    test_one("Checking that z.f is properly parsed", function() {
        assert(z.f == "Not tainted");
    });
    
    test_one("z should not be tainted", function() {
        __jalangi_assert_taint_false__(z);
    });
    
    test_one("z.a should be tainted", function() {
        __jalangi_assert_taint_true__(z.a);
    });

    test_one("z.b should be tainted", function() {
        __jalangi_assert_taint_true__(z.b);
    });

    test_one("z.c should be tainted", function() {
        __jalangi_assert_taint_true__(z.c);
    });

    test_one("z.d should be tainted", function() {
        __jalangi_assert_taint_true__(z.d);
    });

    test_one("z.f should not be tainted", function() {
        __jalangi_assert_taint_false__(z.f);
    });

});

test_suite("----------------- JSON tests (2) -------------------", function() {

    var x = '{"a":"Hello"}';
    var y = JSON.parse(x);

    test_one("", function() {
        assert(y.a == "Hello");
    });

    test_one("y should not be tainted", function() {
        __jalangi_assert_taint_false__(y);
    });

    test_one("y.a should not be tainted", function() {
        __jalangi_assert_taint_false__(y.a);
    });
*/
});
