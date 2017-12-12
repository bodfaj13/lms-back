var mongoose = require('../config/mongoose');
var bcrypt = require('bcrypt');

var adminSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        bcrypt: true
    },
    emailAddress: {
        type: String,
        required: true
    },
    profilePicture : {
        type: String
    },
    createdAt: {
        type: Date, 
        required: true
    }
});

var Admin = module.exports = mongoose.model('admins', studentSchema);

