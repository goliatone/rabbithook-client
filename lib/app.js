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
    console.log('- execute job', job, tag);
};


module.exports = function(config){
    var app = new App(config);
    return app;
};
