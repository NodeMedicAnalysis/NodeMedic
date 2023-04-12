import { ObjectPolicy, ObjectPolicyImprecise } from "./Object";
import { ListPolicyPrecise, ListPolicyImprecise } from "./List";
import { F, Maybe } from "../Flib";
import { modulePolicy } from "./PolicyInterface";
import { StringPolicyPrecise } from "./String";
import { GlobalPolicy } from "./Global";
import { BaseContext, BaseContextSingleton } from "./BaseContext";
import { isEvalCtx, EvalContextSingleton } from "./Eval";
import { SafeMap } from "../DataStructures";
import { IM, ImportedModule } from "./ImportedModule";
import { LodashPolicy } from "./Lodash";
import { MapPolicyImprecise, MapPolicyPrecise } from "./Map";
import { SetPolicyImprecise, SetPolicyPrecise } from "./Set";


export let policyPrecisionMap: SafeMap<string, string> = new SafeMap<string, string>(F.Nothing());

const policyMap = {
    'array': {
        'imprecise': ListPolicyImprecise,
        'precise': ListPolicyPrecise,
        'default': ListPolicyImprecise,
    },
    'string': {
        'imprecise': ObjectPolicy,
        'precise': StringPolicyPrecise,
        'default': ObjectPolicy,
    },
    'global': {
        'default': GlobalPolicy,
    },
    'lodash': {
        'imprecise': LodashPolicy,
    },
    'map': {
        'default': MapPolicyPrecise,
        'imprecise': MapPolicyImprecise,
        'precise': MapPolicyPrecise,
    },
    'set': {
        'default': SetPolicyPrecise,
        'imprecise': SetPolicyImprecise,
        'precise': SetPolicyPrecise,
    },
    'object': {
        'default': ObjectPolicyImprecise,
        'imprecise': ObjectPolicyImprecise,
        'precise': ObjectPolicy,
    }
}

function policyMapGet(policyMap, moduleName: string): Maybe<modulePolicy> {
    if (policyMap.hasOwnProperty(moduleName)) {
        let precisionLevel: string = F.matchMaybe(policyPrecisionMap.get(moduleName), {
            Just: (level: string) => level,
            Nothing: () => 'default',
        });
        if (policyMap[moduleName].hasOwnProperty(precisionLevel)) {
            return F.Just(policyMap[moduleName][precisionLevel]);
        } else {
            return F.Nothing();
        }
    } else {
        return F.Nothing();
    }
}

function determineModuleName(obj: Object): string {
    if (typeof obj == 'object') {
        if (obj === JSON) {
            return 'json';
        } else if (obj === global) {
            return 'global';
        } else if (obj instanceof Map) {
            return 'map';
        } else if (obj instanceof Set) {
            return 'set';
        } else {
            if (obj === null) {
                return 'null';
            } else if (IM.isExternalModule(obj)) {
                return obj.modulePath;
            } else {
                try {
                    return obj.constructor.name.toLowerCase();
                } catch (e) {
                    return 'object';
                }
            }
        }
    } else if (typeof obj === 'function') {
        if (IM.isExternalModule(obj)) {
            return (obj as ImportedModule).modulePath;
        } else {
            return 'function';
        }
    } else {
        return (typeof obj).toLowerCase();
    }
}

export function getPolicy(obj: Object): modulePolicy {
    let moduleName = determineModuleName(obj);
    return F.matchMaybe(policyMapGet(policyMap, moduleName), {
        Just: (policy: modulePolicy) => policy,
        // Default policy is for the object
        Nothing: () => F.maybeThrow(policyMapGet(policyMap, 'object')),
    });
}

export function getObjectPolicy(): modulePolicy {
    return F.maybeThrow(policyMapGet(policyMap, 'object'));
}

export function getCurrentContext(): BaseContext {
    if (isEvalCtx()) {
        return EvalContextSingleton;
    } else {
        return BaseContextSingleton;
    }
}