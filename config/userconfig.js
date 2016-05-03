'use strict';
var yaml = require('js-yaml');
var logger = require('../lib/logger');
var fs = require('fs');
var argv = require('yargs').argv;
var resolve = require('path').resolve;

var config = {},
    filepath = resolve(argv.config || './config/base.yml');

console.log('====> filepath', filepath);
try {
    config = yaml.safeLoad(fs.readFileSync(filepath));
} catch(e){
    logger.info('Unable to find config file, proceeding with a bare minimum configuration');
    logger.info(e.message, e.stack);
}

module.exports = config;
