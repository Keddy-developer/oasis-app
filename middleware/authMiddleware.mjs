import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Record from '../models/recordModel.js';

// Middleware to check if a user is authenticated
export const requireAuth = async (req, res, next) => {
    const token = req.cookies.jwt;

    if (token) {
        try {
            const decodedToken = jwt.verify(token, 'Keddy secret'); // Verify the token
            console.log("Token verified. Decoded token:", decodedToken);

            // Attempt to find the user in the database
            const user = await User.findById(decodedToken.id);
            if (!user) {
                console.log("No user found with the given token.");
                return res.redirect('/login'); // Redirect if user is not found
            }

            req.user = user; // Attach user object to the request
            next(); // Proceed to the next middleware
        } catch (err) {
            console.log("Token verification error:", err.message);
            return res.redirect('/login'); // Redirect if token verification fails
        }
    } else {
        console.log("No token found, redirecting to login.");
        return res.redirect('/login'); // Redirect if no token
    }
};

// Middleware to check the current user and attach apartment details
export const checkUser = async (req, res, next) => {
    const token = req.cookies.jwt;

    if (token) {
        jwt.verify(token, 'Keddy secret', async (err, decodedToken) => {
            if (err) {
                console.log("Token verification error:", err.message);
                res.locals.user = null;
                res.locals.isLoggedIn = false; // User is not logged in
                next();
                
            } else {
                console.log("Token verified. Decoded token:", decodedToken);
                try {
                    // Fetch the user from the database
                    let user = await User.findById(decodedToken.id);
                  
                    if (user) {
                        req.session.user = {
                            id: user._id,
                            role: user.role // Ensure your User model has a 'role' field
                          };
                        console.log(req.session.user)
                        res.locals.user = user; // Set the user in locals for view rendering
                        res.locals.isLoggedIn = true; // User is logged in
                        console.log("User found:", user.userName);

                        // Find the apartment record associated with this user
                        const apartmentRecord = await Record.findOne({ userName: user.userName });

                        if (apartmentRecord) {
                            // Attach apartment details to both request and locals for access in controllers
                            req.user = {
                                ...user._doc,
                                id: apartmentRecord._id,
                                userName: apartmentRecord.userName,
                                apartmentNo: apartmentRecord.apartmentNo,
                                apartmentSize: apartmentRecord.apartmentSize,
                                serviceCharge: apartmentRecord.serviceCharge,
                                photoUrl: apartmentRecord.photoUrl,
                            };
                            res.locals.user = {
                                ...res.locals.user._doc,
                                id: apartmentRecord._id,
                                userName: apartmentRecord.userName,
                                apartmentNo: apartmentRecord.apartmentNo,
                                apartmentSize: apartmentRecord.apartmentSize,
                                serviceCharge: apartmentRecord.serviceCharge,
                                photoUrl: apartmentRecord.photoUrl,
                            };
                            console.log("Apartment record found:", req.user);
                        } else {
                            console.log("No apartment record found for this user.");
                        }
                    } else {
                       
                        res.locals.user = null;
                        req.user = null;
                        res.locals.isLoggedIn = false; // User is not logged in
                        console.log("No user found with the given token.");
                    }
                    next();
                } catch (fetchError) {
                    console.log("Error fetching user or apartment data from the database:", fetchError);
                    res.locals.user = null;
                    req.user = null;
                    res.locals.isLoggedIn = false; // User is not logged in
                    next();
                }
            }
        });
    } else {
        console.log("No token found, setting user to null.");
        res.locals.user = null;
        req.user = null;
        res.locals.isLoggedIn = false; // User is not logged in
        next();
    }
};