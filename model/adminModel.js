var mongoose = require('../config/mongoose');
var bcrypt = require('bcrypt');

var adminSchema = mongoose.Schema({
    name: {
        type: String,
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
    },
    profilePicture : {
        type: String
    },
    createdAt: {
        type: Date, 
    }
});

var Admin = mongoose.model('admin', adminSchema);
 module.exports = Admin

