const express = require('express');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();
import ("./auth_users.js");

function getBooksAsync(callback) {
    setTimeout(() => {
        const error = null;
        const data = {
            books: books,
            metadata: {
                count: Object.keys(books).length,
                generated_at: new Date().toISOString()
            }
        };
        callback(error, data);
    }, 150);
}

//búsqueda asíncrona
function findBookByISBN(isbn) {
    return new Promise((resolve, reject) => {
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
        }, 100);
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

function getAuthorSuggestions(searchedAuthor) {
    const authorSet = new Set();
    
    for (const isbn in books) {
        if (books[isbn].author) {
            authorSet.add(books[isbn].author);
        }
    }
    
    return Array.from(authorSet)
        .filter(author => 
            author.includes(searchedAuthor)
        );
}

async function searchBooksByAuthor(authorName) {
    return new Promise((resolve) => {
      // Simulamos procesamiento asíncrono
      process.nextTick(() => {
        const matchingBooks = [];
        
        for (const isbn in books) {
          if (books[isbn].author.includes(authorName)) {
            matchingBooks.push({
              isbn,
              title: books[isbn].title,
              author: books[isbn].author,
              publication_year: books[isbn].publication_year || 'Unknown',
              review_count: books[isbn].reviews ? Object.keys(books[isbn].reviews).length : 0
            });
          }
        }
        
        resolve(matchingBooks);
      });
    });
  }

  async function getAuthorSuggestionsAsync(authorName) {
    return new Promise((resolve) => {
      process.nextTick(() => {
        const authorSet = new Set();
        for (const isbn in books) {
          if (books[isbn].author) {
            authorSet.add(books[isbn].author);
          }
        }
        resolve(
          Array.from(authorSet)
            .filter(author => author.toLowerCase().includes(authorName.substring(0, 3).toLowerCase()))
            .slice(0, 5)
        );
      });
    });
  }

//only registered users can login
public_users.post("/login", (req, res) => {
    //Write your code here
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        return res.status(404).json({ message: "Error logging in" });
    }

    // Authenticate user
    if (authenticatedUser(username, password)) {
        // Generate JWT access token
        let accessToken = jwt.sign({
            data: password
        }, 'access', { expiresIn: 60 * 60 });

        req.session.authorization = {
            accessToken, username
        }
        return res.status(200).send("User successfully logged in");
    } else {
        return res.status(208).json({ message: "Invalid Login. Check username and password" });
    }
});

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 64;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

public_users.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                status: 'error',
                code: 'MISSING_CREDENTIALS',
                message: 'Both username and password are required in the request body',
                example_request: {
                    "username": "your_username",
                    "password": "your_secure_password"
                }
            });
        }

        //username
        if (!USERNAME_REGEX.test(username)) {
            return res.status(400).json({
                status: 'error',
                code: 'INVALID_USERNAME',
                message: 'Username must be 3-20 characters long and can only contain letters, numbers and underscores',
                received: username
            });
        }

        //contraseña
        if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
            return res.status(400).json({
                status: 'error',
                code: 'INVALID_PASSWORD_LENGTH',
                message: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
                password_length: password.length
            });
        }

        //Verificar existencia
        if (doesExist(username)) {
            return res.status(409).json({
                status: 'error',
                code: 'USER_EXISTS',
                message: 'Username already registered',
                suggestion: 'Try a different username or reset your password if you own this account'
            });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        //usuario
        const newUser = {
            id: uuidv4(),
            username: username,
            password: hashedPassword,
            registration_date: new Date().toISOString(),
            last_login: null,
            is_active: true
        };

        //Guardar usuario
        users.push(newUser);

        //Respuesta
        return res.status(201).json({
            status: 'success',
            code: 'USER_REGISTERED',
            message: 'User registration successful',
            user: {
                id: newUser.id,
                username: newUser.username,
                registration_date: newUser.registration_date
            },
            next_steps: [
                'You can now login using your credentials',
                'Store your password securely as it cannot be recovered'
            ],
            postman_testing_tip: 'Save the user ID for future authenticated requests'
        });

    } catch (error) {
        console.error('Registration Error:', error);
        return res.status(500).json({
            status: 'error',
            code: 'REGISTRATION_FAILED',
            message: 'An unexpected error occurred during registration',
            system_error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            action: 'Please try again or contact support'
        });
    }
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
            //respuesta
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
            
            //respuesta
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600'
            });
            
            return res.status(200).json(response);
        })
        .catch(error => {
        
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
    try {
        const authorName = decodeURIComponent(req.params.author);
        
        //síncrona
        if (!authorName || authorName.trim().length < 2) {
          return res.status(400).json({
            error: "Invalid author name",
            received: req.params.author
          });
        }
    
        const matchingBooks = searchBooksByAuthor(authorName);
    
        if (matchingBooks.length === 0) {
          const suggestions = getAuthorSuggestionsAsync(authorName);
          return res.status(404).json({
            message: "No books found for the specified author",
            searched_author: req.params.author,
            suggestions: suggestions
          });
        }
    
        //Respuesta exitosa
        res.status(200).json({
          count: matchingBooks.length,
          author_search: req.params.author,
          books: matchingBooks
        });
    
      } catch (error) {
        console.error("Error in author search:", error);
        res.status(500).json({
          error: "Internal server error",
          message: "Could not complete search",
          ...(process.env.NODE_ENV === 'development' && { details: error.message })
        });
      }

});

// Get all books based on title
public_users.get('/title/:title',function (req, res) {
  //Write your code here
    const foundBooks = [];
    
    //libros título
    for (const title in books) {
        if (books[title]) {
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
    
    //Validar existencia
    if (!books[isbn]) {
        return res.status(404).json({ 
            message: "Book not found"
        });
    }

    //reseñas
    if (!books[isbn].reviews || Object.keys(books[isbn].reviews).length === 0) {
        return res.status(200).json({
            message: "No reviews yet for this book",
            book: {
                title: books[isbn].title,
                author: books[isbn].author
            }
        });
    }

    // Calcular promedio
    const reviews = books[isbn].reviews;
    const ratings = Object.values(reviews).map(r => r.rating);
    const averageRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length);

    //Formatear
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
    const { review, rating, username } = req.body;

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

    //actualización o nueva reseña
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
    const { username } = req.body;

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
