const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session')
const customer_routes = require('./router/auth_users.js').authenticated;
const genl_routes = require('./router/general.js').general;

const app = express();

app.use(express.json());

app.use("/customer",session({secret:"fingerprint_customer",resave: true, saveUninitialized: true}))

app.use("/customer/auth/*", function auth(req,res,next){
//Write the authenication mechanism here
if (req.session.authorization) {
    let token = req.session.authorization['accessToken'];

    // Verify JWT token
    jwt.verify(token, "access", (err, user) => {
        if (!err) {
            req.user = user;
            next(); // Proceed to the next middleware
        } else {
            return res.status(403).json({ message: "User not authenticated" });
        }
    });
    } else {
        return res.status(403).json({ message: "User not logged in" });
    }   
});
//ctrl+kc (comenta todo) / ctrl+ku (descomenta todo)
// function getBooksAsync(callback) {
//     // Simulamos un retraso de red/DB
//     setTimeout(() => {
//         // Podríamos tener lógica de error aquí
//         const error = null; // Simulamos que no hay error
//         const data = {
//             books: books,
//             metadata: {
//                 count: Object.keys(books).length,
//                 generated_at: new Date().toISOString()
//             }
//         };
//         callback(error, data);
//     }, 150); // Retraso simulado de 150ms
// }

// // Función que simula una búsqueda asíncrona en base de datos
// function findBookByISBN(isbn) {
//     return new Promise((resolve, reject) => {
//         // Simulamos un pequeño retraso como si fuera una DB real
//         setTimeout(() => {
//             const book = books[isbn];
            
//             if (!book) {
//                 const error = new Error('Book not found');
//                 error.status = 404;
//                 error.details = {
//                     isbn,
//                     suggestion: "Check the ISBN or browse our collection"
//                 };
//                 return reject(error);
//             }
            
//             resolve(book);
//         }, 100); // Retraso simulado de 100ms
//     });
// }

// // Función para validar el formato ISBN
// function validateISBN(isbn) {
//     return new Promise((resolve, reject) => {
//         if (!isbn || isbn.length < 10) {
//             const error = new Error('Invalid ISBN format');
//             error.status = 400;
//             error.details = {
//                 expected_format: "ISBN-10 (10 characters) or ISBN-13 (13 characters)",
//                 received: isbn
//             };
//             return reject(error);
//         }
//         resolve(isbn);
//     });
// }
 
const PORT =5000;

app.use("/customer", customer_routes);
app.use("/", genl_routes);

app.listen(PORT,()=>console.log("Server is running"));
