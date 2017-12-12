var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var User = require('../model/userModel');
var appdetails = require('../config/appdetails.json');
var crypto = require('crypto');
var async = require('async');
var nodemailer = require('nodemailer');
var jwt = require('jsonwebtoken');
var Course = require('../model/coursesModel');
var qs = require('querystring')
var moment = require('moment');
var Publication = require('../model/publicationModel');
var Admin = require('../model/adminModel');
var Instructor = require('../model/instructorModel');
var multer = require('multer'); 
var Storage = multer.diskStorage({
  destination: function(req, file, callback) {
      callback(null, "./public/images/publications");
  },
  filename: function(req, file, callback) {
      callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  }
});
var upload = multer({
  storage: Storage,
  limits: {fileSize: 5*1024*1024}, //5mb limit
  fileFilter: function(req, file, cb){
    var mimeType = file.mimetype;
    if(mimeType == 'image/gif' || mimeType == 'image/jpeg' || mimeType == 'image/png' || mimeType == 'image/jpg'){
      cb(null, true);
    }else{
      cb(null, false);
    }
  }
}).single("avatar");


/* GET home page. */
router.get('/api', function(req, res, next) {
  var newAdmin = new Admin({ username: "admin2", priviledge: "admin", emailAddress: "admin@admin.com", password: "admin" })
  var newInstructor = new Instructor({ username: "test", priviledge: "instructor", emailAddress: "admin@text.com", password: "test" })
  // newAdmin.save().then((data) => console.log(data), (err) => console.log(err))
  // newInstructor.save().then((data) => console.log(data), (err) => console.log(err))
  Instructor.find().then((user)=>console.log(user))
  res.render('index', {title:" Express"});
});

router.post('/api/adminlogin', function (req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  Admin.findOne({"username":username,"password":password}).then((user)=>{
    if(user){
      console.log(user)
      var info = {
        id: user._id,
        email: user.emailAddress,
        username: user.username,
        priviledge: user.priviledge
      }
      var token = jwt.sign(info, appdetails.jwtSecret).toString();
      res.json({ "token": token });
    } else res.send({});
  });

})
router.post('/api/instructorlogin', function (req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  Instructor.findOne({ username: username, password: password }).then((user) => {
  // Instructor.find().then((user)=>console.log(user))
    if (user) {
      console.log(user)
      var data = {
        id: user._id,
        email: user.emailAddress,
        username: user.username,
        priviledge: user.priviledge
      }
      var token = jwt.sign(data, appdetails.jwtSecret).toString();
      res.json({ "token": token });
    } else res.send({user: "username/password incorrect"});
  });
})
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
             res.header('x-auth', token).json({"token": token});
            }else{
              res.json({"password" : "password is incorrect"});
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
            res.json({"email":"email already exists"});
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
          res.json({"email":"email not found"});
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
                  res.json('An e-mail has been sent to ' + user.emailAddress + ' with further instructions.');
                  done(err, 'done');
                });
              }
            ], function(err){
              if(err) throw err;
              res.json({"error":"fatal error"});
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
      res.json({"expired":"passoword token has expired"});
    }else{
      res.json({"password":"passoword token is still valid"});
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
              res.json({"expired":"passoword token has expired"});
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
            res.json({"password":"password updated chceck your mail to confirm"});
            done(err);
          });
        }
      ], function(err){
        if(err) throw err;
        res.json({"error":"fatal error"});
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
  var courseCode = req.body.courseCode;
  var courseTitle = req.body.courseTitle;
  var coursePrice = req.body.coursePrice;
  var place = req.body.place;
  var startingAt = req.body.startingAt;
  var endingAt = req.body.endingAt;
  var maxCapacity = req.body.maxCapacity;
  var time = new Date();
  
  req.checkBody('courseCode', 'Course Code is required').notEmpty();
  req.checkBody('courseTitle', 'Course Title is required').notEmpty();
  req.checkBody('coursePrice', 'Course Price is required').notEmpty();
  req.checkBody('place', 'Place is required').notEmpty();
  req.checkBody('startingAt', 'Starting date of course is invalid').notEmpty();
  req.checkBody('endingAt', 'Ending date of course is required').notEmpty();
  req.checkBody('maxCapacity', 'Max Capacity is required').notEmpty();

  
  var result = req.getValidationResult();
  req.getValidationResult().then(function(result){
    if(!result.isEmpty()){
      var errors = result.array();
      //send validaton errors
      res.json(errors)
    }else{
      var newCourse = new Course({
        courseCode: courseCode,
        courseTitle : courseTitle,
        coursePrice : coursePrice,
        place : place,
        startingAt: new Date(startingAt),
        endingAt : new Date(startingAt),
        maxCapacity : maxCapacity,
        createdAt : time
      });

      Course.createCourse(newCourse, function(err, user){
        if(err)throw err;
        var obj =  {
          success: 'course created successfully'
        }
        res.json(obj);
      }); 
    }
  });
});

//getuserprofile
router.get('/api/userprofile', function(req, res, next){
  var emailAddress = req.query.email;
  console.log(emailAddress)
  User.findOne({emailAddress:emailAddress}).then((email) => {
    if(email) {res.json(email); console.log(email)} else res.json({})
  },(err)=>res.sendStatus(404))
});

//view publication 

router.get("/api/publications", function (req,res,next) { 
  Publication.find().then((data) => {
    if(data){
      console.log(data)
      res.json(data)
    } else res.json({})
  },(err)=>res.sendStatus(500))
 })
//create publicaton
router.post('/api/addpublication', function(req, res, next){
  var title = req.body.title;
  var body = req.body.body;
  var author = req.body.author;
  var time = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
  var pubImg;
  
  req.checkBody('title', 'Title is required').notEmpty();
  req.checkBody('body', 'Body is required').notEmpty();
  req.checkBody('author', 'Author is required').notEmpty();

  var result = req.getValidationResult();
  req.getValidationResult().then(function(result){
    if(!result.isEmpty()){
      var errors = result.array();
      //send validaton errors
      res.json(errors)
    }else{
      var newPublication = new Publication({
        title: title,
        body : body,
        author : author,
        createdAt : time
      });

      Publication.createPublication(newPublication, function(err, user){
          if(err)throw err;
          var obj =  {
            success: 'publication created successfully'
          }
          res.json(obj);
      });
    }
  });
});


//add publication img
router.post('/api/addpublicationimg', function(req, res, next){
  var pubId = req.query.id; //or can be a normal req.body variable
  upload(req, res, function(err) {
    if (err) {
       res.json({"error": "somthing went wrong"});
    }
    Publication.getPublicationById(pubId, function(err, user){
      if(err)throw err;
      if(!user){
        res.json({"error": "no publication with that id"});
      }else{
        img = req.file.filename;
        Publication.setImaage(user, img, function(err, user){
            if(err)throw err;
            res.json({"success": "image for publication done"});
        });
      }
    });
  }); 
});

//create code (random)
router.get('/api/createcode', function(req, res, next){
  crypto.randomBytes(20, function(err, buf) {
    var secret = buf.toString('hex');
    var obj = {
      serect: secret
    }
    res.json(secret);
  });
});

module.exports = router;
