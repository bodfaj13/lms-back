var mongoose = require('../config/mongoose');

var publicationSchema = mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    subtitle: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    img: {
        type: String
    },
    createdAt: {
        type: String, 
        required: true
    }, 
    author: {
        type: String,
        required: true
    }
});

var Publication = module.exports = mongoose.model('publications', publicationSchema);

module.exports.getPublicationById = function(id, callback){
    Publication.findById(id, callback);
}

module.exports.createPublication =  function(newPublication, callback){
    newPublication.save(callback);   
}

module.exports.findAllPublication = function(callback){
    Publication.find(callback);
}

module.exports.setImaage = function(user, img, callback){
    user.img = img;
    user.save(callback)
}



 