'use strict';

var _ = require('lodash');
var moment = require('moment');
var yaml = require('js-yaml');
var fs = require('fs');
var url = require('url');
var Promise = require('bluebird');


var file = {};
var data = {builds: {}};

try {
    data = yaml.safeLoad(fs.readFileSync('/db/data.yml'));
} catch(err){ console.error(err);}

function flush(){
    try {
        fs.mkdirSync('/db');
    } catch(err){
        if(err.code !== 'EEXIST'){
            throw err;
        }
    }

    fs.writeFileSync('/db/data.yml', yaml.safeDump(data));
}

file.saveBuild = function(id, tag, project, branch, status){
    data.builds[id] = {
        branch: branch,
        project: project,
        status: status,
        id: id,
        tag: tag,
        'created_at': data.builds[id] ? data.builds[id]['created_at'] : moment().format(),
        'updated_at': moment().format()
    };

    flush();

    return Promise.resolve(data);
};

file.getBuilds = function(statuses){

};
