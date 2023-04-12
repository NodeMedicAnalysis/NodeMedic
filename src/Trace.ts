import * as util from 'util';
import { Config } from './Config';
import { State, describeID } from './State';
import { F } from './Flib';


function truncate(value: string, len: number): string {
    return value.substring(0, len);
}

export function inspect(value: any, len?: number): string {
    if (len) {
        return truncate(util.inspect(value, false, 1), len);
    } else {
        // Default behavior is to truncate to 20 characters
        return truncate(util.inspect(value, false, 1), 20);
    }
}

export class Tracer {
    config: Config;

    constructor(config: Config) {
        this.config = config;
    }

    getID(s: State, value: any): string {
        return F.matchMaybe(s.Mw.get(value), {
            Just: ([id, _]) => describeID(id),
            Nothing: () => 'NoID',
        });
    }

    inspect(value: any, s?: State): string {
        let outStr = '(';
        outStr += inspect(value, this.config.MAXLENGTH);
        if (s) {
            let outStr2 = ', ';
            if (value instanceof Array) {
                outStr2 += '[';
                for (let i in value) {
                    outStr2 += this.getID(s, value[i]) + ', ';
                }
                outStr2 += ']';
            } else {
                outStr2 += this.getID(s, value);
            }
            outStr += outStr2;
        }
        return outStr + ')';
    }

    explain(msg: string): void {
        if (this.config.EXPLAIN) {
            console.info(`INFO: ${msg}\n`);
        }
    }

    debug(msg: string): void {
        if (this.config.DEBUG) {
            console.info(`DEBUG: ${msg}\n`);
        }
    }

}
