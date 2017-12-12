var express = require('express');
var router = express.Router();
// var passport = require('passport');
var bcrypt = require('bcrypt');
var User = require('../model/userModel');
var appdetails = require('../config/appdetails.json');
var crypto = require('crypto');
var async = require('async');
var qs = require("querystring")
var nodemailer = require('nodemailer');
var jwt = require('jsonwebtoken');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json(true);
});

router.get('/api/userprofile', function (req, res, next) {
  User.find({ emailAddress : req.query.email}).then((user)=>{
    console.log(user)
    if (user) res.json(user); else res.json({})
  },(err)=>res.sendStatus(404));
});
// passport serialize and deserialize
// passport.serializeUser(function(user, done) {
//   done(null, user._id);
// });

// passport.deserializeUser(function(id, done) {
//   User.getUserById(id, function (err, user) {
//     done(err, user);
//   });
// });

//user login route
router.post('/api/userlogin', function(req, res, next){
  var email = req.body.email;
  var password = req.body.password;
  
  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('email', 'Email is invalid').isEmail();
  req.checkBody('password', 'Password is required').notEmpty();

  var result = req.getValidationResult();
  req.getValidationResult().then(function(result){
    if(!result.isEmpty()){
      var errors = result.array();
      //send validaton errors
      res.json(errors)
    }else{
      User.checkUserEmail(email, function(err, user){
        if(err) throw err;
        if(!user){
          res.json({"email":"email not found"});
        }else{
          User.comparePassword(password, user.password, function(err, isMatch){
            if(err) throw err;
            if(isMatch){  
             var data = {
               id: user._id,
               email: user.emailAddress,
               clearanceLevel: user.clearanceLevel
             }
             var token = jwt.sign(data, appdetails.jwtSecret).toString();
             res.header('x-auth', token).json({"token":token});
            }else{
              res.json({'password':'password is incorrect'});
            }
          });
        }
      });
    }
  });
});

//user signin route
router.post('/api/usersignin', function(req, res, next){
  var name = req.body.name;
  var email = req.body.email;
  var password = req.body.password;
  var time = new Date();
  
  req.checkBody('name', 'Name is required').notEmpty();
  req.checkBody('email', 'Email Address is required').notEmpty();
  req.checkBody('email', 'Email Address is invalid').isEmail();
  req.checkBody('password', 'Password is required').notEmpty();

  var result = req.getValidationResult();
  req.getValidationResult().then(function(result){
    if(!result.isEmpty()){
      var errors = result.array();
      //send validaton errors
      res.json(errors)
    }else{
      User.checkUserEmail(email, function(err, user){
        if(err)throw err;
        if(!user){
          var newUser  = new User ({
            name: name,
            emailAddress: email,
            password: password,
            createdAt : time
          });
          User.createUser(newUser, function(err, user){
            if(err) throw err;
            var obj =  {
              success: 'user created successfully'
            }
            res.json(obj);
          });
          }else{
            res.json({'email':'email already exists'});
          }
        });
      }
  });
});

//forgot password
router.post('/api/forgotpassowrd', function(req, res, next) {
  var email = req.body.email;
  req.checkBody('email', 'Email Address is required').notEmpty();
  req.checkBody('email', 'Email Address is invalid').isEmail();

  var result = req.getValidationResult();
  req.getValidationResult().then(function(result){
    if(!result.isEmpty()){
      var errors = result.array();
      //send validaton errors
      res.json(errors)
    }else{
      User.checkUserEmail(email, function(err, user){
        if(err)throw err;
        if(!user){
          res.json({"email":'email not found in the db'});
        }else{
            async.waterfall([
              function(done){
                crypto.randomBytes(20, function(err, buf) {
                  var token = buf.toString('hex');
                  done(err, token);
                });
              },
              function(token, done) {
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                user.save(function(err) {
                  done(err, token, user);
                });
              },
              function(token, user, done) {
                var smtpTransport = nodemailer.createTransport({
                  service: 'Gmail',
                  auth: {
                    user: appdetails.emailAddress,
                    pass: appdetails.emailPassword
                  }
                });
                var mailOptions = {
                  to: user.emailAddress,
                  from: appdetails.Title,
                  subject: 'Node.js Password Reset',
                  text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    'http://' + req.headers.host + '/api/reset/' + token + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
                };
                smtpTransport.sendMail(mailOptions, function(err) {
                  res.json({"reset":'An e-mail has been sent to ' + user.emailAddress + ' with further instructions.'});
                  done(err, 'done');
                });
              }
            ], function(err){
              if(err) throw err;
              res.json('fatal error');
            });
          }
        });
      }
  });

});

//check token authenticity
router.get('/api/reset/:token', function(req, res) {
  var getToken = req.params.token;
  User.checkResetPasswordToken(getToken, function(err, user){
    if(err) throw err;
    if(!user){
      res.json({"expire":'passoword token has expired'});
    }else{
      res.json('passoword token is still valid');
    }
  })
});

//reset password
router.post('/api/reset/:token', function(req, res, next) {
  var getToken = req.params.token;
  var password = req.body.password;
  var confirmPassword = req.body.confirmPassword;
  var hasedPassword;

  req.checkBody('password', 'Password is required').notEmpty();
  req.checkBody('confirmPassword', 'Confirm  Password is required').notEmpty();
  req.checkBody('password', 'Password lenght must be within 8 and 12 characters').len(8, 12);
  req.checkBody('confirmPassword', 'Passwords do not tally').equals(req.body.password);


  var result = req.getValidationResult();
  req.getValidationResult().then(function(result){
    if(!result.isEmpty()){
      var errors = result.array();
      //send validaton errors
      res.json(errors)
    }else{
      async.waterfall([
        function(done){
          User.checkResetPasswordToken(getToken, function(err, user){
            if (!user) {
              res.json('passoword token has expired');
            }else{
              User.createUserPassword(user, password,function(err, user){
                if(err)throw err;
                done(err, user);
              });
            }
          });
        },
        function(user, done) {
          var smtpTransport = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
              user: appdetails.emailAddress,
              pass: appdetails.emailPassword
            }
          });
          var mailOptions = {
            to: user.emailAddress,
            from: appdetails.Title,
            subject: 'Node.js Password Reset',
            text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.emailAddress + ' has just been changed.\n'
          };
          smtpTransport.sendMail(mailOptions, function(err) {
            res.json('password updated still chceck your mail');
            done(err);
          });
        }
      ], function(err){
        if(err) throw err;
        res.json('fatal error');
      });
      }
  });

});

///update email
router.post('/api/updateemail', function(req, res, next){
  var emailolddie = req.body.emailolddie;
  var emailnewwie = req.body.emailnewwie;

    req.checkBody('emailolddie', 'Former Email Address is required').notEmpty();
    req.checkBody('emailnewwie', 'New Email Address is required').notEmpty();
    req.checkBody('emailolddie', 'Former Email Address is not valid').isEmail();
    req.checkBody('emailnewwie', 'New Email Address is not valid').isEmail();

    req.getValidationResult().then(function(result){
      if(!result.isEmpty()){
        var errors = result.array();
        //send validaton errors
        res.json(errors)
      }else{
        if(req.user.emailAddress != emailolddie){
          res.json('Former Email Address do not tally');
        }else{
         if(emailolddie == emailnewwie){
            res.json('New Email Address must not be the same as the Old Email Address');
          }else{
            User.checkUserEmail(emailnewwie, function(err, user){
              if(err) throw err;
              if(!user){
                var getUser = {
                  emailolddie: emailolddie,
                  emailnewwie: emailnewwie
                }
                User.updateEmail(getUser, function(err, numAffected){
                  if(err) throw err;
                  var obj =  {
                    msg: 'email adddress updated sucessfully',
                    success: true
                  }
                  res.json(obj);
                });
              }else{
                res.json('Email Address already exists!');
              }
            });
          }
        }
      }
    });
});

//update username
router.post('/api/updateusername', function(req, res, next){
  var olddie, newwie;
  olddie = req.body.olddie;
  newwie = req.body.newwie;

    req.checkBody('olddie', 'Former Username is required').notEmpty();
    req.checkBody('newwie', 'New Username is required').notEmpty();
    
    req.getValidationResult().then(function(result){
      if(!result.isEmpty()){
        var errors = result.array();
        //send validaton errors
        res.json(errors)
      }else{
        if(user.username != olddie){
          res.json('Former username Address do not tally');
        }else{
         if(olddie == newwie){
          res.json('New Username must not be the same as the Old Useranme');
          }else{
            User.checkUserUsername(newwie, function(err, user){
              if(err) throw err;
              if(!user){
                var getUser = {
                  olddie: olddie,
                  newwie: newwie
                }
                User.updateUsername(getUser, function(err, numAffected){
                  if(err) throw err;
                  var obj =  {
                    msg: 'username adddress updated sucessfully',
                    success: true
                  }
                  res.json(obj);
                });
              }else{
                res.json('Email Address already exists!');
              }
            });
          }
        }
      }
    });
});

//update password
router.post('/api/updatepassword', function(req, res, next){
  var olddie, newwie;
  olddie = req.body.olddie;
  newwie = req.body.newwie;

    req.checkBody('olddie', 'Former password is required').notEmpty();
    req.checkBody('newwie', 'New password is required').notEmpty();
    req.checkBody('newwie', 'Password lenght must be within 8 and 12 characters').len(8, 12);
    
    req.getValidationResult().then(function(result){
      if(!result.isEmpty()){
        var errors = result.array();
        //send validaton errors
        res.json(errors)
      }else{
        User.comparePassword(olddie, req.user.password, function(err, isMatch){
          if(err) throw err;
          if(isMatch){
            if(olddie == newwie){
              res.json('New password must not be the same as the Old password');
            }else{
              var getUser = {
                id: req.user._id,
                newwie: newwie
              }

              User.updateUsername(getUser, function(err, numAffected){
                if(err) throw err;
                var obj =  {
                  msg: 'password updated sucessfully',
                  success: true
                }
                res.json(obj);
              });
            }
          }else{
            res.json('oops,former password is incorrect');
          }
        });
      }
    });
});


//add course
router.post('/api/addcourse', function(req, res, next){
  var courseCode;
  var courseTitle = req.body.courseTitle;
  var coursePrice = req.body.coursePrice;
  var place = req.body.place;
  var startingAt = req.body.startingAt;
  var endingAt = req.body.endingAt;
  var maxCapacity = req.body.maxCapacity;
  var createdAt = new Date();
  
  req.checkBody('courseTitle', 'Course Title is required').notEmpty();
  req.checkBody('coursePrice', 'Username is required').notEmpty();
  req.checkBody('place', 'Email Address is required').notEmpty();
  req.checkBody('startingAt', 'Email Address is invalid').isEmail();
  req.checkBody('endingAt', 'Password is required').notEmpty();
  req.checkBody('maxCapacity', 'Password is required').notEmpty();
  req.checkBody('createdAt', 'Password is required').notEmpty();
  
  var result = req.getValidationResult();
  req.getValidationResult().then(function(result){
    if(!result.isEmpty()){
      var errors = result.array();
      //send validaton errors
      res.json(errors)
    }else{

      }
  });
});

//create code
router.get('/api/createcode', function(req, res, next){
  crypto.randomBytes(20, function(err, buf) {
    var secret = buf.toString('hex');
    var obj = {
      serect: secret
    }
    res.json(secret);
  });
});

//logout route
router.get('/api/logout', function(req, res, next){
  req.logout();
  res.json('logout successful');
  res.redirect('/');
});
module.exports = router;
