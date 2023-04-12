import * as path from 'path';
import { F, Maybe } from '../Flib';


export interface ImportedModule {
  isExternalModule: boolean,
  isBuiltinModule: boolean,
  modulePath: string,
  [x: string]: any, 
}

export class IM {
    // reference: https://nodejs.org/api/modules.html#modules_all_together
    static node_modules_paths(start: string, modulePath: string, root: string) : Array<string> {
        let parts = start.split(path.sep)
        let i = parts.length - 1
        let dirs = [] 
        while (i >= 0) {
            if (parts[i] === 'node_modules') {
                i = i - 1
                continue;
            }
            let dir = path.join(root, ...parts.slice(0, i+1), "node_modules", modulePath)
            dirs.push(dir)
            i = i - 1
        }

        // https://nodejs.org/api/modules.html#modules_loading_from_the_global_folders
        if (process.env.HOME) {
            dirs.push(path.join(process.env.HOME, '.node_modules', modulePath));
            dirs.push(path.join(process.env.HOME, '.node_libraries', modulePath));
        } 
        if (process.env.PREFIX) {
            dirs.push(path.join(process.env.PREFIX, 'lib/node', modulePath))
        }
        
        return dirs
    }

    // Add tags to distinguish external modules
    static moduleImport(filename: string, modulePath: string): ImportedModule {
        let parsedPath = path.parse(filename);
        let isInternalModule = false;
        let isExternalModule = false;
        let isBuiltinModule = false;
        let paths = [];
        if ((module.constructor as any).builtinModules.indexOf(modulePath) != -1) {
            isBuiltinModule = true;
            // Builtin modules are external
            isExternalModule = true;
            // Builtin module so don't modify the module path
            var modulePathP = modulePath;
            paths.push(modulePathP);
        } else {
            isBuiltinModule = false;
            if (modulePath.startsWith('./') || modulePath.startsWith('/') || modulePath.startsWith('../')) {
                // Relative file import; we need to get the absolute path
                isInternalModule = true;
                var modulePathP = path.join(parsedPath.dir, modulePath);
                paths.push(modulePathP);
            } else {
                // Dependency is in node modules
                isExternalModule = true;
                // This solution assumes that node_modules can be found in the
                // same directory as the target file
                let nodeModulesPath = path.join(parsedPath.dir, 'node_modules');
                var modulePathP = path.join(nodeModulesPath, modulePath);
                paths = paths.concat(IM.node_modules_paths(modulePathP, modulePath, parsedPath.root));
            }
        }
        let failedPaths = [];
        for (let p of paths) {
            try {
                let result = require(p);
                Object.defineProperty(result, 'isBuiltinModule', {
                    value: isBuiltinModule,
                    enumerable: false,
                    configurable: true,
                    writable: true,
                });
                Object.defineProperty(result, 'isExternalModule', {
                    value: isExternalModule,
                    enumerable: false,
                    configurable: true,
                    writable: true,
                });
                Object.defineProperty(result, 'isInternalModule', {
                    value: isInternalModule,
                    enumerable: false,
                    configurable: true,
                    writable: true,
                });
                Object.defineProperty(result, 'modulePath', {
                    value: modulePath,
                    enumerable: false,
                    configurable: true,
                    writable: true,
                });
                return result;
            } catch (e) {
                failedPaths.push(p);
                // Early termination in the case where the module is loaded 
                // but there is some other error
                if (e.message.indexOf('Cannot find module') == -1) {
                    console.log(`Failed to import module (ERROR): ${p}`);
                    console.log(e);
                    process.exit(1);
                }
            }
        }
    
        // should not reach here if module exists
        throw Error(
            `Failed to import module:\n Filename: ${filename}\n Path: ${parsedPath.dir}\n Module: ${modulePath}\n ModulePathStack: ${failedPaths.join("\n")}`
        );
    }

    static isExternalModule(x: any): x is ImportedModule {
        return Object.hasOwnProperty.bind(x)('isExternalModule') && x.isExternalModule == true;
    }

    static getModulePath(x: ImportedModule) {
        return x.modulePath;
    }

}
