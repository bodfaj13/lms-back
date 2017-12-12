var mongoose = require('../config/mongoose');
var bcrypt = require('bcrypt');

//user schema
var userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        bcrypt: true
    },
    emailAddress: {
        type: String,
        required: true,
        trim: true
    },
    profilePicture : {
        type: String
    },
    clearanceLevel: {
        type: String,
        default: 'generalUser'
    },
    cleared: {
        type: Boolean,
        default: false
    },
    noOfRegCourses: {
        type: Number,
        default: 0
    },
    regCourses: [
        {
            courseCode: String,
            paid: Boolean
        }
    ],
    noOfCoursesTaking: {
        type: Number,
        default: 0
    },
    coursesTaking: [
        {
            courseCode: String,
            courseTitle : String,
            courseDescription: String,
            paid: {
                type: Boolean,
                default: false
            }
        }
    ],
    logo : {
        type: String
    },
    noOfPostedJobs: {
        type: Number,
        default: 0
    },
    postedJobs: [
        {
            title: String,
            content: String,
            date: Date
        }
    ],
    createdAt: {
        type: Date, 
        required: true
    },
    wayOfPayment: {
        type: String
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    }
});

var User = module.exports = mongoose.model('users', userSchema);

module.exports.createUser =  function(newUser, callback){
    bcrypt.hash(newUser.password, 10, function(err, hash){
        if(err)throw err;
        newUser.password = hash;
        newUser.save(callback);
    });
}

module.exports.createUserPassword =  function(user, password,callback){
    bcrypt.hash(password, 10, function(err, hash){
        if(err)throw err;
        user.password = hash;
        user.resetPasswordExpires = undefined;
        user.resetPasswordToken = undefined;
        user.save(callback);
    });
}

module.exports.checkUserEmail = function(emailAddress, callback){
    var query = {emailAddress: emailAddress};
    User.findOne(query, callback);
}

module.exports.checkUserUsername = function(username, callback){
    var query = {username: username};
    User.findOne(query, callback);
}

module.exports.comparePassword = function(password, hash, callback){
    bcrypt.compare(password, hash, function(err, isMatch){
        if(err)return callback(err);
        callback(null, isMatch);
    });
}

module.exports.getUserById = function(id, callback){
    User.findById(id, callback);
}

module.exports.checkResetPasswordToken = function(getToken, callback){
    var query = { resetPasswordToken: getToken, resetPasswordExpires: { $gt: Date.now() } };
    User.findOne(query, callback);
}

module.exports.updateEmail =  function(getUser, callback){
    var cond = {emailAddress: getUser.emailolddie};
    var update =  {$set: {emailAddress: getUser.emailnewwie}};
    var options = {upsert : true};
    
    User.update(cond, update, options, callback);
}

module.exports.updateUsername =  function(getUser, callback){
    var cond = {username: getUser.olddie};
    var update =  {$set: {username: getUser.newwie}};
    var options = {upsert : true};

    User.update(cond, update, options, callback);
}

module.exports.updatePassword =  function(getUser, callback){
    var cond = {_id: getUser.id};
    var update =  {$set: {password: getUser.newwie}};
    var options = {upsert : true};

    User.update(cond, update, options, callback);
}