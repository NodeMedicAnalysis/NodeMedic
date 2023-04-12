import {test_suite, test_one} from "../../test_header";



test_suite("-------------- toString (1) ----------------", function() {

    let x = {
        toString: function() { return 'hello'; },
    };

    let arr = [x, 't'];

    test_one("Joining the array should work", function() {
        let r = arr.join(',');
    });

});


test_suite("-------------- toString (2) ----------------", function() {

    function test(x) {
        if (typeof x != 'string') {
            throw Error('Expected x to be a string');
        }
        return x;
    }

    let x = {
        toString: function() { return test('hello'); },
    };

    let arr = [x, 't'];

    test_one("Joining the array should work", function() {
        let r = arr.join(',');
    });

});


test_suite("-------------- toString (3) ----------------", function() {
    
    let y = {
        toString: function() { return 'hello'; },
    };

    test_one("Binary op on y + str should work", function () {
        let r2 = y + ', world';
    });

});


test_suite("-------------- toString (4) ----------------", function() {

    var y = {
        toString: function() { throw Error('Hello') },
    };

    test_one("The error should be raised and caught", function() {
        try {
            let r2 = y + ', world';
        } catch (err) {
            let r2 = 'Hello, world';
        } finally {
            let r2 = 'Hello, world!';
        }
    });

});
