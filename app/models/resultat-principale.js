var mongoose = require('mongoose');

var Schema = mongoose.Schema;


var ResultatPrincipaleSchema = new Schema({

    userId: String,
    resultat: Array
})

module.exports = mongoose.model('ResulatatPrincipale', ResultatPrincipaleSchema);