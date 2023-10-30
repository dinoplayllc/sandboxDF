import express from 'express';
import {logout, login, submit, register, updateList, updateNotes, getIndexPage, getUserPage, verify, donate, checkLoggedIn } from './controllers.js';

const router = express.Router();

router.get('/logout', logout);
router.post('/login', login);
router.post('/submit', submit);
router.post('/register', register);
router.post('/updateList', updateList);
router.post('/updateNotes', updateNotes);
router.get('/', checkLoggedIn, getIndexPage);
router.get('/donate', donate);


router.get('/:userID', getUserPage);
router.get('/verify/:token', verify);

export default router;