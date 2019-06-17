const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const cookieParser = require('cookie-parser')();

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();
const app = express();
const main = express();

app.use(cors({ origin: true }));
app.use(cookieParser);
main.use('/api/v1', app);
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: false }));

exports.webApi = functions.https.onRequest(main);



// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const validateUser = async (req, res, next) => {
    //console.log('Check if request is authorized with Firebase ID token');
  
    if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
        !(req.cookies && req.cookies.__session)) {
      console.error('No Firebase ID token was passed as a Bearer token in the Authorization header.',
          'Make sure you authorize your request by providing the following HTTP header:',
          'Authorization: Bearer <Firebase ID Token>',
          'or by passing a "__session" cookie.');
      res.status(403).send('Unauthorized');
      return;
    }
  
    let idToken;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      //console.log('Found "Authorization" header');
      // Read the ID Token from the Authorization header.
      idToken = req.headers.authorization.split('Bearer ')[1];
    } else if(req.cookies) {
      //console.log('Found "__session" cookie');
      // Read the ID Token from cookie.
      idToken = req.cookies.__session;
    } else {
      // No cookie
      res.status(403).send('Unauthorized');
      return;
    }
  
    try {
      const decodedIdToken = await admin.auth().verifyIdToken(idToken);
      //console.log('ID Token correctly decoded', decodedIdToken);
      req.user = decodedIdToken;
      next();
      return;
    } catch (error) {
      //console.error('Error while verifying Firebase ID token:', error);
      res.status(403).send('Unauthorized');
      return;
    }
  };




// Auth APIs




app.post('/signup', (req, res) => {
    if(!req.body.email) {
        res.status(400).send({
            message: "email is required"
        })
    }
    if(!req.body.password) {
        res.status(400).send({
            message: "password is required"
        })
    }
    admin.auth().createUser({
        email: req.body.email,
        emailVerified: false,
        password: req.body.password,
        disabled: false
    })
    .then(userRecord => {
        // See the UserRecord reference doc for the contents of userRecord.
        res.status(200).send({ 
            id: userRecord.uid
        })
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured when creating a user " + err
        })
    });
});
app.post('/login', (req, res) => {
    if(!req.body.email) {
        res.status(400).send({
            message: "email is required"
        })
    }
    if(!req.body.password) {
        res.status(400).send({
            message: "password is required"
        })
    }
    // Looks like neither firebase-functions and firebase-admin do not provide an auth function
    // So.. we hit the REST api. 
    axios.post(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${functions.config().project.webkey}`, {
        email: req.body.email,
        password: req.body.password,
        returnSecureToken: true
    })
    .then((response) => {
        res.status(200).send(response.data)
    })
    .catch((err) => {
        res.status(400).send({
            message: "An error has occured authenticating this user " + err.message
        })
    });
})
app.post('/refreshIdToken', (req, res) =>{
    if(!req.body.refresh_token) {
        res.status(400).send({
            message: "refresh_token is required"
        })
    }
    axios.post(`https://securetoken.googleapis.com/v1/token?key=${functions.config().project.webkey}`, {
        grant_type: 'refresh_token',
        refresh_token: req.body.refresh_token
    })
    .then((response) => {
        res.status(200).send(response.data)
    })
    .catch((err) => {
        res.status(400).send({
            message: "An error has occured authenticating this user " + err.message
        })
    });
})





// CRUD Postings




// Add new posting
app.post('/postings', (req, res) => {
    req.body.createdAt = admin.firestore.FieldValue.serverTimestamp()
    db.collection('postings').add(req.body)
    .then(ref => {
        res.status(200).send({ id: ref.id })
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured when adding a posting " + err
        })
    });
})
// Get all postings
app.get('/postings', (req, res) => {
    db.collection('postings').get()
    .then(ref => {
        if (ref.empty) {
            res.status(400).send([]);
        }
        var postings = [];  
        ref.forEach(doc => {
            var data = doc.data();
            data.id = doc.id; 
            postings.push(data);
        });
        res.status(200).send(postings);
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured. " + err
        });
    });
})
// Get a posting
app.get('/postings/:postingId', validateUser, (req, res) => {
    db.collection('postings').doc(req.params.postingId).get()
    .then(ref => {
        if (ref.data()) {
            var data = ref.data();
            data.id = ref.id;
            res.status(200).send(data)
        } else {
            res.status(400).send({
                message: "Object with ID " + req.params.candidateId + " does not exist."
            });
        }
    }).catch(err => {
        res.status(400).send({
            message: "An error has occured. " + err
        });
    });
})
// Update a posting
app.put('/postings/:postingId', validateUser, (req, res) => {
    db.collection('postings').doc(req.params.postingId).update(req.body)
    .then(ref => {
        res.status(200).send(ref)
    }).catch(err => {
        res.status(400).send({
            message: "An error has occured updating the posting. " + err
        });
    });
})
// Delete a posting 
app.delete('/postings/:postingId', validateUser, (req, res) => {
    db.collection('postings').doc(req.params.postingId).delete()
    .then(ref => {
        res.status(200).send(ref)
    }).catch(err => {
        res.status(400).send({
            message: "An error has occured deleting the posting. " + err
        });
    });
})




// CRUD Candidates




// Add new candidate
app.post('/candidates', validateUser, (req, res) => {
    req.body.createdAt = admin.firestore.FieldValue.serverTimestamp()
    if (!req.body.status) req.body.status = "Inbox";
    db.collection('candidates').add(req.body)
    .then(ref => {
        res.status(200).send({ id: ref.id })
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured when adding a candidate " + err
        })
    });
})
// Get all candidates
app.get('/candidates', validateUser, (req, res) => {

    let query = db.collection('candidates').orderBy('createdAt');

    if (req.query.status) {
        status = req.query.status;
    }
    query = query.where('status', '==', status);

    if (req.query.posting) {
        query = query.where('posting', '==', req.query.posting);
    }
    if (req.query.office) {
        query = query.where('office', '==', req.query.office);
    }
    //if (req.query.name) {
    //    query = query.where('name', '>=', req.query.name).where('name', '<', req.query.name);
    //}

    console.log(query)

    query.get()
    .then(ref => {
        if (ref.empty) {
            res.status(400).send([]);
        }
        var candidates = [];  
        ref.forEach(doc => {
            var data = doc.data();
            data.id = doc.id; 
            candidates.push(data);
        });
        res.status(200).send(candidates);
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured. " + err
        });
    });
})
// Get a candidate
app.get('/candidates/:candidateId', validateUser, (req, res) => {
    db.collection('candidates').doc(req.params.candidateId).get()
    .then(ref => {
        if (ref.data()) {
            var data = ref.data();
            data.id = ref.id;
            res.status(200).send(data)
        } else {
            res.status(400).send({
                message: "Object with ID " + req.params.candidateId + " does not exist."
            });
        }
    }).catch(err => {
        res.status(400).send({
            message: "An error has occured. " + err
        });
    });
})
// Update a candidate
app.put('/candidates/:candidateId', validateUser, (req, res) => {
    db.collection('candidates').doc(req.params.candidateId).update(req.body)
    .then(ref => {
        res.status(200).send(ref)
    }).catch(err => {
        res.status(400).send({
            message: "An error has occured updating the candidate. " + err
        });
    });
})
// Delete a candidate 
app.delete('/candidates/:candidateId', validateUser, (req, res) => {
    db.collection('candidates').doc(req.params.candidateId).delete()
    .then(ref => {
        res.status(200).send(ref)
    }).catch(err => {
        res.status(400).send({
            message: "An error has occured deleting the candidate. " + err
        });
    });
})




// CRUD Notes




// Add new note
app.post('/candidates/:candidateId/notes', validateUser, (req, res) => {
    db.collection('candidates').doc(req.params.candidateId).get()
    .then(doc => {
        if (!doc.exists) {
            res.status(400).send({
                message: "Candidate does not exist."
            });
        } else {
            req.body.createdAt = admin.firestore.FieldValue.serverTimestamp()
            doc.ref.collection('notes').add(req.body)
            .then(ref => {
                res.status(200).send({ id: ref.id })
            })
            .catch(err => {
                res.status(400).send({
                    message: "An error has occured when adding a note " + err
                })
            });
        }
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured fetching the candidate. " + err
        });
    });
})
// Get all notes of a candidate
app.get('/candidates/:candidateId/notes', validateUser, (req, res) => {
    db.collection('candidates').doc(req.params.candidateId)
    .collection('notes').get()
    .then(ref => {
        if (ref.empty) {
            res.status(400).send([]);
        }
        var candidates = [];  
        ref.forEach(doc => {
            var data = doc.data();
            data.id = doc.id; 
            candidates.push(data);
        });
        res.status(200).send(candidates);
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured. " + err
        });
    });
})
// Update a note
app.put('/candidates/:candidateId/notes/:noteId', validateUser, (req, res) => {
    db.collection('candidates').doc(req.params.candidateId)
        .collection('notes').doc(req.params.noteId).update(req.body)
        .then(ref => {
            res.status(200).send(ref)
        }).catch(err => {
            res.status(400).send({
                message: "An error has occured updating the note. " + err
            });
        });
})
// Delete a note 
app.delete('/candidates/:candidateId/notes/:noteId', validateUser, (req, res) => {
    db.collection('candidates').doc(req.params.candidateId).get()
    .then(doc => {
        if (!doc.exists) {
            res.status(400).send({
                message: "Candidate does not exist."
            });
        } else {
            doc.ref.collection('notes').doc(req.params.noteId).delete()
            .then(ref => {
                res.status(200).send(ref)
            }).catch(err => {
                res.status(400).send({
                    message: "An error has occured deleting the note. " + err
                });
            });
        }
    })
    .catch(err => {
        res.status(400).send({
            message: "An error has occured fetching the candidate. " + err
        });
    });
})
