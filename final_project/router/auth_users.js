const express = require('express');
const jwt = require('jsonwebtoken');
let books = require("./booksdb.js");
const regd_users = express.Router();

let users = [];

const isValid = (username) => { //returns boolean
    //write code to check is the username is valid
    // Filter the users array for any user with the same username
    let users = users.filter((user) => {
        return user.username === username;
    });
    // Return true if any user with the same username is found, otherwise false
    if (username.length > 0) {
        return true;
    } else {
        return false;
    }
}

const authenticatedUser = (username, password) => { //returns boolean
    //write code to check if username and password match the one we have in records.
    let validusers = users.filter((user) => {
        return (user.username === username && user.password === password);
    });
    // Return true if any valid user is found, otherwise false
    if (validusers.length > 0) {
        return true;
    } else {
        return false;
    }
}

//only registered users can login
regd_users.post("/login", (req, res) => {
    //Write your code here
    const username = req.body.username;
    const password = req.body.password;

    // Check if username or password is missing
    if (!username || !password) {
        return res.status(404).json({ message: "Error logging in" });
    }

    // Authenticate user
    if (authenticatedUser(username, password)) {
        // Generate JWT access token
        let accessToken = jwt.sign({
            data: password
        }, 'access', { expiresIn: 60 * 60 });

        // Store access token and username in session
        req.session.authorization = {
            accessToken, username
        }
        return res.status(200).send("User successfully logged in");
    } else {
        return res.status(208).json({ message: "Invalid Login. Check username and password" });
    }
});

// Add a book review
regd_users.put("/auth/review/:isbn", (req, res) => {
    //Write your code here

    const isbn = req.params.isbn;
    const { review, rating } = req.body;
    const username = req.session.username || req.user.username; // Depende de tu auth
    
        // Validaciones básicas
    if (!review || !rating) {
        return res.status(400).json({ message: "Review and rating are required" });
    }
    
    if (isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be a number between 1-5" });
    }
    
        // Buscar el libro por ISBN
    if (!books[isbn]) {
        return res.status(404).json({ message: "Book not found" });
    }
    
        // Crear estructura de reseña si no existe
    if (!books[isbn].reviews) {
        books[isbn].reviews = {};
    }
    
        // Actualizar/agregar reseña
    books[isbn].reviews[username] = {
        review,
        rating: parseInt(rating),
        date: new Date().toISOString()
    };
    
    return res.status(201).json({ 
        message: "Review added successfully",
            book: {
                isbn,
                title: books[isbn].title,
                your_review: books[isbn].reviews[username]
            }
    });
    
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;
