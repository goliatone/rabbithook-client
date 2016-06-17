'use strict';

var fs = require('fs');
var baseTar = require('tar-fs');
var logger = require('./logger');
var Promise = require('bluebird');

var tar = {};

tar.createFromStream = function(path, stream){
    stream.pipe(baseTar.extract(path));

    return new Promise(function(resolve, reject){
        stream.on('error', function(err){
            reject(err);
        });

        stream.on('end', function(){
            resolve();
        });
    });
};

tar.create = function(path, sourceDirectory){
    var redeable = fs.createWriteStream(path);
    var deferred = Promise.pending();
    console.log('TAR create path %s from %s', path, sourceDirectory);

    baseTar.pack(sourceDirectory).pipe(redeable).on('error', function(err){
        deferred.reject(err);
    });

    redeable.on('error', function(err){
        deferred.reject(err);
    });

    redeable.on('finish', function(){
        console.log('tar created done!!!');
        deferred.resolve();
    });

    return deferred.promise;
};

module.exports = tar;
