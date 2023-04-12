import { __jalangi_assert_taint_true__, __jalangi_assert_taint_false__, 
    __jalangi_set_taint__, __jalangi_set_prop_taint__, __jalangi_assert_prop_taint_false__,
    __jalangi_assert_prop_taint_true__} from "../../taint_header";
import {test_suite, test_one, test_assert} from "../../test_header";


test_suite("--------------- Constructors Operations ----------------", function() {

    test_one("inheriting from a constructor with no parameters", function() {
        // https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Inheritance
        // inheriting from a constructor with no parameters
        function Brick() {
            this.width = 10;
        }
        
        function BlueGlassBrick() {
            Brick.call(this);
            this.opacity = 0.5;
        }
        
        var bgb = new BlueGlassBrick();
        test_assert(bgb.width === 10 && bgb.opacity === 0.5);
    });

    test_one("Person inheritance", function() {
        // https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Inheritance
        // Person inheritance
        function Person(first, last, age, gender, interests) {
            this.name = {
              first,
              last
            };
            this.age = age;
            this.gender = gender;
            this.interests = interests;
        };
        
        Person.prototype.greeting = function() {
            return this.name.first;
        };
        
        var o = new Person('a', 'b', 20, 'm', 'Javascript Dynamic Taint Analysis')
        test_assert(o.greeting() === 'a');
    });


    test_one("Teacher inheritance", function() {
        // https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Inheritance
        // Teacher inheritance
        function Person(first, last, age, gender, interests) {
            this.name = {
              first,
              last
            };
            this.age = age;
            this.gender = gender;
            this.interests = interests;
        };
        
        Person.prototype.greeting = function() {
            return this.name.first;
        };
        
        function Teacher(first, last, age, gender, interests, subject) {
            Person.call(this, first, last, age, gender, interests);
          
            this.subject = subject;
        }
        
        Teacher.prototype = Object.create(Person.prototype);
        
        Object.defineProperty(Teacher.prototype, 'constructor', { 
            value: Teacher, 
            enumerable: false, // so that it does not appear in 'for in' loop
            writable: true });
        
        
        var o = new Teacher('a', 'b', 20, 'm', 'Javascript Dynamic Taint Analysis', 'Browser Security')
        test_assert(o.greeting() === 'a');
    });

});



