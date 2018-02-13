var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var UserSchema = new Schema({
    username : String,
    salt : String,
    hash : String,
    name:String,
    grade:String
});


module.exports = mongoose.model('User',UserSchema);