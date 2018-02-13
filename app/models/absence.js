var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var AbsenceSchema = new Schema({


    userId: String,
    absences: Array

});

module.exports = mongoose.model('Absence', AbsenceSchema);