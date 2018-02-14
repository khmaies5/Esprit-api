var mongoose = require('mongoose');

var Schema = mongoose.Schema;


var ResultatRattrapageSchema = new Schema({

    userId: String,
    resultat: Array
})

module.exports = mongoose.model('ResulatatRattrapage', ResultatRattrapageSchema);