import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";
let assert = require('assert')

// using notes from 
// https://www.ecma-international.org/ecma-262/#sec-equality-operators-runtime-semantics-evaluation
test_suite("--------------- Equality Operations Correctness ----------------", function() {
    let a = {};
    let b = {};
    test_one("NOTE 1a: coerce string comparison", function() { 
        assert(""+a == ""+b)
    });

    test_one("NOTE 1b: coerce string comparison", function() {
        assert(a != b)
    });

    test_one("NOTE 1c: coerce string comparison", function() {
        assert(a !== b)
    });

    a = "1"
    b = "01"

    test_one("NOTE 1d: coerce Numeric comparison", function() { 
        assert(+a == +b)
    });

    test_one("NOTE 1e: coerce Numeric comparison", function() {
        assert(a != b)
    });

    test_one("NOTE 1f: coerce Numeric comparison", function() {
        assert(a !== b)
    });

    a = "true"
    b = 1

    test_one("NOTE 1d: coerce boolean comparison", function() { 
        assert(!a == !b)
    });

    test_one("NOTE 1e: coerce boolean comparison", function() {
        assert(a != b)
    });

    test_one("NOTE 1f: coerce boolean comparison", function() {
        assert(a !== b)
    });


    a = "hello";
    b = "hello";
    let c = "bye";
    let d = "bye2";
    
    test_one("NOTE 2a: De Morgan's and Symmetric", function() {    
        assert((a != b) === !(a == b));
    });

    test_one("NOTE 2b: De Morgan's and Symmetric", function() {    
        assert((c != d) === !(c == d));
    });


    test_one("NOTE 2c: De Morgan's and Symmetric", function() {    
        assert((a == b) === (b == a));
    });


    test_one("NOTE 2d: De Morgan's and Symmetric", function() {    
        assert((c == d) === (d == c));
    });


    test_one("NOTE 3a: Transitivity (and the lack of)", function() {    
        assert(new String("a") == "a");
    });

    test_one("NOTE 3b: Transitivity (and the lack of)", function() {    
        assert("a" == new String("a") );
    });

    test_one("NOTE 3c: Transitivity (and the lack of)", function() {   
        assert((new String("a") == new String("a")) === false);
    });
});