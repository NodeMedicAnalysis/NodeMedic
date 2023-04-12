import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__,
    __jalangi_set_taint__, __jalangi_clear_taint__ } from "../../taint_header";
import {test_suite, test_one, test_one_should_fail} from "../../test_header";

test_suite("------------- Clearing Taint -----------", function() {

    var a = "Test";

    test_one("Setting taint on a", function() {
       __jalangi_set_taint__(a);
    });

    test_one("a should be tainted", function() {
        __jalangi_assert_taint_true__(a);
    });

    test_one("Clearing taint on a", function() {
        __jalangi_clear_taint__(a);
    });

    test_one("a should not be tainted", function() {
       __jalangi_assert_taint_false__(a);
    });

});
