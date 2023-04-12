import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import { test_suite, test_one } from "../../test_header";


test_suite("---------- Object.toString() 1 --------", function() {
    var x = {test: "Hello"};

    test_one("Setting taint on x", function() {
        __jalangi_set_taint__(x);
    });

    test_one("x.toString() should be tainted", function () {
        __jalangi_assert_taint_true__(x.toString());
    });
});

test_suite("---------- Object.toString() 2 --------", function() {
    var x = {test: "Hello"};

    test_one("Setting taint on x.test", function() {
        __jalangi_set_taint__(x.test);
    });

    test_one("x.toString() should be tainted", function () {
        __jalangi_assert_taint_true__(x.toString());
    });
});

test_suite("---------- Object.toString() 3 --------", function() {
    var x = {test1: "Hello", test2: "World"};

    test_one("Setting taint on x.test", function() {
        __jalangi_set_taint__(x.test1);
    });

    test_one("x.toString() should not be tainted", function () {
        __jalangi_assert_taint_false__(x.toString());
    });
});

test_suite("---------- Object.valueOf() 1 --------", function() {
    var x = {test: "Hello"};

    test_one("Setting taint on x", function() {
        __jalangi_set_taint__(x);
    });

    test_one("x.valueOf() should be tainted", function () {
        __jalangi_assert_taint_true__(x.valueOf());
    });
});

test_suite("---------- Object.valueOf() 2 --------", function() {
    var x = {test: "Hello"};

    test_one("Setting taint on x.test", function() {
        __jalangi_set_taint__(x.test);
    });

    test_one("x.valueOf() should be tainted", function () {
        __jalangi_assert_taint_true__(x.valueOf());
    });
});

test_suite("---------- Object.valueOf() 3 --------", function() {
    var x = {test1: "Hello", test2: "World"};

    test_one("Setting taint on x", function() {
        __jalangi_set_taint__(x.test1);
    });

    test_one("x.valueOf() should not be tainted", function () {
        __jalangi_assert_taint_false__(x.valueOf());
    });
});

test_suite("---------- Object.hasOwnProperty() 1 --------", function() {
    var x = {test: "Hello"};

    test_one("Setting taint on x", function() {
        __jalangi_set_taint__(x);
    });

    test_one("x.hasOwnProperty('test') should be tainted", function () {
        __jalangi_assert_taint_true__(x.hasOwnProperty('test'));
    });
});

test_suite("---------- Object.hasOwnProperty() 2 --------", function() {
    var x = {test: "Hello"};

    test_one("Setting taint on x.test", function() {
        __jalangi_set_taint__(x.test);
    });

    test_one("x.hasOwnProperty('test') should be tainted", function () {
        __jalangi_assert_taint_true__(x.hasOwnProperty('test'));
    });
});

test_suite("---------- Object.hasOwnProperty() 3 --------", function() {
    var x = {test1: "Hello", test2: "World"};

    test_one("Setting taint on x.test1", function() {
        __jalangi_set_taint__(x.test1);
    });

    // Imprecise
    test_one("x.hasOwnProperty('test1') should not be tainted", function () {
        __jalangi_assert_taint_false__(x.hasOwnProperty('test1'));
    });

    // TODO: This fails without additional precision
    // test_one("x.hasOwnProperty('test1') should be tainted", function () {
    //     __jalangi_assert_taint_false__(x.hasOwnProperty('test1'));
    // });
    // test_one("x.hasOwnProperty('test2') should not be tainted", function () {
    //     __jalangi_assert_taint_true__(x.hasOwnProperty('test2'));
    // });
});
