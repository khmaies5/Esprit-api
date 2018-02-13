var mongoose = require('mongoose');

var Schema = mongoose.Schema;


var NoteLangueSchema = new Schema({

    userId: String,
    francais: String,
    anglais:String
});


module.exports = mongoose.model('NoteLangue', NoteLangueSchema);