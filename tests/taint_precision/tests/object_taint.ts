import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import { test_suite, test_one } from "../../test_header";


test_suite("---------- Object tainting --------", function() {
    var x = Object();

    test_one("x should not be tainted", function() {
        __jalangi_assert_taint_false__(x);
    });

    test_one("Setting taint on x", function() {
        __jalangi_set_taint__(x);
    });

    test_one("x should be tainted", function () {
        __jalangi_assert_taint_true__(x);
    });
});

test_suite("---------- Object property (object) tainting 1 --------", function() {
    var x = {test: {}};

    test_one("x should not be tainted", function() {
        __jalangi_assert_taint_false__(x);
    });

    test_one("Setting taint on x", function() {
        __jalangi_set_taint__(x);
    });

    test_one("x should be tainted", function () {
        __jalangi_assert_taint_true__(x);
    });

    test_one("x.test should be tainted", function () {
        __jalangi_assert_taint_true__(x.test);
    });
});

test_suite("---------- Object property (object) tainting 2 --------", function() {
    var x = {test: {}};

    test_one("x should not be tainted", function() {
        __jalangi_assert_taint_false__(x);
    });

    test_one("Setting taint on x.test", function() {
        __jalangi_set_taint__(x.test);
    });

    test_one("x.test should be tainted", function () {
        __jalangi_assert_taint_true__(x.test);
    });

    test_one("x should be tainted", function () {
        __jalangi_assert_taint_true__(x);
    });
});

test_suite("---------- Object property (object) tainting 3 --------", function() {
    var x = {test1: {}, test2: {}};

    test_one("x should not be tainted", function() {
        __jalangi_assert_taint_false__(x);
    });

    test_one("Setting taint on x.test1", function() {
        __jalangi_set_taint__(x.test1);
    });

    test_one("x.test1 should be tainted", function () {
        __jalangi_assert_taint_true__(x.test1);
    });

    test_one("x.test2 should not be tainted", function () {
        __jalangi_assert_taint_false__(x.test2);
    });

    test_one("x should not be tainted", function () {
        __jalangi_assert_taint_false__(x);
    });
});

test_suite("---------- Object property (primitive) tainting 1 --------", function() {
    var x = {test: "Hello"};

    test_one("x should not be tainted", function() {
        __jalangi_assert_taint_false__(x);
    });

    test_one("Setting taint on x", function() {
        __jalangi_set_taint__(x);
    });

    test_one("x should be tainted", function () {
        __jalangi_assert_taint_true__(x);
    });

    test_one("x.test should be tainted", function () {
        __jalangi_assert_taint_true__(x.test);
    });
});

test_suite("---------- Object property (primitive) tainting 2 --------", function() {
    var x = {test: "Hello"};

    test_one("x should not be tainted", function() {
        __jalangi_assert_taint_false__(x);
    });

    test_one("Setting taint on x.test", function() {
        __jalangi_set_taint__(x.test);
    });

    test_one("x.test should be tainted", function () {
        __jalangi_assert_taint_true__(x.test);
    });

    test_one("x should be tainted", function () {
        __jalangi_assert_taint_true__(x);
    });
});

test_suite("---------- Object property (primitive) tainting 3 --------", function() {
    var x = {test1: "Hello", test2: "World"};

    test_one("x should not be tainted", function() {
        __jalangi_assert_taint_false__(x);
    });

    test_one("Setting taint on x.test1", function() {
        __jalangi_set_taint__(x.test1);
    });

    test_one("x.test1 should be tainted", function () {
        __jalangi_assert_taint_true__(x.test1);
    });

    test_one("x.test2 should be tainted", function () {
        __jalangi_assert_taint_false__(x.test2);
    });

    test_one("x should not be tainted", function () {
        __jalangi_assert_taint_false__(x);
    });
});
