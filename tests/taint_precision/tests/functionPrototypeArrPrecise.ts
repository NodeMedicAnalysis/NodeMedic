import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one } from "../../test_header";


test_suite("--------------- Function Application via apply ----------------", function() {

    let a = "Hello";
    let b = "World";

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("b should not be tainted", function() {
        __jalangi_assert_taint_false__(b);
    });

    let id = function(x) {
        return x;
    }

    test_one("id.apply(a) should be tainted", function() {
        __jalangi_assert_taint_true__(id.apply(null, [a]));
    });

    test_one("id.apply(b) should not be tainted", function() {
        __jalangi_assert_taint_false__(id.apply(null, [b]));
    });

});
