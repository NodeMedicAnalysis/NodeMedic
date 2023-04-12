import { Maybe, F, Literal } from "./Flib";

function isNativeFunction(func: Function) {
    try {
        void new Function(func.toString());
    } catch (e) {
        return true;
    }
    return false;
}

function safePropertyCall(obj: any, prop: Maybe<string>, receiver: Object): any {
    let property = F.maybeThrow(prop);
    const isNative = typeof obj[property] == 'function' && isNativeFunction(obj[property]);
    const toPrimitive = obj[property] && obj[property].name ? ['valueOf', 'toString'].includes(obj[property].name) : false;
    if (isNative && toPrimitive) {
        var f = function(...args) {
            var result = obj[property](...args);
            return result;
        }
        Object.defineProperty(f, 'name',
            {
                value: `__conversion__${property.toString()}`, 
                writable: false
            }
        );
        return f;
    } else {
        if (property == null) {
            return receiver;
        } else {
            return obj[property];
        }
    }
}

interface taintPolicy {
    get: (targetObj: any, property: string | number | symbol | null, receiver: Object) => any,
    // set: (targetObj: any, property: string | number | symbol | null, value: any, receiver: Object) => boolean
    // defineProperty: (targetObj: any, property: string | number | symbol, descriptor: Object) => boolean,
}


const precisePolicy: taintPolicy = {
    "get": function(targetObj: Object, property: string | null, receiver: Object): any {
        var result = safePropertyCall(targetObj, F.nullableToMaybe(property), receiver);
        return result;
    }
};

export type Proxy = Object;

export function SafeProxy(val: Literal): Proxy {
    let policy = precisePolicy;
    var handler = {
        get: function(targetObj: Object, property: string | number | symbol | null, receiver: Object): any {
            return policy["get"](targetObj, property, receiver);
        },
        // set: function(targetObj: Object, property: string | number | symbol | null, value: any, receiver: Object): boolean {
        //     return policy["set"](self, targetObj, property, value, receiver);
        // },
        // defineProperty: function(targetObj: Object, property: string | number | symbol, descriptor: Object): boolean {
        //     return policy["defineProperty"](self, targetObj, property, descriptor);
        // }
    }
    return new Proxy(Object(val), handler);
}
