import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__, __assert_string_range_all_tainted__,
    __string_range_set_taint__, __assert_string_range_all_untainted__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";


test_suite("--------------- Reduce Tests ----------------", function() {
    let AAA = "aaa";
    let BBB = "bbb";
    let CCC = "ccc";

    test_one("Set Taint on all characters of AAA", function() { 
        __string_range_set_taint__(AAA, 0, AAA.length);
    });

    test_one("All characters of AAA should be tainted", function() {
        __assert_string_range_all_tainted__(AAA, 0, AAA.length); 
    });
    
    test_one("Set Taint on all characters of CCC", function() { 
        __string_range_set_taint__(CCC, 0, CCC.length);
    });

    test_one("No characters of BBB should be tainted", function() {
        __assert_string_range_all_untainted__(BBB, 0, BBB.length); 
    });

    test_one("All characters of CCC should be tainted", function() {
        __assert_string_range_all_tainted__(CCC, 0, CCC.length); 
    });

    let a = [AAA, BBB, CCC];

    // IDENTITY TESTS:
    // Because the end object is identical to the start object, it has the same id
    // and should pass successfully, even without the reduce policy.
    let cb_identity = (acc, cur, idx, arr) => (arr);
    let a_identity = a.reduce(cb_identity);

    test_one("a_identity[0] should still be tainted", function() {
        __assert_string_range_all_tainted__(a_identity[0], 0, a_identity[0].length); 
    });

    test_one("a_identity[1] should still not be tainted", function() {
        __assert_string_range_all_untainted__(a_identity[1], 0, a_identity[1].length); 
    });

    test_one("a_identity[2] should still be tainted", function() {
        __assert_string_range_all_tainted__(a_identity[2], 0, a_identity[2].length); 
    });

    // Accumulate with a non-native callback
    let cb_accumulate = (acc, cur, idx, arr) => acc + arr[idx];
    let a_accumulate = a.reduce(cb_accumulate);

    test_one("a_accumulate[0:AAA.length] should be tainted", function() {
        __assert_string_range_all_tainted__(a_accumulate, 0, AAA.length);
    });

    let offset = AAA.length;
    test_one("a_accumulate[AAA.length:AAA.length+BBB.length] should not be tainted", function() {
        __assert_string_range_all_untainted__(a_accumulate, offset, offset+BBB.length);
    });

    offset += BBB.length;
    test_one("a_accumulate[AAA.length+BBB.length:] should be tainted", function() {
        __assert_string_range_all_tainted__(a_accumulate, offset, offset+CCC.length);
    });

    // Acculumate with a native callback
    let cb_native = (acc, cur, idx, arr) => acc.concat(arr[idx]);
    let a_native = a.reduce(cb_native);

    test_one("a_native[0:AAA.length] should be tainted", function() {
        __assert_string_range_all_tainted__(a_native, 0, AAA.length);
    });

    offset = AAA.length;
    test_one("a_native[AAA.length:AAA.length+BBB.length] should not be tainted", function() {
        __assert_string_range_all_untainted__(a_native, offset, offset+BBB.length);
    });

    offset += BBB.length;
    test_one("a_native[AAA.length+BBB.length:] should be tainted", function() {
        __assert_string_range_all_tainted__(a_native, offset, offset+CCC.length);
    });
    
    // Accumulate with an external callback
    let cb_external = require('./callback_external').external_callback_reduce;
    let a_external = a.reduce(cb_external);

    test_one("a_external[0:AAA.length] should be tainted", function() {
        __assert_string_range_all_tainted__(a_external, 0, AAA.length);
    });
});

test_suite("--------------- Map Tests (objects) ----------------", function() {
    let a = {test: 'Hello'};

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("a.test should be tainted", function() {
        __jalangi_assert_taint_true__(a.test);
    });

    let b = {test: 'World'};

    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    test_one("b.test should not be tainted", function() {
        __jalangi_assert_taint_false__(b.test);
    });

    let c = [a, b];

    test_one("c[0] should be tainted", function() {
        __jalangi_assert_taint_true__(c[0]);
    });

    test_one("c[1] should not be tainted", function() {
        __jalangi_assert_taint_false__(c[1]);
    });

    // Identity callback
    let d = c.map((x) => x);

    test_one("d[0] should be tainted", function() {
        __jalangi_assert_taint_true__(d[0]);
    });

    test_one("d[1] should not be tainted", function() {
        __jalangi_assert_taint_false__(d[1]);
    });

    // Property access
    let e = c.map((x) => x.test);

    test_one("e[0] should be tainted", function() {
        __jalangi_assert_taint_true__(e[0]);
    });

    test_one("e[1] should not be tainted", function() {
        __jalangi_assert_taint_false__(e[1]);
    });

    // Native method
    let f = c.map((x) => x.toString());

    test_one("f[0] should be tainted", function() {
        __jalangi_assert_taint_true__(f[0]);
    });

    test_one("f[1] should not be tainted", function() {
        __jalangi_assert_taint_false__(f[1]);
    });

    // Native function
    let g = c.map((x) => Object.isFrozen(x));

    test_one("g[0] should be tainted", function() {
        __jalangi_assert_taint_true__(g[0]);
    });

    test_one("g[1] should not be tainted", function() {
        __jalangi_assert_taint_false__(g[1]);
    });
});

test_suite("--------------- Map Tests (primitive) 1 ----------------", function() {
    let a = "Hello";

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("All bytes of a should be tainted", function() {
        __assert_string_range_all_tainted__(a, 0, a.length);
    });

    let b = "World"

    test_one("All bytes of b should not be tainted", function() {
        __assert_string_range_all_untainted__(b, 0, b.length);
    });

    let c = [a, b];

    test_one("All bytes of c[0] should be tainted", function() {
        __assert_string_range_all_tainted__(c[0], 0, c[0].length);
    });

    test_one("All bytes of c[1] should not be tainted", function() {
        __assert_string_range_all_untainted__(c[1], 0, c[1].length);
    });

    // Identity callback
    let d = c.map((x) => x);

    test_one("All bytes of d[0] should be tainted", function() {
        __assert_string_range_all_tainted__(d[0], 0, d[0].length);
    });

    test_one("All bytes of d[1] should not be tainted", function() {
        __assert_string_range_all_untainted__(d[1], 0, d[1].length);
    });

    // Property access
    let e = c.map((x) => x.length);

    test_one("e[0] should be tainted", function() {
        __jalangi_assert_taint_true__(e[0]);
    });

    test_one("e[1] should not be tainted", function() {
        __jalangi_assert_taint_false__(e[1]);
    });

    // Native method
    let f = c.map((x) => x.substr(0, 2));

    test_one("All bytes of f[0] should be tainted", function() {
        __assert_string_range_all_tainted__(f[0], 0, f[0].length);
    });

    test_one("All bytes of f[1] should not be tainted", function() {
        __assert_string_range_all_untainted__(f[1], 0, f[1].length);
    });
});

test_suite("--------------- Map Tests (primitive) 2 ----------------", function() {
    let a = "Hello";

    test_one("Setting taint on a[0:2]", function() {
        __string_range_set_taint__(a, 0, 2);
    });

    test_one("a[0:2] should be tainted", function() {
        __assert_string_range_all_tainted__(a, 0, 2);
    });

    test_one("a[2:] should not be tainted", function() {
        __assert_string_range_all_untainted__(a, 2, a.length);
    });

    let b = "World"

    test_one("All bytes of b should not be tainted", function() {
        __assert_string_range_all_untainted__(b, 0, b.length);
    });

    let c = [a, b];

    test_one("c[0][0:2] should be tainted", function() {
        __assert_string_range_all_tainted__(c[0], 0, 2);
    });

    test_one("c[0][2:] should not be tainted", function() {
        __assert_string_range_all_untainted__(c[0], 2, c[0].length);
    });

    test_one("All bytes of c[1] should not be tainted", function() {
        __assert_string_range_all_untainted__(c[1], 0, c[1].length);
    });

    // Identity callback
    let d = c.map((x) => x);

    test_one("d[0][0:2] should be tainted", function() {
        __assert_string_range_all_tainted__(d[0], 0, 2);
    });

    test_one("d[0][2:] should not be tainted", function() {
        __assert_string_range_all_untainted__(d[0], 2, d[0].length);
    });

    test_one("All bytes of d[1] should not be tainted", function() {
        __assert_string_range_all_untainted__(d[1], 0, d[1].length);
    });

    // Property access
    let e = c.map((x) => x.length);

    test_one("e[0] should be tainted", function() {
        __jalangi_assert_taint_true__(e[0]);
    });

    test_one("e[1] should not be tainted", function() {
        __jalangi_assert_taint_false__(e[1]);
    });

    // Native method
    let f = c.map((x) => x.substr(0, 3));

    test_one("f[0][0:2] should be tainted", function() {
        __assert_string_range_all_tainted__(f[0], 0, 2);
    });

    test_one("f[0][2:] should not be tainted", function() {
        __assert_string_range_all_untainted__(f[0], 2, f[0].length);
    });

    test_one("All bytes of f[1] should not be tainted", function() {
        __assert_string_range_all_untainted__(f[1], 0, f[1].length);
    });
});

test_suite("--------------- Map Tests (primitive) 3 ----------------", function() {
    let a = 65;

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    let b = 66;
    
    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    let c = [a, b];

    test_one("c[0] should be tainted", function() {
        __jalangi_assert_taint_true__(c[0]);
    });

    test_one("c[1] should be not tainted", function() {
        __jalangi_assert_taint_false__(c[1]);
    });

    // Native function on a primitive
    let d = c.map((x) => String.fromCharCode(x));

    test_one("d[0] should be tainted", function() {
        __jalangi_assert_taint_true__(d[0]);
    });

    test_one("d[1] should not be tainted", function() {
        __jalangi_assert_taint_false__(d[1]);
    });
});

test_suite("--------------- Map Tests (primitive) 4 ----------------", function() {
    var external_callback = require('./callback_external').external_callback;

    let a = '1';

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    let b = '2';
    
    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    let c = [a, b];

    test_one("c[0] should be tainted", function() {
        __jalangi_assert_taint_true__(c[0]);
    });

    test_one("c[1] should be not tainted", function() {
        __jalangi_assert_taint_false__(c[1]);
    });

    // External function
    let d = c.map(external_callback);

    test_one("d[0] should be tainted", function() {
        __jalangi_assert_taint_true__(d[0]);
    });

    test_one("d[1] should not be tainted", function() {
        __jalangi_assert_taint_false__(d[1]);
    });
});

test_suite("--------------- Map Tests (primitive) 5 ----------------", function() {
    let a = '1';

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    let b = '2';
    
    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    let c = [a, b];

    test_one("c[0] should be tainted", function() {
        __jalangi_assert_taint_true__(c[0]);
    });

    test_one("c[1] should be not tainted", function() {
        __jalangi_assert_taint_false__(c[1]);
    });

    // Native function without harness
    let d = c.map(Number.parseInt);

    test_one("d[0] should be tainted", function() {
        __jalangi_assert_taint_true__(d[0]);
    });

    test_one("d[1] should not be tainted", function() {
        __jalangi_assert_taint_false__(d[1]);
    });
});
