import express from 'express';
import bodyParser from 'body-parser';
import ejs from 'ejs';
import mongoose, { Schema } from 'mongoose';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import md5 from 'md5';
import {MongoClient} from 'mongodb';
import session from 'express-session';
import {UserModel, MotherModel, UniqueIdModel, fsFileModel} from './models.js';
import filter from 'content-filter';
import sanitize from 'mongo-sanitize';
import multer from 'multer';
import {GridFsStorage} from 'multer-gridfs-storage';
import {login} from './controllers.js';
import fs from 'fs';
import { uploadFile, downloadFile, createSharedLink, dbx } from './dropbox.js';

const port = 8080;
const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Add this line to parse JSON data
export const connURL = "mongodb+srv://admin-hector:test123@freetest1.8lywiq7.mongodb.net/?retryWrites=true&w=majority"
import routes from './routes.js';
app.use(filter());


mongoose.connect(connURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true});

const conn = mongoose.connection;

conn.on('error', console.error.bind(console, 'MongoDB connection error:'));
conn.once('open', () => {
    console.log('Connected to MongoDB');
});
const date = new Date();


var storage = new GridFsStorage({
    
    url: 'mongodb+srv://admin-hector:test123@freetest1.8lywiq7.mongodb.net/?retryWrites=true&w=majority',

    file: function(req, file) {
        //console.log(req);
        const userId = req.session.userId;

        //console.log(fullQuery);
        return {
            bucketName: 'pdfs',
            filename: userId +'-' + file.originalname,
            
        };
    }
});

var upload = multer({ storage });

app.use(
    session({
      secret: 'oQDG41aVWyY9ljqIcf4NHurd3BoRuufV', // Replace with your secret key
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );
  app.use(routes);
  app.set('view engine', 'ejs');

  // Function to generate a new unique ID for a specific collection
export  async function generateUniqueId(collectionName) {
    var S_collectionName = sanitize(collectionName);
    const query = { collectionName: S_collectionName };
    const update = { $inc: { lastId: 1 } };
    const options = { upsert: true, new: true };
    const result = await UniqueIdModel.findOneAndUpdate(query, update, options);
    return result.lastId;
  }

export async function deleteDoc(motherName){
    var S_motherName = sanitize(motherName);
    try{
        await mongoose.connect(`${connURL}`);
        await MotherModel.findOneAndDelete({ name: S_motherName });
    }catch(error){
        console.log(error)
    }
}
export async function updateDoc(motherID, updatedNote) {
    var S_motherID = sanitize(motherID);
    var S_updatedNote = sanitize(updatedNote);
    try {
        await mongoose.connect(`${connURL}`);
        const filter = { _id: S_motherID };
        const update = { $set: { notes: [S_updatedNote] } };

        const result = await MotherModel.findOneAndUpdate(filter, update);

        if (result) {
            console.log(`Successfully updated notes for ${motherID}`);
        } else {
            console.log(`Mother ${motherID} not found in the database.`);
        }
    } catch (error) {
        console.error('Error updating document:', error);
    }
};

export async function insertDoc(userId, motherName, note) {
    var S_userId = sanitize(userId);
    var S_motherName = sanitize(motherName);
    var S_note = sanitize(note);

    await mongoose.connect(`${connURL}`);
    const insertDoc = new MotherModel({
        mom_id: `user_${S_userId}`,
        name: S_motherName,
        notes: S_note
    });

    await insertDoc.save(); // Wait for the document to be saved before rendering
}

export function generateUniqueToken() {
  const tokenLength = 32;
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';

  for (let i = 0; i < tokenLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    token += characters.charAt(randomIndex);
  }

  return token;
}

app.post('/uploadfile', upload.single('myFile'), (req, res) => {
    const file = req.file;
    const userId = req.session.userId;

    if (!file) {
      res.render(__dirname + '/views/status/noFile.ejs');
    }else {
        (async () => {
            const folderPath = '/DoulaFocus';
            try {
              const uploadedFile = await uploadFile(file, `/DoulaFocus/`+userId+date+`-${file.originalname}`);
              console.log('Uploaded file:', uploadedFile);
          
              const downloadedFile = await downloadFile(`/DoulaFocus/`+userId+date+`-${file.originalname}`);
              console.log('Downloaded file:', downloadedFile);


              //console.log(file); 
              //console.log(req);
 
              const sharedLinkUrl = await createSharedLink(folderPath);
                console.log(sharedLinkUrl);
            } catch (error) {
              console.error('Error:', error);
            }
          })();
    }
      res.redirect('/');
   
  })

  app.get('/auth/dropbox/callback', async (req, res) => {
    const code = req.query.code;
  
    try {
      const token = await dbx.auth.getAccessTokenFromCode('http://localhost:8080/auth/dropbox/callback', code);
      console.log('Access token:', token);
      // You can now use the token to make API calls on behalf of the user.
    } catch (error) {
      console.error('Error exchanging code for token:', error);
    }
  
    res.send('Authorization complete. You can close this tab.');
  });

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    process.exit(0); 
});
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
