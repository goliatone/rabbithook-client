'use strict';

var _ = require('lodash');
// var _where = require('lodash.where');
var moment = require('moment');
var yaml = require('js-yaml');
var fs = require('fs');
var url = require('url');
var homedir = require('homedir');
var Promise = require('bluebird');


var dbpath = '/db/';
// var dbpath = homedir() + '/db/';

var file = {};
var data = {builds: {}};

try {
    data = yaml.safeLoad(fs.readFileSync(dbpath + 'data.yml'));
} catch(err){ console.error(err);}

function flush(makedir){
    try {
        fs.mkdirSync(dbpath);
    } catch(err){
        if(err.code !== 'EEXIST'){
            throw err;
        }
    }
    if(!makedir) fs.writeFileSync(dbpath + 'data.yml', yaml.safeDump(data));
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

file.getBuilds = function(limit){
    return new Promise(function(resolve, reject){
        limit = limit || 10;
        var builds = _.sortBy(data.builds, function(build){
            return - moment(build['udpated_at']).unix();
        }).slice(0, limit);

        resolve(builds);
    });
};

file.getBuildsByStatus = function(statuses){
    return new Promise(function(resolve, reject){
        var builds = _.where(data.builds, function(build){
            return _.contains(statuses, build.status);
        });

        resolve(builds);
    });
};

file.getProjects = function(limit){
    return new Promise(function(resolve){
        limit = limit || 10;
        var projects = [];

        _.each(_.sortBy(data.builds, function(build){
            return - moment(build['udpated_at']).unix();
        }), function(build){
            var u = url.parse(build.project);
            var alias = u.pathname;
            var parts = alias.split('__');

            if(parts.length === 2){
                alias = parts[1] + ' (' + parts[0].substr(1) + ')';
            }
            projects.push({
                name: build.project,
                alias: alias,
                'latest_build': build
            });
        });
        resolve(_.uniq(projects.slice(0, limit), 'name'));
    });
};


file.getBuild = function(id){
    return new Promise(function(resolve, reject){
        var build = _.where(data.builds, {id: id})[0];
        if(build){
            resolve(build);
            return;
        }
        reject();
    });
};

module.exports = file;
