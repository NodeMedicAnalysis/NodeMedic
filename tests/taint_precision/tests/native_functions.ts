import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import { test_suite, test_one } from "../../test_header";


test_suite("---------- parseInt --------", function() {
    let a = '2';

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    let b = parseInt(a);

    test_one("parseInt(a) should be tainted", function () {
        __jalangi_assert_taint_true__(b);
    });
});

test_suite("---------- parseFloat --------", function() {
    let a = '2.3';

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    let b = parseFloat(a);

    test_one("parseFloat(a) should be tainted", function () {
        __jalangi_assert_taint_true__(b);
    });
});

test_suite("---------- isFinite --------", function() {
    let a = 2;

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    let b = isFinite(a);

    test_one("isFinite(a) should be tainted", function () {
        __jalangi_assert_taint_true__(b);
    });
});

test_suite("---------- isNaN --------", function() {
    let a = 2;

    test_one("Setting taint on a", function() {
        __jalangi_set_taint__(a);
    });

    let b = isNaN(a);

    test_one("isNaN(a) should be tainted", function () {
        __jalangi_assert_taint_true__(b);
    });
});
