'use strict';

var extend = require('gextend');
var join = require('path').join;
var EventEmitter = require('events').EventEmitter;
var _inherits = require('util').inherits;
var glob = require('glob');
var spawn = require('child_process').spawn;

var DEFAULTS = {
    autoinitialize: true
};


function App(config){
    EventEmitter.call(this);
    config = extend({}, DEFAULTS, config);
    if(config.autoinitialize) this.init(config);
}
_inherits(App, EventEmitter);

App.prototype.init = function(config){
    extend(this, config);
};

App.prototype.execute = function(service, id, payload, tag){
    var job = join(this.jobsPath, service + '.' + id);
    console.log('- Execute job: service %s, id %s, %tag',service, id, tag);
    // console.log('-payload %s', JSON.stringify(payload, null, 4));

    // options is optional
    glob(job + '.*', {ignore: '**/*.js'}, function (er, files) {

        console.log('Found some josts:\n', files);

        function step(arr, done){
            if(arr.length){
                exec(arr.shift(), step.bind(null, arr), done);
            } else {
                done();
            }
        }

        function exec(file, done, cb){
            console.log('Execute', file, ['--id', id, '--tag', tag]);

            var cmd = spawn(file, ['--id', id, '--tag', tag]);

            cmd.stdout.on('data', function (data) {
                console.log(data);
            });

            cmd.stderr.on('data', function (data) {
                console.error(data);
            });

            cmd.on('exit', function (code) {
                console.log('child process exited with code ' + code);
                done(cb);
            });
        }
        step(files, function(){
            console.log('Complete!');
        });
    });

    // try {
    //     require('./../jobs/' + service).execute(id, tag, payload);
    // } catch(err) {
    //     console.log('Error:', err.message, err.stack);
    // }
};


module.exports = function(config){
    var app = new App(config);
    return app;
};

function fileExists(filePath)
{
    try
    {
        return require('fs').statSync(filePath).isFile();
    }
    catch (err)
    {
        return false;
    }
}



