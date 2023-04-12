import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__, __assert_string_range_all_tainted__,
    __string_range_set_taint__,
    __assert_string_range_all_untainted__,
    __assert_array_range_all_tainted__,
    __assert_array_range_all_untainted__} from "../../taint_header";
import { test_suite, test_one } from "../../test_header";


test_suite("----------------- Precise Array tests (1) -------------------", function() {

    let a = [];
    let b = "Hello";

    test_one("Setting taint on b", function() {
       __jalangi_set_taint__(b);
    });

    test_one("b should be tainted", function() {
        __jalangi_assert_taint_true__(b);
    });

    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

    a.push(b);

    test_one("a[0] should be tainted", function() {
        __jalangi_assert_taint_true__(a[0]);
    });

    a.push("World");

    test_one("a[1] should not be tainted", function() {
       __jalangi_assert_taint_false__(a[1]);
    });

});

test_suite("-----------------  Precise Array tests (2) -------------------", function() {

    let a = [];
    let b = "Hello";

    test_one("Setting taint on b", function() {
       __jalangi_set_taint__(b);
    });

    test_one("b should be tainted", function() {
        __jalangi_assert_taint_true__(b);
    });

    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

    a.push(b);

    test_one("a[0] should be tainted", function() {
        __jalangi_assert_taint_true__(a[0]);
    });

    a.push({test: "World"});

    test_one("a[1] should not be tainted", function() {
       __jalangi_assert_taint_false__(a[1]);
    });

});

test_suite("-----------------  Precise Array tests (3) -------------------", function() {

    let a = [];
    let b = {test: "Hello"};

    test_one("Setting taint on b", function() {
       __jalangi_set_taint__(b);
    });

    test_one("b should be tainted", function() {
        __jalangi_assert_taint_true__(b);
    });

    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

    a.push(b);

    test_one("a[0] should be tainted", function() {
        __jalangi_assert_taint_true__(a[0]);
    });

    a.push("World");

    test_one("a[1] should not be tainted", function() {
        __jalangi_assert_taint_false__(a[1]);
    });

});


test_suite("-----------------  Precise Array tests (4) -------------------", function() {

    let a = [];
    let b = {test: "Hello"};

    test_one("Setting taint on b", function() {
       __jalangi_set_taint__(b);
    });

    test_one("b should be tainted", function() {
        __jalangi_assert_taint_true__(b);
    });

    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

    a.push(b);

    test_one("a[0] should be tainted", function() {
        __jalangi_assert_taint_true__(a[0]);
    });

    a.push({test: "World"});

    test_one("a[1] should not be tainted", function(){
       __jalangi_assert_taint_false__(a[1]);
    });

});

