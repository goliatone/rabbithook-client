'use strict';

var _ = require('lodash');
var url = require('url');
var config = require('./../config');

var utils = {};

utils.path = function(to){
    return config.get('paths.' + to);
};

utils.throw = function(name, message){
    //TODO: we should modify the stack trace so that
    //we do not display the error from here.
    var e = new Error(message);
    e.name = name;
    throw e;
};


utils.jsonfuscate = function(object){
    return JSON.stringify(utils.obfuscate(object), null, 4);
};

utils.obfuscate = function(object){
    object = _.clone(object);
    var stopWords = ['password', 'github', 'github-token', 'token', 'access-key', 'secret'];

    _.each(object, function(value, key){
        if(typeof value === 'object'){
            object[key] = utils.obfuscate(value);
        }
        if(_.isString(value)){
            object[key] = utils.obfuscateString(value);

            if(_.contains(stopWords, key)){
                object[key] = '********';
            }
        }
    });

    return object;
};

utils.obfuscateString = function(string){
    var parts = url.parse(string);
    if(parts.host && parts.auth){
        parts.auth = null;
        return url.format(parts);
    }
    return string;
};

module.exports = utils;
