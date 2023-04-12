import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__, __jalangi_assert_wrapped__} from "../../taint_header";
import {test_suite, test_one, test_assert} from "../../test_header";

test_suite("--------------- Unary Operations ----------------", function() {
    var a = 1;
    var b = 2;

    var c;

    // sanity check
    test_one("a should be tainted", function() {
        __jalangi_set_taint__(a);
        __jalangi_assert_taint_true__(a);
    });

    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    test_one("c should not be tainted", function() {
        __jalangi_assert_taint_false__(c);
    });

    // + operator
    test_one("c in c = +b should not be tainted", function() {
        c = +b;
        __jalangi_assert_taint_false__(c);
    });

    test_one("c in c = +a should be tainted", function() {
        c = +a;
        __jalangi_assert_taint_true__(c);
    });

    // - operator
    test_one("c in c = -b should not be tainted", function() {
        c = -b;
        __jalangi_assert_taint_false__(c);
    });


    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("c in c = -a should be tainted", function() {
        c = -a;
        __jalangi_assert_taint_true__(c);
    });

    // bitwise not (~)
    test_one("c in c = ~b should not be tainted", function() {
        c = ~b;
        __jalangi_assert_taint_false__(c);
    });

    test_one("c in c = ~a should be tainted", function() {
        c = ~a;
        __jalangi_assert_taint_true__(c);
    });

    var d = true;
    var e = false;

    test_one("d should not be tainted", function() {
        __jalangi_assert_taint_false__(d);
    });

    test_one("e should not be tainted", function() {
        __jalangi_assert_taint_false__(e);
    });

    test_one("d should be tainted", function() {
        __jalangi_set_taint__(d);
        __jalangi_assert_taint_true__(d);
    });

    // logical not (!)
    test_one("c in c = !e should not be tainted", function() {
        c = !e;
        __jalangi_assert_taint_false__(c);
    });

    test_one("c in c = !d should be tainted", function() {
        c = !d;
        __jalangi_assert_taint_true__(c);
    });


    // typeof operator
    test_one("c in c = typeof e should not be tainted", function() {
        c = typeof e;
        __jalangi_assert_taint_false__(c);
    });
 
    test_one("c in c = typeof d should be tainted", function() {
        c = typeof d;
        __jalangi_assert_taint_true__(c);
    });

    // void operator
    test_one("c in c = void e should not be tainted", function() {
        c = void e;
        __jalangi_assert_taint_false__(c);
    });

    test_one("c in c = void d should not be tainted", function() {
        // NOTE: even if d was tainted, c should not be tainted since regardless of the value of d,
        // c will be set to undefined. This seems to be translated to a direct assignment to 
        // undefined, so we are good.
        c = void d;
        __jalangi_assert_taint_false__(c);
    });

    var g = {'lol': 'nope'}

    test_one("g should be tainted", function() {
        __jalangi_set_taint__(g);
        __jalangi_assert_taint_true__(g);
    });

    test_one("g.lol should be tainted", function() {
        __jalangi_assert_taint_true__(g.lol);
    });

    test_one("g should be tainted after delete", function() {
        delete g.lol;
        __jalangi_assert_taint_true__(g);
    });

    test_one("g should not have g.lol", function() {
        test_assert(g.lol === undefined);
    });
});