'use strict';

var uuid = require('node-uuid');
var builder = require('../lib/builder');

module.exports.execute = function(id, tag, options){
    //We assume that options is a valid payload. TODO: Check :)
    var repo = options.data.repository.html_url;
    var branch = getBranch(options.data);
    var dockerOptions = {};

    console.log('build', repo, branch, uuid.v4(), dockerOptions);
    builder.schedule(repo, branch, uuid.v4(), dockerOptions);
};

//Initially we only care to build master, but we should
//figure this out better.
function getBranch(data){
    if(data.ref === 'refs/heads/master') return 'master';
    if(data.head && data.head.ref) return data.head.ref;
    return 'master';
}
