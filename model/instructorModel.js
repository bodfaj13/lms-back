var mongoose = require('../config/mongoose');
var bcrypt = require('bcrypt');

var InstructorSchema = mongoose.Schema({
    name:{
        type: String,
    },
    username: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        bcrypt: true
    },
    emailAddress: {
        unique: true,
        type: String,
        unique: true
    },
    priviledge: {
        type: String,
        required: true
    },
    profilePicture : {
        type: String
    },
    createdAt: {
        type: Date,
        // required: true
    },
});

var Instructor = mongoose.model('teachers', InstructorSchema);
 module.exports = Instructor

