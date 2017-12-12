var mongoose = require('../config/mongoose');

//user schema
var courseSchema = mongoose.Schema({
    courseCode: {
        type: String,
        required: true
    },
    courseTitle: {
        type: String,
        required: true
    },
    coursePrice: {
        type: String,
        required: true
    }
   ,
   files: [{
        fileType: String,
        location: String
   }],
   vidoes: [{
        name: String,
        location: String
   }],
   rating: {
       type: Number
   },
   city: {
       type: String
   },
   createdAt: {
       type: Date,
       required: true
   },
   startingAt: {
       type: Date,
       required: true
   },
   endingAt: {
       type: Date,
       required: true
   },
   maxCapacity: {
       type: Number,
       required: true
   },
   place: {
       type: String,
       required: true
   },
   faq: [{
       type: String
   }],
   recommendations: [{
       type: String
   }]
});

var Course = module.exports = mongoose.model('courses', courseSchema);

module.exports.getCourseById = function(id, callback){
    Course.findById(id, callback);
}

module.exports.createCourse =  function(newCourse, callback){
    newCourse.save(callback);   
}

module.exports.findAllPublication = function(callback){
    Course.find(callback);
}