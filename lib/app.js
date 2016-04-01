'use strict';

var EventEmitter = require('events');
var _inherits = require('util').inherits;

function App(){
    EventEmitter.call(this);
}
_inherits(App, EventEmitter);


module.exports = function(config){
    var app = new App(config);
    return app;
};
