const functions = require('firebase-functions');

const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();

const app = express();
const main = express();

const postingsCollection = 'postings';

app.use(cors({ origin: true }));
main.use('/api/v1', app);
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: false }));

// webApi is your functions name, and you will pass main as 
// a parameter
exports.webApi = functions.https.onRequest(main);



// CRUD Postings
// Add new posting
app.post('/postings', (req, res) => {
    const validationError = validatePostingInput(req.body);
    if (!validationError) {
        db.collection('postings').add(req.body)
        .then(ref => {
            res.status(200).send({ id: ref.id })
        })
        .catch(err => {
            res.status(400).send({
                message: "An error has occured when adding a posting " + err
            })
        });
    } else {
        res.status(400).send({
            message: "Input is invalid. " + validationError
        });
    }
})
// Get all postings
app.get('/postings', (req, res) => {
    db.collection('postings').get()
    .then(ref => {
        if (ref.empty) {
            res.status(400).send({
                message: "No matching posting documents."
            });
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
app.get('/postings/:postingId', (req, res) => {
    db.collection('postings').doc(req.params.postingId).get()
    .then(ref => {
        var data = ref.data();
        data.id = ref.id;
        res.status(200).send(data)
    }).catch(err => {
        res.status(400).send({
            message: "An error has occured. " + err
        });
    });
})
// Update a posting
app.put('/postings/:postingId', (req, res) => {
    const validationError = validatePostingInput(req.body);
    if (!validationError) {
        db.collection('postings').doc(req.params.postingId).update(req.body)
        .then(ref => {
            res.status(200).send(ref)
        }).catch(err => {
            res.status(400).send({
                message: "An error has occured updating the posting. " + err
            });
        });
    } else {
        res.status(400).send({
            message: "Input is invalid. " + validationError
        });
    }
})
// Delete a posting 
app.delete('/postings/:postingId', (req, res) => {
    db.collection('postings').doc(req.params.postingId).delete()
    .then(ref => {
        res.status(200).send(ref)
    }).catch(err => {
        res.status(400).send({
            message: "An error has occured deleting the posting. " + err
        });
    });
})
// Validation helper function for postings
function validatePostingInput(body) {
    if (!body.jobTitle) return "Job Title cannot be empty";
    return null;
}