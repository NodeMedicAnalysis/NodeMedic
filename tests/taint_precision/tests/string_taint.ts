import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__, __assert_string_range_all_tainted__,
    __string_range_set_taint__,
    __assert_string_range_all_untainted__,
    __assert_array_range_all_tainted__,
    __assert_array_range_all_untainted__} from "../../taint_header";
import { test_suite, test_one } from "../../test_header";


test_suite("---------- String Taint Propagation Test --------", function() {

    let z = "Hello, World!";
    let q = Object();

    q.a = z;

    test_one("q should not be tainted", function() {
        __jalangi_assert_taint_false__(q);
    });

    test_one("Setting taint on z[0:5]", function() {
       __string_range_set_taint__(z, 0, 5);
    });

    test_one("z[0:5] should be tainted", function() {
       __assert_string_range_all_tainted__(z, 0, 5);
    });

    test_one("q.a[0:5] should be tainted", function() {
        __assert_string_range_all_tainted__(q.a, 0, 5);
    });

});


test_suite("---------- Testing str.indexOf() --------", function() {
    // Policy: Since we are not doing implicit tainting, the index will
    // not be tainted.
    let a = "Hello, World!";

    test_one("Setting taint on a[0:5]", function() {
       __string_range_set_taint__(a, 0, 5);
    });

    let b = a.indexOf("e");
    let c = a.indexOf("e", 2);

    test_one("a.indexOf('e') should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    test_one("a.indexOf('e', 2) should not be tainted", function() {
        __jalangi_assert_taint_false__(c);
    });

});

test_suite("---------- Testing str.slice()--------", function() {

    let a = "Hello, World!";

    test_one("Setting taint on a[0:5]", function() {
       __string_range_set_taint__(a, 0, 5);
    });

    let b = a.slice(0, 5);

    test_one("a.slice(0, 5) should be tainted", function () {
        __assert_string_range_all_tainted__(b, 0, 5);
    });

    test_one("Entire slice should be tainted", function() {
        __jalangi_assert_taint_true__(b);
    });

    let c = a.slice(5, 8);

    test_one("a.slice(5, 8) should not be tainted", function () {
        __assert_string_range_all_untainted__(c, 0, c.length);
    });

    test_one("Entire slice should not be tainted", function() {
        __jalangi_assert_taint_false__(c);
    });

});

test_suite("---------- Testing str.toLowerCase() --------", function() {
    let a = "Hello, World!";

    test_one("Setting taint on a[0:5]", function() {
       __string_range_set_taint__(a, 0, 5);
    });

    let b = a.toLowerCase();

    test_one("a.toLowerCase[0:5] should be tainted", function () {
        __assert_string_range_all_tainted__(b, 0, 5);
    });

    test_one("a.toLowerCase[5:8] should not be tainted", function() {
        __assert_string_range_all_untainted__(b, 5, 8);
    });

});

test_suite("---------- Testing str.blink() --------", function() {
    let a = "Hello, World!";

    test_one("Setting taint on a[0:5]", function() {
       __string_range_set_taint__(a, 0, 5);
    });

    let b = a.blink();
    const BLINK_BEGIN = "<blink>";
    const HELLO_STR = "Hello";

    test_one("'<blink>' in a.blink() should not be tainted", function() {
        // <blink>Hello World</blink> should only be tainted on the tainted
        // characters of 'Hello' (HELLO_STR)
        __assert_string_range_all_untainted__(b, 0, BLINK_BEGIN.length);
    });

    test_one("'Hello' in a.blink() should be tainted", function() {
        __assert_string_range_all_tainted__(b, BLINK_BEGIN.length, BLINK_BEGIN.length + HELLO_STR.length);
    });

    test_one("The rest of a.blink() should not be tainted", function() {
        __assert_string_range_all_untainted__(b, BLINK_BEGIN.length + HELLO_STR.length, b.length);
    });

});

test_suite("---------- Testing str.concat() --------", function() {

    let a = "Hello, World!";

    test_one("Setting taint on a[0:5]", function() {
        __string_range_set_taint__(a, 0, 5);
    });

    const C1 = "asdf";
    const C2 = "fdsa";
    let b = a.concat(C1, C2);
    const HELLO_STR = "Hello";

    test_one("'Hello,' should be tainted", function () {
        __assert_string_range_all_tainted__(b, 0, HELLO_STR.length);
    });

    test_one("The rest of a.concat(C1, C2) should not be tainted", function () {
        __assert_string_range_all_untainted__(b, HELLO_STR.length, b.length);
    });

});

test_suite("---------- Testing Array.join() -------- ", function () {
    let a = ["Hello, World!", "asdf", "fdsa"];

    test_one("Setting taint on a", function() {
       __jalangi_set_taint__(a);
    });

    test_one("a is tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    let b = a.join("."); // "Hello, World!.asdf.fdsa"

    test_one("b should be tainted", function () {
        __jalangi_assert_taint_true__(b);
    });

});

test_suite("---------- Testing Imprecise str.split() --------", function() {

    let a = "Hello, World!";

    test_one("Setting taint on a[0:5]", function() {
        __string_range_set_taint__(a, 0, 5);
    });

    let b = a.split('');

    test_one("a.split('') should be tainted", function() {
        __jalangi_assert_taint_true__(b);
    });

    let c = a.split(',');

    test_one("a.split(',') should be tainted", function() {
        __jalangi_assert_taint_true__(c);
    });

});

test_suite("---------- Testing str.substring() -------- ", function () {
    let a = "Hello, World!";

    test_one("Setting taint on a[0:5]", function() {
       __string_range_set_taint__(a, 0, 5);
    });

    let b = a.substring(3,6); // "lo,"
    let tainted = "lo";

    test_one("'lo' should be tainted", function () {
        __assert_string_range_all_tainted__(b, 0, tainted.length);
    })

    test_one("The rest of b should not be tainted", function () {
        __assert_string_range_all_untainted__(b, tainted.length, b.length);
    });
    
});

test_suite("---------- Testing str.toUpperCase() -------- ", function () {
    let a = "Hello, World!";

    test_one("Setting taint on a[0:5]", function() {
       __string_range_set_taint__(a, 0, 5);
    });

    let b = a.toUpperCase();
    const HELLO_STR = "Hello";

    test_one("'Hello' should be tainted", function () {
        __assert_string_range_all_tainted__(b, 0, HELLO_STR.length);
    });

    test_one("The rest of b should not be tainted", function () {
        __assert_string_range_all_untainted__(b, HELLO_STR.length, b.length);
    });
    
});

test_suite("---------- Testing str.charCodeAt() -------- ", function () {
    let a = "Hello, World!";

    test_one("Setting taint on a[0:5]", function() {
       __string_range_set_taint__(a, 0, 5);
    });

    let b = a.charCodeAt(2); // 108
    let c = a.charCodeAt(6); // 32

    test_one("a.charCodeAt() should be tainted here", function() {
        __jalangi_assert_taint_true__(b);
    });

    test_one("a.charCodeAt() should not be tainted here", function() {
        __jalangi_assert_taint_false__(c);
    });
    
});

test_suite("---------- Testing str.codePointAt() -------- ", function () {
    let a = "Hello, World!";

    test_one("Setting taint on a[0:5]", function() {
       __string_range_set_taint__(a, 0, 5);
    });

    let b = a.codePointAt(2); // 108
    let c = a.codePointAt(6); // 32

    test_one("a.codePointAt() should be tainted here", function() {
        __jalangi_assert_taint_true__(b);
    });

    test_one("a.codePointAt() should not be tainted here", function() {
        __jalangi_assert_taint_false__(c);
    });
    
});
