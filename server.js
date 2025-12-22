require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const bcrypt = require('bcryptjs');
const db = require('./server/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './server'
    }),
    secret: process.env.SESSION_SECRET || 'savannah-spice-default-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: parseInt(process.env.SESSION_TIMEOUT) || 7200000, // 2 hours default
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' // HTTPS only in production
    }
}));

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, '/')));

// API Routes

// Reference for Status: 
// 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 500 Server Error

// --- Authentication Middleware ---
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
}

// --- Authentication API ---

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Server error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Server error' });
            }

            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Set session
            req.session.userId = user.id;
            req.session.username = user.username;

            // Update last login
            db.run('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

            res.json({
                success: true,
                message: 'Login successful',
                username: user.username
            });
        });
    });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Check authentication status
app.get('/api/auth/check', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            authenticated: true,
            username: req.session.username
        });
    } else {
        res.json({ authenticated: false });
    }
});

// --- Bookings API ---

// Create a new booking
// Email Setup (Nodemailer)
const nodemailer = require('nodemailer');

// Create a test account (Ethereal) for development
// In production, you would replace this with real Gmail/SMTP credentials
let transporter;
nodemailer.createTestAccount().then(account => {
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });
    console.log('Email capability ready (Preview Mode)');
}).catch(err => {
    console.error('Failed to create test email account: ' + err.message);
});


// Create a new booking
app.post('/api/bookings', (req, res) => {
    const { name, email, phone, datepicker, time, persons, message } = req.body;

    // Basic validation
    if (!name || !email || !phone || !datepicker || !time || !persons) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const sql = `INSERT INTO bookings (name, email, phone, date, time, guests, message) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [name, email, phone, datepicker, time, persons, message];

    db.run(sql, params, function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Failed to create booking' });
        }
        res.status(201).json({
            message: 'Booking created successfully',
            bookingId: this.lastID
        });
    });
});

// Update booking status (Approve/Decline) - ADMIN ONLY
app.put('/api/bookings/:id/status', requireAuth, (req, res) => {
    const { status } = req.body; // 'confirmed' or 'cancelled'
    const { id } = req.params;

    if (!['confirmed', 'cancelled', 'pending'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const sql = `UPDATE bookings SET status = ? WHERE id = ?`;

    db.run(sql, [status, id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Fetch booking details to send email
        db.get("SELECT * FROM bookings WHERE id = ?", [id], (err, row) => {
            if (err || !row) return; // Can't send email if not found

            // --- Send Status Email ---
            if (transporter && status !== 'pending') {
                let subject, text, html;

                if (status === 'confirmed') {
                    subject = 'Reservation Confirmed - Savannah Spice';
                    text = `Hello ${row.name},\n\nGood news! Your table for ${row.guests} people on ${row.date} at ${row.time} has been CONFIRMED.\n\nWe look forward to seeing you!\nSavannah Spice Team`;
                    html = `<h3>Reservation Confirmed!</h3><p>Hello <b>${row.name}</b>,</p><p>Good news! Your table for <b>${row.guests} people</b> on <b>${row.date}</b> at <b>${row.time}</b> has been <b style="color:green">CONFIRMED</b>.</p><p>We look forward to seeing you!</p><p><i>Savannah Spice Team</i></p>`;
                } else if (status === 'cancelled') {
                    subject = 'Reservation Update - Savannah Spice';
                    text = `Hello ${row.name},\n\nUnfortunately, we cannot fulfill your reservation request for ${row.guests} people on ${row.date} at ${row.time}.\n\nPlease call us to reschedule.\nSavannah Spice Team`;
                    html = `<h3>Reservation Update</h3><p>Hello <b>${row.name}</b>,</p><p>Unfortunately, we cannot fulfill your reservation request for <b>${row.guests} people</b> on <b>${row.date}</b> at <b>${row.time}</b>.</p><p>Please call us to reschedule.</p><p><i>Savannah Spice Team</i></p>`;
                }

                const mailOptions = {
                    from: '"Savannah Spice" <reservations@savannahspice.com>',
                    to: row.email,
                    subject: subject,
                    text: text,
                    html: html
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('Error sending email:', error);
                    } else {
                        console.log(`Status Email sent (${status}): %s`, info.messageId);
                        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
                    }
                });
            }
        });

        res.json({ message: `Booking status updated to ${status}` });
    });
});

// Get all bookings - ADMIN ONLY
app.get('/api/bookings', requireAuth, (req, res) => {
    const sql = "SELECT * FROM bookings ORDER BY created_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ bookings: rows });
    });
});


// --- Menu API ---

// Get all menu items
app.get('/api/menu', (req, res) => {
    const sql = "SELECT * FROM menu_items WHERE is_available = 1";
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ menu: rows });
    });
});

// Add a menu item - ADMIN ONLY
app.post('/api/menu', requireAuth, (req, res) => {
    const { category, name, description, price, image_url } = req.body;
    const sql = `INSERT INTO menu_items (category, name, description, price, image_url) VALUES (?, ?, ?, ?, ?)`;
    const params = [category, name, description, price, image_url];

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ itemId: this.lastID });
    });
});

// Update a menu item - ADMIN ONLY
app.put('/api/menu/:id', requireAuth, (req, res) => {
    const { category, name, description, price, image_url, is_available } = req.body;
    const { id } = req.params;

    // Dynamic query construction to allow partial updates
    const updates = [];
    const params = [];
    if (category !== undefined) { updates.push("category = ?"); params.push(category); }
    if (name !== undefined) { updates.push("name = ?"); params.push(name); }
    if (description !== undefined) { updates.push("description = ?"); params.push(description); }
    if (price !== undefined) { updates.push("price = ?"); params.push(price); }
    if (image_url !== undefined) { updates.push("image_url = ?"); params.push(image_url); }
    if (is_available !== undefined) { updates.push("is_available = ?"); params.push(is_available); }

    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

    params.push(id);
    const sql = `UPDATE menu_items SET ${updates.join(", ")} WHERE id = ?`;

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Menu item updated", changes: this.changes });
    });
});

// Delete a menu item - ADMIN ONLY
app.delete('/api/menu/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM menu_items WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Menu item deleted", changes: this.changes });
    });
});


// --- Blog API ---

app.get('/api/blogs', (req, res) => {
    const sql = "SELECT * FROM blog_posts ORDER BY created_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ blogs: rows });
    });
});

app.post('/api/blogs', requireAuth, (req, res) => {
    const { title, content, image_url, author } = req.body;
    const sql = `INSERT INTO blog_posts (title, content, image_url, author) VALUES (?, ?, ?, ?)`;
    db.run(sql, [title, content, image_url, author], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

app.put('/api/blogs/:id', requireAuth, (req, res) => {
    const { title, content, image_url, author } = req.body;
    const { id } = req.params;
    const sql = `UPDATE blog_posts SET title = ?, content = ?, image_url = ?, author = ? WHERE id = ?`;
    db.run(sql, [title, content, image_url, author, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Blog post updated" });
    });
});

app.delete('/api/blogs/:id', requireAuth, (req, res) => {
    db.run("DELETE FROM blog_posts WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Blog post deleted" });
    });
});


// --- Ads API ---

app.get('/api/ads', (req, res) => {
    const sql = "SELECT * FROM ads WHERE is_active = 1";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ads: rows });
    });
});

app.post('/api/ads', requireAuth, (req, res) => {
    const { title, image_url, link_url, position } = req.body;
    const sql = `INSERT INTO ads (title, image_url, link_url, position) VALUES (?, ?, ?, ?)`;
    db.run(sql, [title, image_url, link_url, position], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

app.delete('/api/ads/:id', requireAuth, (req, res) => {
    db.run("DELETE FROM ads WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Ad deleted" });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
