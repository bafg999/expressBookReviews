const express = require('express');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();


public_users.post("/register", (req,res) => {
  //Write your code here
  const username = req.body.username;
    const password = req.body.password;

    // Check if both username and password are provided
    if (username && password) {
        // Check if the user does not already exist
        if (!doesExist(username)) {
            // Add the new user to the users array
            users.push({"username": username, "password": password});
            return res.status(200).json({message: "User successfully registered. Now you can login"});
        } else {
            return res.status(404).json({message: "User already exists!"});
        }
    }
    // Return error if username or password is missing
    return res.status(404).json({message: "Unable to register user."});
});

// Get the book list available in the shop
public_users.get('/',function (req, res) {
  //Write your code here
    res.send(JSON.stringify(books,null,4));
});

// Get book details based on ISBN
public_users.get('/isbn/:isbn',function (req, res) {
  //Write your code here
  const isbn = req.params.isbn;
    
  //Validación del ISBN
  if (!isbn || isbn.length < 10) {
      return res.status(400).json({
          message: "Invalid ISBN format",
          expected_format: "ISBN-10 (10 characters) or ISBN-13 (13 characters)",
          received: isbn
      });
  }

  //Buscar el libro.
  const book = books[isbn];
  
  //el libro no existe
  if (!book) {
      return res.status(404).json({
          message: "Book not found",
          isbn: isbn,
          suggestion: "Check the ISBN or browse our collection"
      });
  }

  //Preparar respuesta con detalles del libro
  const response = {
      isbn: isbn,
      title: book.title,
      author: book.author,
      publication_year: book.publication_year || "Unknown",
      genre: book.genre || "Not specified",
      reviews_summary: {
          count: book.reviews ? Object.keys(book.reviews).length : 0,
          average_rating: book.reviews ? 
              (Object.values(book.reviews).reduce((sum, review) => sum + review.rating, 0) / Object.keys(book.reviews).length).toFixed(1) : 0
      },
      available_copies: book.copies || 1
  };

  //Enviar respuesta exitosa
  return res.status(200).json(response);
 });
  
// Get book details based on author
public_users.get('/author/:author',function (req, res) {
  //Write your code here
    const author = req.params.author;
    res.send(books[author]);
});

// Get all books based on title
public_users.get('/title/:title',function (req, res) {
  //Write your code here
  const title = req.params.books.title.toLowerCase();
    const foundBooks = [];
    
    // Buscar libros que coincidan con el título
    for (const title in books) {
        if (books[title].toLowerCase().includes(title)) {
            foundBooks.push(books[title]);
        }
    }
    
    if (foundBooks.length > 0) {
        return res.status(200).json(foundBooks);
    }else {
        return res.status(404).json({ message: "No books found with that title" });
    }
});

//Get book review
public_users.get('/review/:isbn',function (req, res) {
  //Write your code here
  const isbn = req.params.isbn;
    
    //Validar que el libro exista
    if (!books[isbn]) {
        return res.status(404).json({ 
            message: "Book not found",
            suggestion: "Check the ISBN or try another book"
        });
    }

    // Verificar si hay reseñas
    if (!books[isbn].reviews || Object.keys(books[isbn].reviews).length === 0) {
        return res.status(200).json({
            message: "No reviews yet for this book",
            book: {
                title: books[isbn].title,
                author: books[isbn].author
            }
        });
    }

    // Calcular rating promedio
    const reviews = books[isbn].reviews;
    const ratings = Object.values(reviews).map(r => r.rating);
    const averageRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length);

    //Formatear respuesta
    const response = {
        isbn,
        title: books[isbn].title,
        author: books[isbn].author,
        review_count: Object.keys(reviews).length,
        average_rating: averageRating.toFixed(1),
        reviews: Object.entries(reviews).map(([username, review]) => ({
            username,
            review: review.review,
            rating: review.rating,
            date: review.date
        }))
    };

    return res.status(200).json(response);
});

module.exports.general = public_users;
