import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one} from "../../test_header";

test_suite("----------- Object Taint Inheritence -------------", function() {

    var e = Object();
    e.a = 1;

    var r = {
        a: 0,
        b: 0,
    };

    test_one("e should be tainted", function() {
        __jalangi_set_taint__(e);
        __jalangi_assert_taint_true__(e);
    });

    test_one("e.a should be tainted", function() {
        __jalangi_assert_taint_true__(e.a);
    });

    test_one("r should not be tainted", function() {
        r.a = e.a;
        __jalangi_assert_taint_false__(r);
    });

    test_one("r.a should be tainted", function() {
        __jalangi_assert_taint_true__(r.a);
    })
    
});
