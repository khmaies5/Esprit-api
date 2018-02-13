var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var CreditSchema = new Schema({

    userId: String,
    credits: Array

});

module.exports = mongoose.model('Credit', CreditSchema);