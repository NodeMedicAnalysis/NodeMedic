/**@file config.ts
 * 
 * @brief Taint analysis configuration
 * 
 */
// JALANGI DO NOT INSTRUMENT

import { setEvalSink } from "./modules/Eval";
import { policyPrecisionMap } from './modules/PolicyManager';
import { setTAINTPATHS, setTAINTPATHSJSON } from './TaintPaths';


export class Config {
    // If true, taint assertions will raise a 'ASSERT_PASSED' assertion failure
    // which is necessary for testing but should not be triggered otherwise
    ASSERTPASSED: boolean;

    // Flags for debug output
    EXPLAIN: boolean;
    DEBUG: boolean;
    EXPAND: boolean;
    MAXLENGTH: number;

    // Performs sink propagation even if function *isn't* external
    AGGRESSIVE_SINK_PROPAGATION: boolean;

    constructor() {
        this.ASSERTPASSED = false;
        this.EXPLAIN = false;
        this.DEBUG = false;
        this.EXPAND = true;
        this.MAXLENGTH = 50;
        setEvalSink(true);
        setTAINTPATHS(true);
        setTAINTPATHSJSON(false);
        this.AGGRESSIVE_SINK_PROPAGATION = true;
    }
    setFromArgs(args: string[]) {
        let self = this;
        args.forEach(function (val) {
            // Set the ASSERTPASSED testing flag
            if (val.includes('assert_passed=')) {
                var result = val.split('=')[1];
                if (result == 'true') {
                    self.ASSERTPASSED = true;
                }
            }
            // Set the EVALSINK tainter flag
            else if (val.includes('eval_sink=')) {
                var result = val.split('=')[1];
                if (result == 'false' || result == 'f') {
                    setEvalSink(false);
                } else {
                    setEvalSink(true);
                }
            // Set the log levels
            } else if (val.includes('log_level=')) {
                var levels = val.split('=')[1].split(',');
                if (levels.indexOf('info') != -1) {
                    self.EXPLAIN = true;
                }
                if (levels.indexOf('debug') != -1) {
                    self.DEBUG = true;
                }
            // Set taint policies
            } else if (val.includes('policies=')) {
                // Policies are comma-separated pairs
                // ex: array:precise,string:precise
                let policies = val.split('=')[1].split(',');
                for (let i in policies) {
                    let parts = policies[i].split(':')
                    policyPrecisionMap.set(parts[0], parts[1]);
                }
            // Set if taint flow paths should be stored
            } else if (val.includes('taint_paths=')) {
                var result = val.split('=')[1];
                if (result == 'false' || result == 'f') {
                    setTAINTPATHS(false);
                } else {
                    setTAINTPATHS(true);
                }
            // Set if taint flow paths should be stored (JSON)
            } else if (val.includes('taint_paths_json=')) {
                var result = val.split('=')[1];
                if (result == 'true' || result == 't') {
                    setTAINTPATHSJSON(true);
                } else {
                    setTAINTPATHSJSON(false);
                }
            }
        });
    }
}
