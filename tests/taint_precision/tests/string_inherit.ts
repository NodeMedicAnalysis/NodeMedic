import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";

test_suite("---------- String Taint Inheritence --------------", function() {
    
    var z = "Hello, World!";
    var w = Object();

    test_one("z should not be tainted", function() {
        __jalangi_assert_taint_false__(z);
    });

    test_one("w should not be tainted", function() {
        __jalangi_assert_taint_false__(w);
    });

    test_one("z should be tainted", function() {
        __jalangi_set_taint__(z);
        __jalangi_assert_taint_true__(z);
    });

    test_one("z[1] should be tainted", function() {
        __jalangi_assert_taint_true__(z[1]);
    });

    test_one("w.a should be tainted", function() {
        w.a = z[1];
        __jalangi_assert_taint_true__(w.a);
    });

});
