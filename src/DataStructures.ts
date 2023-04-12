import { List } from "immutable";
import { Maybe, F } from "./Flib";


export class Stack<A> {
    l: List<A>;
    constructor(l: Maybe<List<A>>) {
        let self = this;
        F.matchMaybe(l, {
            Just: (x: List<A>) => {
                self.l = x;
            },
            Nothing: () => {
                self.l = List();
            }
        });
    }
    push(val: A): Stack<A> {
        return new Stack(F.Just(this.l.push(val)));
    }
    // get the top of the stack
    head(): Maybe<A> {
        return this.l.size > 0 ? F.Just(this.l.last())
                               : F.Nothing();
    }
    // gets the rest of the stack, minus the head
    tail(): Stack<A> {
        return new Stack(F.Just(this.l.pop()));
    }
    // gets the latest element pushed on the stack
    pop(): [Stack<A>, Maybe<A>] {
        return [this.tail(), this.head()];
    }
    // The length
    length(): number {
        return this.l.size;
    }
}


export class SafeMap<A, B> {
    m: Map<A, B>;
    constructor(m: Maybe<Map<A, B>>) {
        let self = this;
        F.matchMaybe(m, {
            Just: (m) => {
                self.m = m;
            },
            Nothing: () => {
                self.m = new Map();
            },
        });
    }
    get(key: A): Maybe<B> {
        if (!this.has_key(key)) {
            return F.Nothing();
        } else {
            return F.Just(this.m.get(key));
        }
    }
    set(key: A, value: B): SafeMap<A, B> {
        return new SafeMap(F.Just(this.m.set(key, value)));
    }
    delete(key: A): SafeMap<A, B> {
        // TODO: This is currently in place
        this.m.delete(key);
        return new SafeMap(F.Just(this.m));
    }
    forEach(func: (value: B, key: A, map: Map<A, B>) => void): void {
        this.m.forEach(function(value, key, map) {
            func(value, key, map);
        });
    }
    keys(): A[] {
        let keyList: A[] = [];
        this.forEach((value, key: A, map) => {
            keyList.push(key);
        });
        return keyList;
    }
    has_key(key: A): Boolean {
        return this.m.has(key);
    }
    size(): Number {
        return this.m.size;
    }
}
