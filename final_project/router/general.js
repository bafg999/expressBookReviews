const express = require('express');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

function getBooksAsync(callback) {
    // Simulamos un retraso de red/DB
    setTimeout(() => {
        // Podríamos tener lógica de error aquí
        const error = null; // Simulamos que no hay error
        const data = {
            books: books,
            metadata: {
                count: Object.keys(books).length,
                generated_at: new Date().toISOString()
            }
        };
        callback(error, data);
    }, 150); // Retraso simulado de 150ms
}

// Función que simula una búsqueda asíncrona en base de datos
function findBookByISBN(isbn) {
    return new Promise((resolve, reject) => {
        // Simulamos un pequeño retraso como si fuera una DB real
        setTimeout(() => {
            const book = books[isbn];
            
            if (!book) {
                const error = new Error('Book not found');
                error.status = 404;
                error.details = {
                    isbn,
                    suggestion: "Check the ISBN or browse our collection"
                };
                return reject(error);
            }
            
            resolve(book);
        }, 100); // Retraso simulado de 100ms
    });
}

// Función para validar el formato ISBN
function validateISBN(isbn) {
    return new Promise((resolve, reject) => {
        if (!isbn || isbn.length < 10) {
            const error = new Error('Invalid ISBN format');
            error.status = 400;
            error.details = {
                expected_format: "ISBN-10 (10 characters) or ISBN-13 (13 characters)",
                received: isbn
            };
            return reject(error);
        }
        resolve(isbn);
    });
}

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
    getBooksAsync((err, result) => {
        if (err) {
            console.error("Error fetching books:", err);
            return res.status(500).json({
                error: "Internal Server Error",
                message: "Could not retrieve book list",
                details: err.message
            });
        }
        
        const isbn = req.params.isbn;

        const response = {
            status: "success",
            data: {
                isbn: result.isbn,
                books: result.books,
                meta: result.metadata
            },
            links: {
                self: req.originalUrl,
                search: `${req.baseUrl}/search`
            }
        };
        
        res.set({
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
        });

        res.status(200).send(JSON.stringify(response, null, process.env.NODE_ENV === 'development' ? 4 : 0));
    });
});


// Get book details based on ISBN
public_users.get('/isbn/:isbn',function (req, res) {
  //Write your code here
  const isbn = req.params.isbn;
    
    validateISBN(isbn)
        .then(() => findBookByISBN(isbn))
        .then(book => {
            // Preparar respuesta
            const response = {
                isbn: isbn,
                title: book.title,
                author: book.author,
                publication_year: book.publication_year || "Unknown",
                genre: book.genre || "Not specified",
                reviews_summary: {
                    count: book.reviews ? Object.keys(book.reviews).length : 0,
                    average_rating: book.reviews ? 
                        (Object.values(book.reviews).reduce((sum, review) => sum + review.rating, 0) / 
                        Object.keys(book.reviews).length) : 0
                },
                available_copies: book.copies || 1
            };
            
            if (response.reviews_summary.average_rating) {
                response.reviews_summary.average_rating = 
                    response.reviews_summary.average_rating.toFixed(1);
            }
            
            //headers de respuesta
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600' // Cache de 1 hora
            });
            
            return res.status(200).json(response);
        })
        .catch(error => {
            // Manejo centralizado de errores
            console.error(`Error processing ISBN ${isbn}:`, error.message);
            
            const status = error.status || 500;
            const response = {
                error: error.message,
                ...(error.details && { details: error.details })
            };
            
            if (status === 500) {
                response.message = "Internal server error";
            }
            
            res.status(status).json(response);
        });
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
            message: "Book not found"
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
//Agregar/Modificar reviews
public_users.put("/auth/review/:isbn", function (req, res) {
    const isbn = req.params.isbn;
    const { review, rating, username } = req.body; // username viene del body en esta versión

    // Validaciones básicas
    if (!username) {
        return res.status(400).json({ message: "Username is required" });
    }

    if (!review || !rating) {
        return res.status(400).json({ message: "Review and rating are required" });
    }

    if (isNaN(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Verificar si el libro existe
    if (!books[isbn]) {
        return res.status(404).json({ message: "Book not found" });
    }

    // Inicializar reviews si no existen
    if (!books[isbn].reviews) {
        books[isbn].reviews = {};
    }

    // Determinar si es una actualización o nueva reseña
    const isUpdate = books[isbn].reviews[username] ? true : false;

    // Agregar/actualizar la reseña
    books[isbn].reviews[username] = {
        review,
        rating: Number(rating),
        date: new Date().toISOString()
    };

    // Respuesta exitosa
    return res.status(isUpdate ? 200 : 201).json({
        message: isUpdate ? "Review updated successfully" : "Review added successfully",
        book: {
            isbn,
            title: books[isbn].title,
            your_review: books[isbn].reviews[username]
        },
        stats: {
            total_reviews: Object.keys(books[isbn].reviews).length,
            average_rating: calculateAverage(books[isbn].reviews)
        }
    });
});

//eliminar reseñas de usuario
public_users.delete("/auth/review/:isbn", function (req, res) {
    const isbn = req.params.isbn;
    const { username } = req.body; // Se espera el username en el body

    if (!username) {
        return res.status(400).json({ 
            success: false,
            message: "Username is required" 
        });
    }

    if (!books[isbn]) {
        return res.status(404).json({ 
            success: false,
            message: "Book not found",
            isbn: isbn
        });
    }

    if (!books[isbn].reviews || Object.keys(books[isbn].reviews).length === 0) {
        return res.status(404).json({ 
            success: false,
            message: "No reviews found for this book",
            isbn: isbn
        });
    }

    if (!books[isbn].reviews[username]) {
        return res.status(404).json({ 
            success: false,
            message: "No review found for this user",
            username: username,
            isbn: isbn
        });
    }

    delete books[isbn].reviews[username];

    return res.status(200).json({
        success: true,
        message: "Review deleted successfully",
        book: {
            isbn: isbn,
            title: books[isbn].title,
            remaining_reviews: Object.keys(books[isbn].reviews).length
        }
    });
});

module.exports.general = public_users;
