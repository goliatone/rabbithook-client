'use strict';

var Promise = require('bluebird');
var AWS = require('aws-sdk');
var dir = require('node-dir');
var path = require('path');
var docker = require('./../docker');
var extend = require('gextend');

function uploadToS3(options){
    var s3 = require('s3');

    var client = s3.createClient({
        s3Options:{
            accessKeyId: options.key,
            secretAccessKey: options.secret
        }
    });

    var params = {
        localFile: options.path,
        s3params: {
            Bucket: options.bucket,
            Key: options.name || options.path
        }
    };

    var uploader = client.uploadFile(params);

    return uploader;
}


function uploadDirectoryToS3(options){
    var uploads = [];

    return new Promise(function(resolve, reject){
        dir.files(options.dir, function(err, files){
            if(err) throw err;

            var count = 0;

            files.map(function(file){
                var f = path.relative(options.dir, file);
                f = f.split('/');
                f.shift();
                f = f.join('/');

                options.path = file;
                options.name = path.join(options.bucketPath, f);
                options.logger.info('[%s] Uploading %s in s3://%s/%s', options.buildId, file, options.bucket, options.name);

                uploads.push(new Promise(function(resolve, reject){
                    count++;
                    var upload = uploadToS3(options);
                    upload.on('end', function(data){
                        count--;
                        options.logger.info('[%s] %d remaining files to upload from %s', options.buildId, count, options.copy);
                        resolve();
                    });

                    upload.on('error', function(err){
                        reject(err);
                    });
                }));
            });
        });

        return Promise.all(uploads).then(function(){
            resolve();
        }).catch(function(){
            reject();
        });
    });
}


module.exports = function $s3uploads(dockerClient, buildId, project, logger, options){
    return new Promise(function(resolve, reject){
        var command = options.command || 'sleep 1';

        dockerClient.run(buildId, command.split(' '), process.stdout, function(err, data, container){
            if(err) {
                reject(err);
            } else if(data.StatusCode === 0){
                var artifactPath = path.join('/', 'tmp', buildId, 'publish', (new Date().getTime()).toString());

                docker.copy(container, options.copy, artifactPath).then(function(){
                    logger.info('[%s] Copied %s outside of the container, in %s, preparing to upload it to S3', buildId, options.copy, artifactPath);
                    var o = extend({}, options);
                    o.buildId = buildId;
                    o.dir = artifactPath;
                    o.logger = logger;

                    uploadDirectoryToS3(o).then(function(){
                        logger.info('[%s] All assets from %s uploaded to S3', buildId, options.copy);
                        resolve();
                    }).catch(function(err){
                        reject(err);
                    });
                }).catch(function(err){
                    reject(err);
                });
            } else {
                reject(command + ' failed, exited with status code ' + data.statusCode);
            }
        });
    });
};
