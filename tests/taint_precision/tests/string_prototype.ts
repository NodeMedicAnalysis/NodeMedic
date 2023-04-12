import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__,
    __assert_string_range_all_untainted__,
    __assert_string_range_all_tainted__} from "../../taint_header";
import {test_suite, test_one, test_one_should_fail} from "../../test_header";


test_suite("------------- String.prototype.concat -----------", function() {
    
    let a = "Hello, ";
    let b = "World!";

    test_one("Setting taint on a ", function() {
        __jalangi_set_taint__(a);
    });

    let c = String.prototype.concat(a, b);

    // This should fail if the precise policy is in use
    test_one_should_fail("c in c = a + b should be tainted", function() {
        __jalangi_assert_taint_true__(c);
    });

});

test_suite("------------- String.prototype.concat (Precise, left) -----------", function() {
    
    let a = "Hello, ";
    let b = "World!";

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    let c = String.prototype.concat(a, b);

    test_one("c in c = a + b should not be tainted", function() {
        __jalangi_assert_taint_false__(c);
    });

    test_one("c[0:a.length] in c = a + b should be tainted", function() {
        __assert_string_range_all_tainted__(c, 0, a.length);
    });

    test_one("c[a.length:c.length] in c = a + b should not be tainted", function() {
        __assert_string_range_all_untainted__(c, a.length, c.length);
    });

});

test_suite("------------- String.prototype.concat (Precise, right) -----------", function() {

    let a = "Hello, ";
    let b = "World!";

    test_one("Setting taint on b", function() {
        __jalangi_set_taint__(b);
    });

    let c = String.prototype.concat(a, b);

    test_one("c in c = a + b should not be tainted", function() {
        __jalangi_assert_taint_false__(c);
    });

    test_one("c[0:a.length] in c = a + b should not be tainted", function() {
        __assert_string_range_all_untainted__(c, 0, a.length);
    });

    test_one("c[a.length:c.length] in c = a + b should be tainted", function() {
        __assert_string_range_all_tainted__(c, a.length, c.length);
    });

});