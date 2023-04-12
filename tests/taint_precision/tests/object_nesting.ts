import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";


test_suite("----------------- Nested object test (1) -------------------", function() {

    var a = {
        b: {
            c: 1,
        },
    };

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });
    
    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("a.b should be tainted", function() {
        __jalangi_assert_taint_true__(a.b);
    });

    test_one("a.b.c should be tainted", function() {
        __jalangi_assert_taint_true__(a.b.c);
    });

});

test_suite("----------------- Nested object test (2) -------------------", function() {

    var a = {
        b: {
            c: 1,
        },
        d: 0,
    };

    test_one("Setting taint on a.b", function() {
        __jalangi_set_taint__(a.b);
    });

    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

    test_one("a.b should be tainted", function() {
        __jalangi_assert_taint_true__(a.b);
    });

    test_one("a.b.c should be tainted", function() {
        __jalangi_assert_taint_true__(a.b.c);
    });

});

test_suite("----------------- Nested object test (3) -------------------", function() {

    var a = {
        b: {
            c: 1,
            d: 0,
        },
        e: 0,
    };

    test_one("Setting taint on a.b.c", function() {
        __jalangi_set_taint__(a.b.c);
    });

    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

    test_one("a.b should not be tainted", function() {
        __jalangi_assert_taint_false__(a.b);
    });

    test_one("a.b.c should be tainted", function() {
        __jalangi_assert_taint_true__(a.b.c);
    });

});

test_suite("------------ Nested object through native context (1) -------------", function() {

    var a = {
        b: {
            c: "test1",
        },
    };

    test_one("Setting taint on a.b.c", function() {
        __jalangi_set_taint__(a.b.c);
    });

    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

    test_one("a.b should be tainted", function() {
        __jalangi_assert_taint_true__(a.b);
    });

    test_one("a.b.c should be tainted", function() {
        __jalangi_assert_taint_true__(a.b.c);
    });

    test_one("Defining property d on a", function() {
        Object.defineProperty(a, 'd', {value: 'test2'});
    });

    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

    test_one("a.b should be tainted", function() {
        __jalangi_assert_taint_true__(a.b);
    });

    test_one("a.b.c should be tainted", function() {
        __jalangi_assert_taint_true__(a.b.c);
    });

    test_one("a.d should not be tainted", function() {
        // @ts-ignore
        __jalangi_assert_taint_false__(a.d);
    });

});

test_suite("------------ Nested object through native context (2) -------------", function() {

    var a = {
        b: {
            c: 1,
            d: 0,
        },
        e: 0,
    };

    test_one("Setting taint on a.b.c", function() {
        __jalangi_set_taint__(a.b.c);
    });

    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

    test_one("a.b should not be tainted", function() {
        __jalangi_assert_taint_false__(a.b);
    });

    test_one("a.b.c should be tainted", function() {
        __jalangi_assert_taint_true__(a.b.c);
    });

    test_one("a.b.d should not be tainted", function() {
        __jalangi_assert_taint_false__(a.b.d);
    });

    test_one("a.e should not be tainted", function() {
        __jalangi_assert_taint_false__(a.e);
    });

    test_one("Defining property f on a", function() {
        Object.defineProperty(a, 'f', {value: 'test'});
    });

    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

    test_one("a.b should not be tainted", function() {
        __jalangi_assert_taint_false__(a.b);
    });

    test_one("a.b.c should be tainted", function() {
        __jalangi_assert_taint_true__(a.b.c);
    });

    test_one("a.b.d should not be tainted", function() {
        __jalangi_assert_taint_false__(a.b.d);
    });

    test_one("a.e should not be tainted", function() {
        __jalangi_assert_taint_false__(a.e);
    });

    test_one("a.f should not be tainted", function() {
        // @ts-ignore
        __jalangi_assert_taint_false__(a.f);
    });

});
