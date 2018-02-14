//#region some important things
var express = require('express');
var mongoose = require('mongoose');
var fs = require('fs');
var request = require('request');
var requestP = require('request-promise');
var cheerio = require('cheerio');
var app = express();
var bodyParser = require('body-parser');
var cheerioTableparser = require('cheerio-tableparser');
var path = require('path');
var session = require('express-session');
var Absence = require('./app/models/absence');
var Note = require('./app/models/note');
var NoteR = require('./app/models/note-rattrapage');
var Credit = require('./app/models/credit');
var NoteLang = require('./app/models/noteLangue');
var ResultatP = require('./app/models/resultat-principale');
var ResultatR = require('./app/models/resultat-rattrapage');
var viewStateval;
var eventValidation;
var viewStategen;
var plus = encodeURIComponent('+');
var login = require('./app/Auth-request');
var test;
//#endregion
// BASE SETUP
// =============================================================================



mongoose.connect('mongodb://khmaies:4sim3@ds046667.mlab.com:46667/espritapp').then(
    () => {
        /** ready to use. The `mongoose.connect()` promise resolves to undefined. */
        console.log('connected to db');
    },
    err => {
        /** handle initial connection error */
        console.log(err, 'connect to db error');

    }
); // connect to our database



// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
// configure app to use session
app.use(session({
    resave: false, //don't save session if unmodified
    saveUninitialized: false, //don't create session until something stored
    secret: 'shhhh, very secret'
}));

//Session-presisted message middleware


// ROUTES FOR OUR API
// =============================================================================
var router = express.Router(); // get an instance of the express Router


//Session-presisted message middleware
// middleware to use for all requests
router.use(function (req, res, next) {
    var err = req.session.error;
    var msg = req.session.success;
    delete req.session.error;
    delete req.session.success;
    res.locals.message = '';
    if (err) res.send(err);
    if (msg) res.send(msg);

    // do logging
    console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
    });


//middleware
function restrict(req, res, next) {

    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied';
        console.log('restricted area');
        res.redirect('/api/');
    }
    }

//route with restricted middleware
router.get('/restricted', restrict, function (req, res) {

    res.send('Wahoo! restricted area');
    });

router.get('/', restrict,function (req, res) {
    res.json({
        message: 'hooray! welcome to our api!'
    });
    });



//login route /login?cin='your cin or id'&password='your password'
router.post('/login', function (req, res) {

    //will log you in to esprit-tn.com so you can access your data (accessed at POST http://localhost:8081/api/login)
    //accepts query parametres cin and password

    login.setCIN(req.query.cin).then(function () {
        login.setPassword(req.query.password).then(function (credentiel) {

            login.appAuth(req.query.cin, req.query.password, function (err, user) {
                if (user) {
                    req.session.regenerate(function () {
                        req.session.user = user;
                        res.send(credentiel.name + ' ' + credentiel.grade);
                    });
                } else {
                    login.createUser(req.query.cin, req.query.password, credentiel.name, credentiel.grade).then(function (rep) {
                        login.appAuth(req.query.cin, req.query.password, function (err, user) {
                            if (user) {
                                req.session.regenerate(function () {
                                    req.session.user = user;
                                    res.send(credentiel.name, credentiel.grade);
                                });
                            } else {

                                console.log('auth error');
                                res.send(err);
                            }

                        });
                    }).catch(function (err) {
                        console.log('creating user err', err);
                        res.send(err);
                    });

                }

            });
        }).catch(function (err) {

            res.send(err);
        });
    }).catch(function (err) {

        res.send(err);
    });

    });

// resultat rattrapage route
router.route('/resultatrattrapage')
    .post(restrict, function (req, res) {
        // create 'resultat' (accessed at POST http://localhost:8081/api/resultatrattrapage)


        var userId = req.session.user;

        var data;
        url = 'https://esprit-tn.com/ESPONLINE/Etudiants/https://esprit-tn.com/ESPONLINE/Etudiants/ResultatRattrapage.aspx.aspx';


        requestP({
            url: url,
            rejectUnauthorized: false,
            jar: true,
            method: "get"
        }).then(function (response) {


            var $ = cheerio.load(response);
            var verif = $('script').get()[0].children[0];
            if (verif) {
                res.json({
                    error: "Problème Administratif, Veuillez contacter le service compétent"
                });
                return;
            }
            cheerioTableparser($);
            data = $('#ContentPlaceHolder1_GridView2').parsetable(true, true, true);
            // console.log(data);
            // res.send(data);
            if (data.length > 0) {
                var unite = data[0];
                var ects = data[1];
                var moyenneUE = data[2];
                var module = data[3];
                var coef = data[4];
                var moyenneM = data[5];
                var unite2 = [];
                var resultat = {
                    "resultats": []
                };

                var resultat2;
                var previousIndex = 0;

                for (var i = 1, len = module.length; i < len; i++) {
                    if (unite2.indexOf(unite[i]) > -1) {
                        console.log('Duplicate unite', previousIndex);
                        resultat.resultats[previousIndex - 1].module.push(module[i]);
                        resultat.resultats[previousIndex - 1].coef.push(coef[i]);
                        resultat.resultats[previousIndex - 1].moyenneM.push(moyenneM[i]);



                    } else {
                        previousIndex++;
                        console.log('New unite', previousIndex);

                        resultat2 = {
                            unite: String,
                            ects: String,
                            moynneUE: String,
                            module: [],
                            coef: [],
                            moyenneM: []
                        };
                        resultat2.unite = unite[i];
                        resultat2.ects = ects[i];
                        resultat2.moynneUE = moyenneUE[i];
                        resultat2.module.push(module[i]);
                        resultat2.coef.push(coef[i]);
                        resultat2.moyenneM.push(moyenneM[i]);
                        unite2.push(unite[i]);
                        resultat.resultats.push(resultat2);

                    }

                }
                ResultatR.findOne({
                    userId: req.session.user
                }, function (err, resultatp) {
                    if (err)
                        res.send(err);

                    if (resultatp) {
                        if (resultatp.resultat[0].length != resultat.resultats.length) {

                            ResultatR.remove({
                                userId: req.session.user
                            }, function (err) {
                                if (err)
                                    res.json({
                                        error: 'cant update database'
                                    });

                                var resultatR = new ResultatR();
                                resultatR.userId = userId;
                                resultatR.resultat.push(resultat.resultats);

                                resultatR.save(function (err) {
                                    if (err) {
                                        res.json({
                                            error: err
                                        });
                                    }
                                    res.json({
                                        message: 'resultat saved'
                                    });
                                });
                            });
                        } else {
                            res.json({
                                message: 'nothing to add'
                            });
                        }
                    } else {
                        var resultatR = new ResultatR();
                        resultatR.userId = userId;
                        resultatR.resultat.push(resultat.resultats);

                        resultatR.save(function (err) {
                            if (err) {
                                res.json({
                                    error: err
                                });
                            }
                            res.json({
                                message: 'resultat saved'
                            });
                        });
                    }
                });

            } else res.json({
                error: 'not connected'
            });
        }).catch(function (err) {
            console.log(err);

            res.send(err);
        });







    }).get(restrict, function (req, res) {
        //will get the 'notes des langues' from the mongodb (accessed at GET http://localhost:8081/api/notelang)
        ResultatR.findOne({
            userId: req.session.user
        }, function (err, resultatp) {
            if (err)
                res.json({
                    error,
                    err
                });

            res.json({
                'resultat principale': resultatp.resultat[0]
            });
        });
    });

//resultat principale route
router.route('/resultatprincipale')
    .post(restrict, function (req, res) {
        // create 'resultat' (accessed at POST http://localhost:8081/api/resultatprincipale)


        var userId = req.session.user;

        var data;
        url = 'https://esprit-tn.com/ESPONLINE/Etudiants/ResultatPrincipale.aspx';


        requestP({
            url: url,
            rejectUnauthorized: false,
            jar: true,
            method: "get"
        }).then(function (response) {


            var $ = cheerio.load(response);
            var verif = $('script').get()[0].children[0];
            if (verif) {
                res.json({
                    error: "Problème Administratif, Veuillez contacter le service compétent"
                });
                return;
            }
            cheerioTableparser($);
            data = $('#ContentPlaceHolder1_GridView2').parsetable(true, true, true);
            // console.log(data);
            // res.send(data);
            if (data.length > 0) {
                var unite = data[0];
                var ects = data[1];
                var moyenneUE = data[2];
                var module = data[3];
                var coef = data[4];
                var moyenneM = data[5];
                var unite2 = [];
                var resultat = {
                    "resultats": []
                };

                var resultat2;
                var previousIndex = 0;

                for (var i = 1, len = module.length; i < len; i++) {
                    if (unite2.indexOf(unite[i]) > -1) {
                        console.log('Duplicate unite', previousIndex);
                        resultat.resultats[previousIndex - 1].module.push(module[i]);
                        resultat.resultats[previousIndex - 1].coef.push(coef[i]);
                        resultat.resultats[previousIndex - 1].moyenneM.push(moyenneM[i]);



                    } else {
                        previousIndex++;
                        console.log('New unite', previousIndex);

                        resultat2 = {
                            unite: String,
                            ects: String,
                            moynneUE: String,
                            module: [],
                            coef: [],
                            moyenneM: []
                        };
                        resultat2.unite = unite[i];
                        resultat2.ects = ects[i];
                        resultat2.moynneUE = moyenneUE[i];
                        resultat2.module.push(module[i]);
                        resultat2.coef.push(coef[i]);
                        resultat2.moyenneM.push(moyenneM[i]);
                        unite2.push(unite[i]);
                        resultat.resultats.push(resultat2);

                    }

                }
                ResultatP.findOne({
                    userId: req.session.user
                }, function (err, resultatp) {
                    if (err)
                        res.send(err);

                    if (resultatp) {
                        if (resultatp.resultat[0].length != resultat.resultats.length) {

                            ResultatP.remove({
                                userId: req.session.user
                            }, function (err) {
                                if (err)
                                    res.json({
                                        error: 'cant update database'
                                    });

                                var resultatP = new ResultatP();
                                resultatP.userId = userId;
                                resultatP.resultat.push(resultat.resultats);

                                resultatP.save(function (err) {
                                    if (err) {
                                        res.json({
                                            error: err
                                        });
                                    }
                                    res.json({
                                        message: 'resultat saved'
                                    });
                                });
                            });
                        } else {
                            res.json({
                                message: 'nothing to add'
                            });
                        }
                    } else {
                        var resultatP = new ResultatP();
                        resultatP.userId = userId;
                        resultatP.resultat.push(resultat.resultats);

                        resultatP.save(function (err) {
                            if (err) {
                                res.json({
                                    error: err
                                });
                            }
                            res.json({
                                message: 'resultat saved'
                            });
                        });
                    }
                });

            } else res.json({
                error: 'not connected'
            });
        }).catch(function (err) {
            console.log(err);

            res.send(err);
        });







    }).get(restrict, function (req, res) {
        //will get the 'notes des langues' from the mongodb (accessed at GET http://localhost:8081/api/notelang)
        ResultatP.findOne({
            userId: req.session.user
        }, function (err, resultatp) {
            if (err)
                res.json({
                    error,
                    err
                });

            res.json({
                'resultat principale': resultatp.resultat[0]
            });
        });
    });
//note langues route
router.route('/notelang')
    // create 'notes langues' (accessed at POST http://localhost:8081/api/notelang)

    .post(restrict, function (req, res) {

        var userId = req.session.user;

        var data;
        url = 'https://esprit-tn.com/ESPONLINE/Etudiants/LANG2.aspx';


        requestP({
            url: url,
            rejectUnauthorized: false,
            jar: true,
            method: "get"
        }).then(function (response) {


            var $ = cheerio.load(response);
            var verif = $('script').get()[0].children[0];
            if (verif) {
                res.json({
                    error: "Problème Administratif, Veuillez contacter le service compétent"
                });
                return;
            }
            cheerioTableparser($);
            data = $('#ContentPlaceHolder1_GridView2').parsetable(true, true, true);

            if (data) {

                NoteLang.findOne({
                    userId: req.session.user
                }, function (err, notelang) {
                    if (err)
                        res.send(err);

                    if (notelang) {

                        if ((notelang.francais != data[0][1]) && (notelang.anglais != data[1][1])) {

                            NoteLang.remove({
                                userId: req.session.user
                            }, function (err) {
                                if (err)
                                    res.json({
                                        error: 'cant update database'
                                    });

                                var noteL = new NoteLang();
                                noteL.userId = userId;
                                noteL.francais = data[0][1];
                                noteL.anglais = data[1][1];

                                noteL.save(function (err) {
                                    if (err) {
                                        res.json({
                                            error: err
                                        });
                                    }
                                    res.json({
                                        message: 'Notes Langues saved'
                                    });
                                });
                            });
                        } else res.json({
                            message: 'no new data to add'
                        });
                    } else {
                        var noteL = new NoteLang();
                        noteL.userId = userId;
                        noteL.francais = data[0][1];
                        noteL.anglais = data[1][1];

                        noteL.save(function (err) {
                            if (err) {
                                res.json({
                                    error: err
                                });
                            }
                            res.json({
                                message: 'Notes Langues saved'
                            });
                        });
                    }
                });




            } else res.json({
                error: 'no data'
            });

        }).catch(function (err) {
            console.log(err);

            res.send(err);
        });



    }).get(restrict, function (req, res) {

        //will get the 'notes des langues' from the mongodb (accessed at GET http://localhost:8081/api/notelang)
        NoteLang.findOne({
            userId: req.session.user
        }, function (err, noteLang) {
            if (err)
                res.json({
                    error: err
                });

            res.json({
                'note langue': noteLang
            });
        });

    });


// credit route
router.route('/credit')
    // create 'credit' (accessed at POST http://localhost:8081/api/credit)

    .post(restrict, function (req, res) {

        var userId = req.session.user;

        var data;
        url = 'https://esprit-tn.com/ESPONLINE/Etudiants/Historique_Crédit.aspx';


        requestP({
            url: url,
            rejectUnauthorized: false,
            jar: true,
            method: "get"
        }).then(function (response) {


            var $ = cheerio.load(response);
            cheerioTableparser($);
            data = $('#ContentPlaceHolder1_GridView1').parsetable(true, true, true);
            if (data.length > 0) {
                var annee = data[0];
                var unite = data[1];
                var moyenneU = data[2];
                var module = data[3];
                var moyenneM = data[4];
                var credit = {
                    "credit": []
                };

                var credit2;
                for (var i = 1; i < module.length; i++) {

                    credit2 = {
                        annee: "",
                        unite: "",
                        moyenne_unite: "",
                        module: "",
                        moyenne_module: ""

                    };
                    credit2.annee = annee[i];
                    credit2.unite = unite[i];
                    credit2.moyenne_unite = moyenneU[i];
                    credit2.module = module[i];
                    credit2.moyenne_module = moyenneM[i];

                    credit.credit.push(credit2);
                }

                Credit.findOne({
                    userId: req.session.user
                }, function (err, credits) {
                    if (err)
                        res.send(err);

                    if (credits) {

                        if (credits.credit[0].length < credit.credit.length) {

                            Credit.remove({
                                userId: req.session.user
                            }, function (err) {
                                if (err)
                                    res.json({
                                        error: 'cant update database'
                                    });

                                var credits = new Credit();
                                credits.userId = userId;
                                credits.credit.push(credit.credit);

                                credits.save(function (err) {
                                    if (err) {
                                        res.json({
                                            error: err
                                        });
                                    }
                                    res.json({
                                        message: 'Credit saved'
                                    });
                                });
                            });
                        } else res.json({
                            message: 'no new data to add'
                        });
                    } else {
                        var credits = new Credit();
                        credits.userId = userId;
                        credits.credit.push(credit.credit);

                        credits.save(function (err) {
                            if (err) {
                                res.json({
                                    error: err
                                });
                            }
                            res.json({
                                message: 'credits saved'
                            });
                        });
                    }
                });




            } else res.json({
                error: 'not connected'
            });
        }).catch(function (err) {
            console.log(err);

            res.send(err);
        });



    }).get(restrict, function (req, res) {

        //will get the 'credit' from the mongodb (accessed at GET http://localhost:8081/api/creadit)
        Note.findOne({
            userId: req.session.user
        }, function (err, credits) {
            if (err)
                res.send(err);

            res.json({
                credits: credits.credit[0]
            });
        });

    });



//note route
router.route('/note')
    // create grade (accessed at POST http://localhost:8081/api/note)

    .post(restrict, function (req, res) {


        var userId = req.session.user;

        var data;
        url = 'https://esprit-tn.com/ESPONLINE/Etudiants/Resultat.aspx';


        requestP({
            url: url,
            rejectUnauthorized: false,
            jar: true,
            method: "get"
        }).then(function (response) {


            var $ = cheerio.load(response);
            var verif = $('script').get()[0].children[0];
            if (verif) {
                res.json({
                    error: "Problème Administratif, Veuillez contacter le service compétent"
                });
                return;
            }
            cheerioTableparser($);
            data = $('#ContentPlaceHolder1_GridView1').parsetable(true, true, true);
            if (data.length > 0) {
                var module = data[0];
                var enseignant = data[1];
                var coef = data[2];
                var noteTp = data[3];
                var noteCc = data[4];
                var noteExam = data[5];
                var grade = {
                    "grade": []
                };

                var grade2;
                for (var i = 1; i < module.length; i++) {

                    grade2 = {
                        module: "",
                        enseignant: "",
                        coef: "",
                        noteTp: "",
                        noteCc: "",
                        noteExam: ""

                    };
                    grade2.module = module[i];
                    grade2.enseignant = enseignant[i];
                    grade2.coef = coef[i];
                    grade2.noteTp = noteTp[i];
                    grade2.noteCc = noteCc[i];
                    grade2.noteExam = noteExam[i];
                    grade.grade.push(grade2);
                }

                Note.findOne({
                    userId: req.session.user
                }, function (err, notes) {
                    if (err)
                        res.send(err);

                    if (notes) {

                        if (notes.notes[0].length < abs.abs.length) {

                            Note.remove({
                                userId: req.session.user
                            }, function (err) {
                                if (err)
                                    res.json({
                                        error: 'cant update database'
                                    });

                                var note = new Notes();
                                note.userId = userId;
                                note.notess.push(grade.grade);

                                note.save(function (err) {
                                    if (err) {
                                        res.json({
                                            error: err
                                        });
                                    }
                                    res.json({
                                        message: 'grades saved'
                                    });
                                });
                            });
                        } else res.json({
                            message: 'no new data to add'
                        });
                    } else {
                        var note = new Note();
                        note.userId = userId;
                        note.notes.push(grade.grade);

                        note.save(function (err) {
                            if (err) {
                                res.json({
                                    error: err
                                });
                            }
                            res.json({
                                message: 'grades saved'
                            });
                        });
                    }
                });




            } else res.json({
                error: 'not connected'
            });
        }).catch(function (err) {
            console.log(err);

            res.send(err);
        });




    }).get(restrict, function (req, res) {
        //will get the grades from the mongodb (accessed at GET http://localhost:8081/api/absence)
        Note.findOne({
            userId: req.session.user
        }, function (err, notes) {
            if (err)
                res.send(err);

            res.json({
                notes: notes.notes[0]
            });
        });
    });

//note rattrapage route
router.route('/noterattrapage')
    // create grade (accessed at POST http://localhost:8081/api/note)

    .post(restrict, function (req, res) {


        var userId = req.session.user;

        var data;
        url = 'https://esprit-tn.com/ESPONLINE/Etudiants/noterat.aspx';


        requestP({
            url: url,
            rejectUnauthorized: false,
            jar: true,
            method: "get"
        }).then(function (response) {


            var $ = cheerio.load(response);
            var verif = $('script').get()[0].children[0];
            if (verif) {
                res.json({
                    error: "Problème Administratif, Veuillez contacter le service compétent"
                });
                return;
            }
            cheerioTableparser($);
            data = $('#ContentPlaceHolder1_GridView2').parsetable(true, true, true);
            if (data.length > 0) {
                var module = data[0];
                var enseignant = data[1];
                var coef = data[2];
                var noteTp = data[3];
                var noteCc = data[4];
                var noteExam = data[5];
                var grade = {
                    "grade": []
                };

                var grade2;
                for (var i = 1; i < module.length; i++) {

                    grade2 = {
                        module: "",
                        enseignant: "",
                        coef: "",
                        noteTp: "",
                        noteCc: "",
                        noteExam: ""

                    };
                    grade2.module = module[i];
                    grade2.enseignant = enseignant[i];
                    grade2.coef = coef[i];
                    grade2.noteTp = noteTp[i];
                    grade2.noteCc = noteCc[i];
                    grade2.noteExam = noteExam[i];
                    grade.grade.push(grade2);
                }

                NoteR.findOne({
                    userId: req.session.user
                }, function (err, notes) {
                    if (err)
                        res.send(err);

                    if (notes) {

                        if (notes.notes[0].length < abs.abs.length) {

                            Note.remove({
                                userId: req.session.user
                            }, function (err) {
                                if (err)
                                    res.json({
                                        error: 'cant update database'
                                    });

                                var noteR = new NoteR();
                                noteR.userId = userId;
                                noteR.notes.push(grade.grade);

                                noteR.save(function (err) {
                                    if (err) {
                                        res.json({
                                            error: err
                                        });
                                    }
                                    res.json({
                                        message: 'grades saved'
                                    });
                                });
                            });
                        } else res.json({
                            message: 'no new data to add'
                        });
                    } else {
                        var noteR = new NoteR();
                        noteR.userId = userId;
                        noteR.notes.push(grade.grade);

                        noteR.save(function (err) {
                            if (err) {
                                res.json({
                                    error: err
                                });
                            }
                            res.json({
                                message: 'grades saved'
                            });
                        });
                    }
                });




            } else res.json({
                error: 'not connected'
            });
        }).catch(function (err) {
            console.log(err);

            res.send(err);
        });




    }).get(restrict, function (req, res) {
        //will get the grades from the mongodb (accessed at GET http://localhost:8081/api/absence)
        NoteR.findOne({
            userId: req.session.user
        }, function (err, notes) {
            if (err)
                res.send(err);

            res.json({
                notes: notes.notes[0]
            });
        });
    });
//absence route
router.route('/absence')

    // create a absence (accessed at POST http://localhost:8081/api/absence)

    .post(restrict, function (req, res) {

        var userId = req.session.user;

        var data;
        url = 'https://esprit-tn.com/ESPONLINE/Etudiants/absenceetud.aspx';


        requestP({
            url: url,
            rejectUnauthorized: false,
            jar: true,
            method: "get"
        }).then(function (response) {
            var $ = cheerio.load(response);
            cheerioTableparser($);
            data = $('#ContentPlaceHolder1_GridView2').parsetable(true, true, true);
            if (data.length > 0) {
                var date = data[0];
                var seance = data[1];
                var module = data[2];
                var justification = data[3];
                var abs = {
                    "abs": []
                };

                var abs2;
                for (var i = 1; i < date.length; i++) {

                    abs2 = {
                        module: "tttt",
                        date: "",
                        seance: "",
                        justification: ""

                    };
                    abs2.module = module[i];
                    abs2.date = date[i];
                    abs2.seance = seance[i];
                    abs2.justification = justification[i];
                    abs.abs.push(abs2);
                }

                Absence.findOne({
                    userId: req.session.user
                }, function (err, absences) {
                    if (err)
                        res.send(err);

                    if (absences) {
                        if (absences.absences[0].length < abs.abs.length) {

                            Absence.remove({
                                userId: req.session.user
                            }, function (err) {
                                if (err)
                                    res.json({
                                        error: 'cant update database'
                                    });

                                var absence = new Absence();
                                absence.userId = userId;
                                absence.absences.push(abs.abs);

                                absence.save(function (err) {
                                    if (err) {
                                        res.json({
                                            error: err
                                        });
                                    }
                                    res.json({
                                        message: 'abs saved'
                                    });
                                });
                            });
                        } else res.json({
                            message: 'no new data to add'
                        });
                    } else {

                        var absence = new Absence();
                        absence.userId = userId;
                        absence.absences.push(abs.abs);

                        absence.save(function (err) {
                            if (err) {
                                res.json({
                                    error: err
                                });
                            }
                            res.json({
                                message: 'abs saved'
                            });
                        });

                    }
                });




            } else res.json({
                error: 'not connected'
            });
        }).catch(function (err) {
            console.log(err);

            res.send(err);
        });






    }).get(restrict, function (req, res) {
        //will get the absences from the mongodb (accessed at GET http://localhost:8081/api/absence)
        Absence.findOne({
            userId: req.session.user
        }, function (err, absences) {
            if (err)
                res.send(err);

            res.json({
                absences: absences.absences[0]
            });
        });
    });







app.use('/api', router);
app.get('',function(req,res){
res.send('Welcome to esprit api! to login go to /login');
});
app.listen(process.env.PORT || 8081)
console.log('Magic happens on port 8081');

exports = module.exports = app;