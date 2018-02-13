var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var NoteSchema = new Schema({


    userId: String,
    notes: Array

});

module.exports = mongoose.model('Note', NoteSchema);