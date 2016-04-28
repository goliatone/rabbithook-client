'use strict';

var _ = require('lodash');

var Promise = require('bluebird');
var Docker = require('dockerode');
var config = require('./../config');
var tar = require('./tar');

var fs = require('fs');
var path = require('path');

var docker = {client:{}};



if(config.get('docker.client.host') === '__gateway__'){
    config.target.docker.client.host = require('netroute').getGateway();
}


docker.client = new Docker(config.get('docker.client'));

function extractAndRepackage(project, imageId, builderId, buildId, buildLogger, dockerOptions, uuid){
    return new Promise(function(resolve, reject){
        delete dockerOptions.dockerfile;
        var extractPath = project.build.extract;
        extractPath += (extractPath[extractPath.length] === '/') ? '.' : './';
        buildLogger.info('Boldly extracting produced stuff from: ', extractPath);

        docker.client.createContainer({Image: builderId, name: uuid, Cmd: ['/bin/sh']}, function(err, container){
            if(err){
                reject(err);
                return;
            }

            container.getArchive({path: extractPath}, function(err, data){
                var failed = false;
                if(err){
                    reject(err);
                    return;
                }
                function fail(error){
                    if(!failed){
                        container.remove(function(){
                            failed = true;
                            reject(error);
                        });
                    }
                }

                var srcPath = path.join(config.get('path.tars'), project.name + '_' + uuid + '.tar');
                var destination = fs.createWriteStream(srcPath);

                data.on('data', function(){
                    process.stdout.write('•');
                });

                data.on('end', function(){
                    process.stdout.write('\n');
                });

                data.on('error', fail);
                destination.on('error', fail);

                destination.on('finish', function(){
                    container.remove(function(){
                        docker.buildImage(project, srcPath, imageId, buildId, buildLogger, dockerOptions, uuid)
                        .then(resolve)
                        .catch(reject);
                    });
                });
                data.pipe(destination);
            });
        });
    });
}


docker.buildImage = function(project, tarPath, imageId, buildId, buildLogger, dockerOptions, uuid){
    return new Promise(function(resolve, reject){
        dockerOptions = dockerOptions || {};
        var tag = imageId + ((dockerOptions.dockerfile) ? '-builder' : '');

        docker.client.buildImage(tarPath, _.extend({t: tag}, dockerOptions), function(err, response){
            if(err){
                reject(err);
                return;
            }

            buildLogger.info('[%s] Build is in progress...', tag);

            response.on('data', function(out){
                var result = {};

                try {
                    result = JSON.parse(out.toString('utf-8'));
                } catch(err) {
                    buildLogger.error('[%s] ERROR %s', tag, result.error);
                    reject(result.error);
                    return;
                }

                if(result.progress){
                    result.status = result.status + ' ' + result.progress;
                }

                buildLogger.info('[%s] %s', tag, result.stream || result.status);
            });

            response.on('end', function(){
                if(dockerOptions.dockerfile){
                    return extractAndRepackage(project, imageId, tag, buildId, buildLogger, dockerOptions, uuid)
                    .then(resolve);
                }
                resolve();
            });
        });
    });
};

docker.tag = function(imageId, buildId, branch){
    var deferred = Promise.pending();
    var image = docker.client.getImage(imageId);
    image.tag({repo: imageId, tag: branch}, function(err){
        deferred.resolve(image);
    });
    return deferred.promise;
};

docker.getAuth = function(buildId, registry, buildLogger){
    var options = {};
    if(registry === 'dockerhub'){
        buildLogger.info('[%s] Image should be pushed to the DockerHub @ hub.docker.com', buildId);

        options = config.get('auth.dockerhub');

        if(!options || !options.username || !options.email || !options.password){
            buildLogger.error('It seems that the build "%" should be pushed to dockerhub', buildId);
            buildLogger.error('but you forgot to add your credentials in the config file "%s"', config.target);
            buildLogger.error();
            buildLogger.error('Please specify:');
            buildLogger.error(' - username');
            buildLogger.error(' - email address');
            buildLogger.error(' - password');

            throw new Error('Invalid options, we are missing required arguments');
        }
    }

    //http://stackoverflow.com/questions/24814714/docker-remote-api-pull-from-docker-hub-private-registry
    // options.serveraddress = '127.0.0.1';

    return options;
};

docker.push = function(image, buildId, uuid, branch, registry, buildLogger){
    buildLogger.info('[%s] Pushing image to DockerHub, branch %s at %s', buildId, branch, registry);

    var deferred = Promise.pending();

    image.push(
        { tag: branch, force: true },
        pushHandler,
        docker.getAuth(buildId, registry, buildLogger)
    );

    function pushHandler(err, data){
        var somethingWentWrong = false;

        if(err){
            buildLogger.error('[%s] pushHandler Something went wrong, %s.\n%s', buildId, err.message, err.stack);
            deferred.reject(err);
        } else {
            data.on('error', function(err){
                buildLogger.error('[%s] pushHandler:data Something went wrong, %s.\n%s', buildId, err.message, err.stack);
                deferred.reject(err);
            });

            data.on('data', function(out){
                var message = {};
                try {
                    message = JSON.parse(out.toString('utf-8'));
                } catch(err) {
                    buildLogger.error('[%s] pushHandler:error %s', buildId, err);
                }

                if(message.error){
                    deferred.reject(message);
                    somethingWentWrong = true;
                }
                buildLogger.info('[%s] %s', buildId, message.status || message.error);
            });

            data.on('end', function(){
                if(!somethingWentWrong){
                    buildLogger.info('[%s] Pushed image of build %s to the registry at http://%s', buildId, uuid, registry);
                    deferred.resolve();
                }
            });
        }
    }
};

docker.copy = function(container, containerPath, hostPath){
    return new Promise(function(resolve, reject){
        container.copy({Resource: containerPath}, function(err, data){
            if( err){
                reject(err);
                return;
            }
            return tar.createFromStream(hostPath, data).then(function(){
                resolve();
            });
        });
    });
};

module.exports = docker;
