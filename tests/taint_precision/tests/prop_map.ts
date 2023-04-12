import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one, test_one_should_fail} from "../../test_header";


test_suite("----------------- Prop Map Tests (1) -------------------", function() {

    var a = "Hello";

    test_one("Setting taint on a[0]", function() {
        __jalangi_set_taint__(a[0]);
    });

    // Setting taint directly on string characters should not work
    // use __jalangi_set_prop_taint__
    test_one_should_fail("a[0] should be tainted", function() {
        __jalangi_assert_taint_true__(a[0]);
    })

    var b = "Hello";

    test_one("Setting taint on b, 0", function() {
        __jalangi_set_prop_taint__(b, 0);
    });

    test_one("b[0] should be tainted", function() {
        __jalangi_assert_taint_true__(b[0]);
    });

    var c = "Hello";

    test_one("Setting taint on c[0]", function() {
        __jalangi_set_taint__(c[0]);
    })

    test_one_should_fail("c[0] should be tainted", function() {
        __jalangi_assert_prop_taint_true__(c, 0);
    });

    var d = "Hello";

    test_one("Setting taint on d[0]", function() {
        __jalangi_set_prop_taint__(d, 0);
    });

    test_one("d[0] should be tainted", function() {
        __jalangi_assert_prop_taint_true__(d, 0);
    });

});

test_suite("----------------- Prop Map Tests (2) -------------------", function() {

    var a = {
        b: "Hello",
        c: "World",
    };

    test_one("Setting taint on a.b[0]", function() {
        __jalangi_set_taint__(a.b[0]);
    });

    test_one_should_fail("a.b[0] should be tainted", function() {
        __jalangi_assert_taint_true__(a.b[0]);
    });

    var b = {
        b: "Hello",
        c: "World",
    };

    test_one("Setting taint on b.b, 0", function() {
        __jalangi_set_prop_taint__(b.b, 0);
    });

    test_one("b.b[0] should be tainted", function() {
        __jalangi_assert_taint_true__(b.b[0]);
    });

    var c = {
        b: "Hello",
        c: "World",
    };

    test_one("Setting taint on c.b[0]", function() {
        __jalangi_set_taint__(c.b[0]);
    });

    test_one_should_fail("c.b[0] should be tainted", function() {
        __jalangi_assert_prop_taint_true__(c.b, 0);
    });

    var d = {
        b: "Hello",
        c: "World",
    };

    test_one("Setting taint on d.b", function() {
        __jalangi_set_prop_taint__(d.b, 0);
    });

    test_one("d.b[0] should be tainted", function() {
        __jalangi_assert_prop_taint_true__(d.b, 0);
    });

});

test_suite("----------------- Prop Map Tests (3) -------------------", function() {

    var a = {
        b: "Hello",
        c: "World",
    };

    test_one("Setting taint on a.b", function() {
        __jalangi_set_taint__(a.b);
    });

    test_one("a.b should be tainted", function() {
        __jalangi_assert_taint_true__(a.b);
    });

    var b = {
        b: "Hello",
        c: "World",
    };

    // Cannot set prop taint on non-strings
    test_one_should_fail("Setting taint on b, 'b'", function() {
        __jalangi_set_prop_taint__(b, 'b');
    });

    test_one_should_fail("b.b should be tainted", function() {
        __jalangi_assert_taint_true__(b.b);
    });

    var c = {
        b: "Hello",
        c: "World",
    };

    test_one("Setting taint on c.b", function() {
        __jalangi_set_taint__(c.b);
    });

    test_one_should_fail("c.b should be tainted", function() {
        __jalangi_assert_prop_taint_true__(c, 'b');
    });

    var d = {
        b: "Hello",
        c: "World",
    };

    test_one_should_fail("Setting taint on d, 'b'", function() {
        __jalangi_set_prop_taint__(d, 'b');
    });

    test_one_should_fail("d.b should be tainted", function() {
        __jalangi_assert_prop_taint_true__(d, 'b');
    });

});

test_suite("----------------- Prop Map Tests (4) -------------------", function() {

    var a = {
        b: "Hello",
        c: "World",
    };

    test_one("Setting taint on a.b", function() {
        __jalangi_set_taint__(a.b);
    });

    test_one("a.b should be tainted", function() {
        __jalangi_assert_taint_true__(a.b);
    });

    Object.defineProperty(a, 'd', {value: 'Test'});

    test_one("a.d should not be tainted", function() {
        __jalangi_assert_taint_false__(a['d']);
    });

    test_one("Setting taint on a['d']", function() {
        __jalangi_set_taint__(a['d']);
    });

    test_one("a.d should be tainted", function() {
        __jalangi_assert_taint_true__(a['d']);
    });

});

test_suite("----------------- Prop Map Tests (5) -------------------", function() {

    var a = {
        b: "Hello",
    };

    test_one("Setting taint on a.b", function() {
        __jalangi_set_taint__(a.b);
    });

    test_one("a.b should be tainted", function() {
        __jalangi_assert_taint_true__(a.b);
    });

    // If every property of an object is tainted then the object
    // itself is tainted
    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    Object.defineProperty(a, 'd', {value: 'Test'});

    test_one("a.d should not be tainted", function() {
        __jalangi_assert_taint_false__(a['d']);
    });

    test_one("a should not be tainted", function() {
        __jalangi_assert_taint_false__(a);
    });

});
