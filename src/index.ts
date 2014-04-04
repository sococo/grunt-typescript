///<reference path="../typings/gruntjs/gruntjs.d.ts" />
///<reference path="../typings/node/node.d.ts" />
///<reference path="../typings/q/Q.d.ts" />
///<reference path="io.ts" />
///<reference path="opts.ts" />
///<reference path="task.ts" />

declare var module: any;
module.exports = function(grunt: IGrunt){

    var _path = require("path"),
        _vm = require('vm'),
        _os = require('os'),
        Q = require('q'),
        getTsBinPathWithLoad = (): string => {
            var typeScriptBinPath = _path.dirname(require.resolve("typescript")),
                typeScriptPath = _path.resolve(typeScriptBinPath, "typescript.js"),
                code: string;

            if (!typeScriptBinPath) {
                grunt.fail.warn("typescript.js not found. please 'npm install typescript'.");
                return "";
            }

            code = grunt.file.read(typeScriptPath);
            _vm.runInThisContext(code, typeScriptPath);

            return typeScriptBinPath;
        },
        setGlobalOption = (options: GruntTs.Opts) => {
            if(!TypeScript || !options){
                return;
            }
            TypeScript.newLine = function(){
                return _os.EOL;
            };
            if(options.newLine !== GruntTs.NewLine.auto){
                TypeScript.newLine = ((v: string) => {
                    return () => v;
                })(options.newLine === GruntTs.NewLine.crLf ? "\r\n" : "\n");
            }
            if(options.indentStep > -1){
                TypeScript.Indenter.indentStep = options.indentStep;
                TypeScript.Indenter.indentStepString = Array(options.indentStep + 1).join(" ");
            }
            if(options.useTabIndent) {
                TypeScript.Indenter.indentStep = 1;
                TypeScript.Indenter.indentStepString = "\t";
            }
        };

    // Used to avoid reloading the "typescript.js" file each time a compilation task processed.  Saves a
    // considerable amount of time when there are multiple tasks.
    var cacheBinPath:string;

    grunt.registerMultiTask('typescript', 'Compile TypeScript files', function () {
        var self: grunt.task.IMultiTask<{src: string;}> = this,
            typescriptBinPath = cacheBinPath || getTsBinPathWithLoad(),
            promises: Q.IPromise<any>[] = [],
            done = self.async();
        cacheBinPath = typescriptBinPath;

        self.files.forEach(function (gruntFile: grunt.file.IFileMap) {
            var io: GruntTs.GruntIO = new GruntTs.GruntIO(grunt),
                opts = new GruntTs.Opts(self.options({}),grunt, gruntFile, io);

            setGlobalOption(opts);
            promises.push((new GruntTs.Task(grunt, typescriptBinPath, io)).start(opts));

        });
        Q.all(promises).then(function(){
            done();
        }, function(){
            done(false);
        })
    });
};