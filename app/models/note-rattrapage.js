var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var NoteRattrapageSchema = new Schema({


    userId: String,
    notes: Array

});

module.exports = mongoose.model('NoteRattrapage', NoteRattrapageSchema);