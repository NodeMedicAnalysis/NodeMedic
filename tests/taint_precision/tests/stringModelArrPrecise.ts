import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__, __assert_string_range_all_tainted__,
    __string_range_set_taint__,
    __assert_string_range_all_untainted__,
    __assert_array_range_all_tainted__,
    __assert_array_range_all_untainted__} from "../../taint_header";
import { test_suite, test_one } from "../../test_header";


test_suite("---------- Testing Array.join() -------- ", function () {
    let a = "Hello, World!";

    test_one("Setting taint on a[0:5]", function() {
       __string_range_set_taint__(a, 0, 5);
    });

    test_one("a[0:5] is tainted", function() {
        __assert_string_range_all_tainted__(a, 0, 5);
    });

    const C1 = "asdf";
    const C2 = "fdsa";
    let b = [a, C1, C2];
    
    test_one("b[0][0:5] is tainted", function() {
        __assert_string_range_all_tainted__(b[0], 0, 5);
    });

    let c = b.join("."); // "Hello, World!.asdf.fdsa"
    const HELLO_STR = "Hello";

    test_one("'Hello' should be tainted", function () {
        __assert_string_range_all_tainted__(c, 0, HELLO_STR.length);
    });

    test_one("The rest of b should not be tainted", function () {
        __assert_string_range_all_untainted__(c, HELLO_STR.length, b.length);
    });

});

test_suite("---------- Testing Precise str.split() --------", function() {

    let a = "Hello, World!";

    test_one("Setting taint on a[0:5]", function() {
        __string_range_set_taint__(a, 0, 5);
    });

    let b = a.split('');

    test_one("a.split('')[0:5] should be tainted", function () {
        __assert_array_range_all_tainted__(b, 0, 5);
    });

    test_one("a.split('')[5:8] should not be tainted", function() {
        __assert_array_range_all_untainted__(b, 5, 8);
    });

    let c = a.split(",");

    test_one("a.split(',')[0] should be tainted", function() {
        // c will be ['Hello', ' World!']
        // All bytes of c[0] should be tainted
        __assert_string_range_all_tainted__(c[0], 0, c[0].length);
    });

    test_one("a.split(',')[1] should not be tainted", function(){
        // No bytes of c[1] should be tainted
        __assert_string_range_all_untainted__(c[1], 0, c[1].length);
    });

    let d = a.split("e");

    test_one("a.split('e')[0] should be tainted", function() {
        // d will be ['H', 'llo, World'];
        // All bytes of d[0] should be tainted
        __assert_string_range_all_tainted__(d[0], 0, d[0].length);
    });

    test_one("a.split('e')[1][0:3] should be tainted", function() {
        // d will be ['H', 'llo, World'];
        // d[1][0:3] should be tainted
        __assert_string_range_all_tainted__(d[1], 0, 3);
    });

    test_one("a.split('e')[1][3:] should not be tainted", function() {
        // d will be ['H', 'llo, World'];
        // d[1][3:] should not be tainted
        __assert_string_range_all_untainted__(d[1], 3, d[1].length)
    });
});
