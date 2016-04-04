'use strict';

var extend = require('gextend');
var join = require('path').join;
var EventEmitter = require('events').EventEmitter;
var _inherits = require('util').inherits;

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
    console.log('- execute job:', job, tag);
    if(!fileExists(job)) {
        console.log('job not found');
        return;
    }

    var exec = require('child_process').exec,
        child;

    child = exec(job,
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
        }
    );
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
