import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__, __jalangi_assert_wrapped__} from "../../taint_header";
import {test_suite, test_one, test_assert} from "../../test_header";


test_suite("--------------- Typeof Transparency (number) ----------------", function() {
    let a = 1;

    test_one("typeof a should be 'number'", function() {
        test_assert(typeof(a) === 'number');
    });

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("typeof a should still be 'number'", function() {
        test_assert(typeof(a) === 'number');
    });
});

test_suite("--------------- Typeof Transparency (string) ----------------", function() {
    let a = "Hello";

    test_one("typeof a should be 'string'", function() {
        test_assert(typeof(a) === 'string');
    });

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("typeof a should still be 'string'", function() {
        test_assert(typeof(a) === 'string');
    });
});

test_suite("--------------- Typeof Transparency (boolean) ----------------", function() {
    let a = true;

    test_one("typeof a should be 'boolean'", function() {
        test_assert(typeof(a) === 'boolean');
    });

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("typeof a should still be 'boolean'", function() {
        test_assert(typeof(a) === 'boolean');
    });
});

test_suite("--------------- Typeof Transparency (undefined) ----------------", function() {
    let a = undefined;

    test_one("typeof a should be 'undefined'", function() {
        test_assert(typeof(a) === 'undefined');
    });

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("typeof a should still be 'undefined'", function() {
        test_assert(typeof(a) === 'undefined');
    });
});

test_suite("--------------- Typeof Transparency (null) ----------------", function() {
    let a = null;

    test_one("typeof a should be 'object'", function() {
        test_assert(typeof(a) === 'object');
    });

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("typeof a should still be 'object'", function() {
        test_assert(typeof(a) === 'object');
    });
});

test_suite("--------------- Typeof Transparency (object) ----------------", function() {
    let a = {};

    test_one("typeof a should be 'object'", function() {
        test_assert(typeof(a) === 'object');
    });

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("typeof a should still be 'object'", function() {
        test_assert(typeof(a) === 'object');
    });
});