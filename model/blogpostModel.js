var mongoose = require('../config/mongoose');

var blogPostSchema = mongoose.Schema({
    author: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    published: {
        type: String,
        required: true,
        default: false
    },
    createdAt: {
        type: Date, 
        required: true
    }
});

var BlogPost = module.exports = mongoose.model('blogpost', studentSchema);

