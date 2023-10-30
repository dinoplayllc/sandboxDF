import mongoose from "mongoose";
import {UserModel, MotherModel, fsFileModel} from './models.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { connURL } from './index.js'; 
import md5 from 'md5';
import {generateUniqueId, insertDoc, updateDoc, deleteDoc} from './index.js'
const __dirname = dirname(fileURLToPath(import.meta.url));
import { generateUniqueToken } from "./index.js";
import nodemailer from 'nodemailer';
import sanitize from 'mongo-sanitize';
import fs from 'fs';
import grid from 'gridfs-stream';
import { listSpecificFiles, getSharedLink, createSharedLink } from './dropbox.js';

mongoose.connect('mongodb+srv://admin-hector:test123@freetest1.8lywiq7.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true});

const conn = mongoose.connection;
conn.once('open', () => {
  console.log('Connected to MongoDB');
});
export const regiFailed = false;
export const regiSuc = false;
export let loggedIn = false;


export async function logout(req, res) {
    try {
        req.session.destroy(err => {
            if (err) {
                console.error('Error destroying session:', err);
            }
            // Redirect the user to the login page or another appropriate page
            res.redirect('/');
        });
    } catch (error) {
        console.log(error);
    }
 
}

export async function login(req, res){
    await mongoose.connect(`${connURL}`);
    const { userLog, passLog } = req.body;
    var S_userLog = sanitize(userLog);

    try {
      const email = await UserModel.findOne({ email: S_userLog });
      const user = await UserModel.findOne({ username: S_userLog });
      console.log(user);
      console.log(email);
      if (userLog && user && (user.password === md5(passLog))) {
   
        req.session.userId = user._id;
        req.session.loginTimestamp = Date.now();
        loggedIn = true;
        console.log(user._id);
        res.redirect('/:userID');
      } else if (userLog && email && (email.password === md5(passLog))) {
        req.session.userId = email._id;
        req.session.loginTimestamp = Date.now();
        loggedIn = true;
        console.log(email._id);
        res.redirect('/:userID');
    } else {
        // Login failed
        console.log("error");
        res.render(__dirname + '/views/status/IncorrectPass.ejs', { loggedIn: false, regiFailed:false, regiSuc:false });
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Server Error');
    }
}


export async function submit(req, res) {
    let item = req.body.note;
    let motherName = req.body.motherName;
    const userId = req.session.userId;

   if(loggedIn === false){
        res.redirect('/');
    }else {
        
    await insertDoc(userId, motherName, item); // Save the new document to the database
    res.redirect('/:userID');
    }
}

export async function register(req, res) {
    try {
        const { email, username, password, passwordVer } = req.body;

        const userId = await generateUniqueId('users');
        const md5Pass = md5(password);
        const md5PassVer = md5(passwordVer);
        const verificationToken = generateUniqueToken();
        if(md5Pass != md5PassVer){
            res.render(__dirname + '/views/status/IncorrectPass.ejs', {loggedIn:false, regiFailed:true,  regiSuc:false});
        } else {
            const newUser = new UserModel(
                {
                    _id: `user_${userId}`,
                    email,
                    username,
                    isVerified: false, 
                    verificationToken,
                    password: md5Pass
                });
    
            await newUser.save();
            
            const verificationLink = `http://doulafoucs.com/verify/${verificationToken}`;


           
            // Create a Nodemailer transporter with OAuth2
            const transporter = nodemailer.createTransport({
                host: 'smtp.office365.com',
                port: 587, // Use the correct port for Office 365 SMTP
                secure: false, // Use false if you're using a non-secure connection
                auth: {
                    user: 'admin@doulafocus.com',
                    pass: 'binah!1997A'
                }
            });
            const mailOptions = {
                from: 'admin@doulafocus.com',
                to: email,
                subject: 'Email Verification',
                text: `Please click on the following link to verify your email: ${verificationLink}`
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                    res.render(__dirname + '/views/status/emailError.ejs', { loggedIn: false, regiFailed:true, regiSuc:false, error });
                } else {
                    console.log('Email sent:', info.response);
                    res.render(__dirname + '/views/status/regSuc.ejs', { loggedIn: false, regiFailed: false, regiSuc:true });
                }
            });
    
            //res.render(__dirname + '/views/status/regSuc.ejs', {loggedIn:false, regiFailed:false});
        }

    } catch (error) {
        console.error('Registration error:', error);
        res.render(__dirname + '/views/status/regFail.ejs', {loggedIn:false, regiFailed: true, regiSuc:false});
    }
}
export async function updateList(req, res) {
    let motherName = req.body.motherName;
    console.log("Received motherName:", motherName); // Debugging statement
    
    // Access the "name" property of the motherName object
    const name = motherName.name;

    console.log("Mother's name:", name); // Debugging statement

    if(loggedIn === false){
        res.redirect('/');
    }else {
    
    await deleteDoc(name);
    res.redirect('/:userID');
    }
}
  
export async function updateNotes(req, res) {
    const motherID = req.body.motherName._id;
  
    const userId = req.session.userId; // Get the userId from the session
    console.log("userId:", userId); // Debugging statement
  
    if (!loggedIn) { // Note the change here, using "!" to negate the "loggedIn" variable
      res.redirect('/');
    } else {
      await updateDoc(motherID, req.body.updateNote);
      res.redirect(`/${userId}`);
    }
}

export async function getIndexPage(req, res) {
    // Use variables set by the checkLoggedIn middleware
    if (res.locals.loggedIn) {
      const userId = req.session.userId;
      // Your logic for rendering the page for logged-in users goes here
      // For example, you can fetch data for the logged-in user
      // and render the page accordingly
      res.redirect(`/${userId}`);
    } else {
      // User is not logged in
      res.render(__dirname + '/views/home.ejs', {
        loggedIn: false,
        regiFailed: res.locals.regiFailed,
        regiSuc: res.locals.regiSuc,
      });
    }
  }
  
export async function getUserPage(req, res) {
    const documentsArray = [];
    // Your logic for logged-in users goes here
    // You can use req.session.userId to access the logged-in user's ID
    const userId = req.session.userId; 
    const read = await MotherModel.find({mom_id: 'user_' + userId});
  
    const folderPath = '/DoulaFocus'; // Replace with the path to the folder you want to list files from
    const fileUser = userId; // Specify the desired file extension

    // const specificFiles = await listSpecificFiles(folderPath, fileUser);
    // documentsArray.push(...specificFiles);
    // //console.log(documentsArray.path_display);


    // // Define a function to create and retrieve shared links for an array of files
    // async function createAndRetrieveSharedLinks(files) {
    //   const sharedLinks = [];

    //   for (const file of files) {
    //     try {
    //       const sharedLinkUrl = await createAndRetrieveSharedLinks(file.path_display);
    //       sharedLinks.push({ file: file.path_display, sharedLink: sharedLinkUrl });
    //       console.log('Shared Link URL for', file.path_display, ':', sharedLinkUrl);
    //     } catch (error) {
    //       // Handle the error, e.g., log it or take appropriate action
    //       console.error('Error:', error);
    //     }
    //   }

    //   return sharedLinks;
    // }

    // // // Usage
    // // const documentsArrays = documentsArray.path_display;
    // // 

    // // Create an empty array to store the extracted path_display values
    // const extractedPaths = [];

    // // Use forEach to iterate through documentsArray and extract path_display
    // documentsArray.forEach((document) => {
    //   extractedPaths.push(document.path_display);
    // });
    // // Now, 'extractedPaths' contains all the 'path_display' values
    // console.log("extracted path: " + extractedPaths);
    // // Convert the array of paths into an array of objects with path_display property
    // const documentsWithPaths = extractedPaths.map((path) => {
    //   return { path_display: path };
    // });

    // // Assuming documentsArray is a non-iterable object
    // const iterableArray = Object.keys(extractedPaths).map(key => ({ path_display: extractedPaths[key] }));

    // // Now you can iterate over the iterableArray
    // for (const item of iterableArray) {
    //   const filePath = item.path_display;

    //   createAndRetrieveSharedLinks(filePath)
    //   .then((sharedLinks) => {
    //     // sharedLinks array now contains shared links for each file
    //     console.log('All shared links:', sharedLinks);
    //   })
    //   .catch((error) => {
    //     console.error('Error:', error);
    //   });}



    // // Function to get shared links for an array of documents
    // async function getSharedLinksForDocuments(documentsArray) {
    //   const sharedLinks = [];
    //   for (const document of documentsArray) {
    //     const sharedLink = document.sharedLink; // Replace with the actual property containing the shared link
    //     sharedLinks.push(sharedLink);
    //   }
    //   return sharedLinks;
    // }


    // Check if the logged-in user's ID matches the requested userID
    if (userId === req.params.userID) {
      res.render(__dirname + '/views/index.ejs', { motherName: read, loggedIn: true, regiFailed:false,  regiSuc:false, });
      //res.redirect(`/${userId}`);
    } else {
      // Redirect to a different URL for unauthorized access
      res.redirect(`/`);
    }
  }

  export async function verify(req, res){
    const verificationToken = req.params.token;

    try {
        // Find the user by verification token
        const user = await UserModel.findOne({ verificationToken });

        if (!user) {
            res.render(__dirname + '/views/status/invalidToken.ejs', {loggedIn:false,regiFailed:true,  regiSuc:false} );
        }

        // Update user's verification status
        user.isVerified = true;
        user.verificationToken = undefined; // Clear the token
        await user.save();

        res.redirect('/');
        //res.render(__dirname + '/views/index.ejs', {loggedIn:false, regiFailed:false,  regiSuc:false});
    } catch (error) {
        res.render(__dirname+ '/views/status/verFail.ejs', {error:error, loggedIn:false, regiFailed:false,  regiSuc:false});
    }

  }

  export async function donate(req, res){ 
    
    try {
        res.render(__dirname + '/views/donate.ejs', {loggedIn:false, regiFailed:false,  regiSuc:false});
    } catch (err) {
        res.send(err);
    }
  }

  export async function checkLoggedIn(req, res, next) {
    if (!req.session.loginTimestamp || Date.now() - req.session.loginTimestamp > 24 * 60 * 60 * 1000) {
      // User is not logged in
      res.locals.loggedIn = false;
      res.locals.regiFailed = false;
      res.locals.regiSuc = false;
    } else {
      // User is logged in
      const userId = req.session.userId;
      // Your logic for logged-in users goes here
      // For example, fetch data for the logged-in user and set variables accordingly
      res.locals.loggedIn = true;
      // You can set other variables as needed for logged-in users
    }
    next(); // Continue to the next middleware or route handler
  }



  