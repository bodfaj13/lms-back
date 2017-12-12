var mongoose = require('mongoose');
var config = require('./config');

mongoose.connect(config.dbURL, {useMongoClient: true})

module.exports = mongoose;