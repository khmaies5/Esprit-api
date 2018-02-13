var express = require('express');
var fs = require('fs');
var request = require('request');
var requestP = require('request-promise');
var cheerio = require('cheerio');
var app = express();
var bodyParser = require('body-parser');
var User = require('./models/user');
var bkfd2Password = require("pbkdf2-password");
var hasher = bkfd2Password();
var viewStateval;
var eventValidation;
var viewStategen;
var test;


/**
  var options = {
uri: 'http://www.google.com',
transform: function (body) {
  return cheerio.load(body);
}
};

rp(options)
.then(function ($) {
  // Process html like you would with jQuery...
})
.catch(function (err) {
  // Crawling failed or Cheerio choked...
}); 

   */





module.exports = {

  setCIN: function (cin) {
    var options = {
      rejectUnauthorized: false,
      uri: 'https://esprit-tn.com/esponline/online/default.aspx',
      transform: function (body) {
        return cheerio.load(body);
      }
    };
    return new Promise(function (resolve, reject) {

      requestP(options)
        .then(function ($) {
          // Process html like you would with jQuery...

          //getting hidden input values
          viewStateval = $("#__VIEWSTATE").val();
          eventValidation = $("#__EVENTVALIDATION").val();
          viewStategen = $('#__VIEWSTATEGENERATOR').val();


          //sending cin form
          var settings = {

            rejectUnauthorized: false,
            url: "https://esprit-tn.com/esponline/online/default.aspx",
            method: "POST",
            json: true,
            jar: true,
            formData: {
              __VIEWSTATE: viewStateval,
              __VIEWSTATEGENERATOR: viewStategen,
              __EVENTVALIDATION: eventValidation,
              ctl00$ContentPlaceHolder1$TextBox3: cin,
              ctl00$ContentPlaceHolder1$Button3: "Suivant"
            }
          };

          requestP(settings).then(function (html) {
            //getting view state from password
            var $ = cheerio.load(html);

            viewStateval = $("#__VIEWSTATE").val();

            eventValidation = $("#__EVENTVALIDATION").val();
            viewStategen = $('#__VIEWSTATEGENERATOR').val();



            var $ = cheerio.load(html);
            var verif = $('script').get()[0].children[0];
            if (verif) {
              reject("cin incorrect");
            } else resolve();

          }).catch(function (err) {

            reject(err);
            console.log("getting view state from password error", err);
          });




        })
        .catch(function (err) {
          // Crawling failed or Cheerio choked...
          reject(err);
          console.log("getting veiwstate error", err);
        });




    });

  },




  setPassword: function (password) {

    //sending password
    var options = {
      followAllRedirects: true,
      rejectUnauthorized: false,
      url: "https://esprit-tn.com/esponline/online/default.aspx",
      method: "POST",
      json: true,
      jar: true,

      formData: {
        __VIEWSTATE: viewStateval,
        __VIEWSTATEGENERATOR: viewStategen,
        __EVENTVALIDATION: eventValidation,
        ctl00$ContentPlaceHolder1$TextBox7: password,
        ctl00$ContentPlaceHolder1$ButtonEtudiant: "Connexion"
      }

    };

    return promise = new Promise(function (resolve, reject) {


      requestP(options).then(function (htmlString) {

        // test = htmlString;

        var $ = cheerio.load(htmlString);
        var verif = $('script').get()[0].children[0];
        var name;
        var grade;
        if (verif) {
          reject("password incorrect");
        } else {

          name = $('#Label2').text();
          grade = $('#Label3').text();
          var credentiel = {
            name: name,
            grade: grade
          };
          resolve(credentiel);
          console.log($('#Label3').text());
        }


      }).catch(function (err) {

        //var $ = cheerio.load(err.body);
        //console.log

        reject(err);
        console.log("error submit password", err);
      });


    });

  },

  // when you create a user, generate a salt
  // and hash the password ('foobar' is the pass here)
  createUser: function (username, password, name, grade) {


    return promise = new Promise(function (resolve, reject) {


      hasher({
        password: password
      }, function (err, pass, salt, hash) {

        if (err) {
          console.log('hash', err);
          reject('hashing err');
        }


        //store the salt & hash in the db
        var user = new User({
          username: username,
          salt: salt,
          hash: hash,
          name: name,
          grade,
          grade
        });

        console.log(pass);
        user.save(function (err) {
          if (err) {
            reject(err);
            console.log('saving user err', err);
          }
          resolve('user saved');
          console.log('user saved');
        });
      });



    });



  },

  appAuth: function (name, pass, fn) {

    User.findOne({
      username: name
    }, function (err, user) {
      // query the db for the given username
      if (!user) return fn(new Error('cannot find user'));
      // apply the same algorithm to the posted password, applying
      // the hash against the pass / salt, if there is a match we
      // found the user
      hasher({
        password: pass,
        salt: user.salt
      }, function (err, pass, salt, hash) {


        if (err) return fn(err);
        if (hash == user.hash) return fn(null, user);
        fn(new Error('invalid password'));
      })
    })
  }

}