'use strict';

var dispatcher = require('../dispatcher');
var config = require('./../../config');
var adapter = require('./' + config.get('app.storage'));

module.exports = {
    saveBuild: function(id, tag, project, branch, status){
        return adapter.saveBuild(id, tag, project, branch, status).then(function(result){
            dispatcher.emit('storage.update', result);
            return result;
        });
    },
    getBuilds: function(limit){
        return adapter.getBuilds(limit);
    },
    getStartedBuilds: function(){
        return this.getBuildsByStatus(['started']);
    },
    getPendingBuilds: function(){
        return this.getBuildsByStatus(['started', 'queued']);
    },
    getBuildsByStatus: function(statuses){
        return adapter.getBuildsByStatus(statuses);
    },
    getProjects: function(limit){
        return adapter.getProjects(limit);
    },
    getBuild: function(id){
        return adapter.getBuild(id);
    }
};
