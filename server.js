require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const MENU_DATA_FILE = path.join(__dirname, 'server', 'menu-data.json');
const RESERVATIONS_DATA_FILE = path.join(__dirname, 'server', 'reservations-data.json');
const SETTINGS_DATA_FILE = path.join(__dirname, 'server', 'settings-data.json');
const MANAGER_KEY = process.env.MANAGER_PORTAL_KEY || 'savannah-manager-key';
const MENU_SHEET_SYNC_URL = process.env.MENU_SHEET_SYNC_URL || '';
const MENU_SHEET_API_KEY = process.env.MENU_SHEET_API_KEY || '';
const SHEET_API_BASE_URL = process.env.SHEET_API_BASE_URL || '';
const SHEET_API_KEY = process.env.SHEET_API_KEY || '';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, '/')));

// API Routes

function loadMenuData() {
    try {
        if (fs.existsSync(MENU_DATA_FILE)) {
            const raw = fs.readFileSync(MENU_DATA_FILE, 'utf-8');
            const data = JSON.parse(raw);
            if (Array.isArray(data)) {
                return data;
            }
        }
    } catch (err) {
        console.error('Failed to load menu data:', err.message);
    }

    return [
        {
            category: 'Starters',
            name: 'Tomato Bruschetta with Olive',
            price: '4.00',
            description: 'Fresh tomato, basil and olive oil on crisp bread.',
            image: 'images/menu/double-tomato-bruschetta.jpg'
        },
        {
            category: 'Starters',
            name: 'Marinated Grilled Shrimp',
            price: '7.00',
            description: 'Savory shrimp with lemon butter and herbs.',
            image: 'images/menu/marinated-grilled-shrimp.jpg'
        },
        {
            category: 'Mains',
            name: 'Prime Rib with Garlic Sauce',
            price: '20.00',
            description: 'Slow-roasted prime rib with classic garlic jus.',
            image: 'images/menu/prime-rib-primer.jpg'
        },
        {
            category: 'Mains',
            name: 'Coconut Fried Chicken',
            price: '19.00',
            description: 'Crispy chicken with coconut curry glaze.',
            image: 'images/menu/coconut-fried-chicken.jpg'
        }
    ];
}

function loadJsonData(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(raw);
            if (Array.isArray(data)) {
                return data;
            }
        }
    } catch (err) {
        console.error(`Failed to load ${filePath}:`, err.message);
    }
    return defaultValue;
}

function saveJsonData(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error(`Failed to save ${filePath}:`, err.message);
    }
}

async function fetchSheetTab(tab, fallback) {
    if (!SHEET_API_BASE_URL) {
        return fallback;
    }

    const url = `${SHEET_API_BASE_URL.replace(/\/$/, '')}/${tab}`;
    const headers = { 'Content-Type': 'application/json' };
    if (SHEET_API_KEY) {
        headers.Authorization = `Bearer ${SHEET_API_KEY}`;
    }

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`Sheet API returned ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : (data?.data || data?.[tab] || fallback);
    } catch (err) {
        console.error('Sheet API error:', err.message);
        return fallback;
    }
}

async function writeSheetTab(tab, payload) {
    if (!SHEET_API_BASE_URL) {
        return null;
    }

    const url = `${SHEET_API_BASE_URL.replace(/\/$/, '')}/${tab}`;
    const headers = { 'Content-Type': 'application/json' };
    if (SHEET_API_KEY) {
        headers.Authorization = `Bearer ${SHEET_API_KEY}`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ data: payload })
        });
        if (!response.ok) {
            throw new Error(`Sheet write failed: ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        console.error('Sheet write error:', err.message);
        return null;
    }
}

function loadReservationData() {
    return loadJsonData(RESERVATIONS_DATA_FILE, [
        { id: 1, name: 'Aisha Smith', email: 'aisha@example.com', phone: '+15551234567', date: '2026-04-07', time: '18:30', guests: 4, status: 'pending' },
        { id: 2, name: 'David N.', email: 'david@example.com', phone: '+15559876543', date: '2026-04-07', time: '20:00', guests: 2, status: 'confirmed' }
    ]);
}

function loadSettingsData() {
    return loadJsonData(SETTINGS_DATA_FILE, [
        { key: 'total_tables', value: '20' }
    ]);
}

function normalizeMenuItem(item) {
    return {
        category: item.category || item.Category || 'Main Courses',
        name: item.name || item['Dish Name'] || 'Savannah Dish',
        price: Number(item.price || item.Price || 0).toFixed(2),
        description: item.description || item.Description || '',
        image: item.image || item.Image || item.image_url || item.ImageUrl || 'images/menu/default.jpg'
    };
}

function normalizeReservation(item) {
    return {
        id: item.id || item._id || item.ID || 0,
        name: item.name || item.Name || 'Guest',
        email: item.email || item.Email || '',
        phone: item.phone || item.Phone || '',
        date: item.date || item.Date || '',
        time: item.time || item.Time || '',
        guests: item.guests || item.Guests || 1,
        status: (item.status || item.Status || 'pending').toLowerCase()
    };
}

function normalizeSettings(items) {
    return items.map(item => ({ key: item.key || item.Key, value: String(item.value || item.Value || '') }));
}

function saveMenuData(items) {
    try {
        fs.writeFileSync(MENU_DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
        currentMenu = items;
    } catch (err) {
        console.error('Failed to save menu data:', err.message);
    }
}

let currentMenu = loadMenuData();

async function getMenuData() {
    if (SHEET_API_BASE_URL) {
        const sheetMenu = await fetchSheetTab('menu', currentMenu);
        return Array.isArray(sheetMenu) ? sheetMenu.map(normalizeMenuItem) : currentMenu;
    }
    return currentMenu;
}

app.get('/api/menu', async (req, res) => {
    try {
        const menu = await getMenuData();
        res.json({ menu });
    } catch (err) {
        console.error('Menu API error:', err.message);
        res.json({ menu: currentMenu });
    }
});

app.post('/api/manager/validate', (req, res) => {
    const { managerKey } = req.body;
    if (managerKey !== MANAGER_KEY) {
        return res.status(401).json({ error: 'Invalid manager key' });
    }
    res.json({ authenticated: true });
});

app.post('/api/manager/menu', async (req, res) => {
    const { managerKey, menu } = req.body;

    if (managerKey !== MANAGER_KEY) {
        return res.status(401).json({ error: 'Invalid manager key' });
    }

    if (!Array.isArray(menu)) {
        return res.status(400).json({ error: 'Menu must be an array' });
    }

    currentMenu = menu.map(item => ({
        category: item.category || 'Main Courses',
        name: item.name || 'Untitled Dish',
        price: Number(item.price || 0).toFixed(2),
        description: item.description || '',
        image: item.image || 'images/menu/default.jpg'
    }));
    saveMenuData(currentMenu);

    if (MENU_SHEET_SYNC_URL) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (MENU_SHEET_API_KEY) {
                headers.Authorization = `Bearer ${MENU_SHEET_API_KEY}`;
            }
            await fetch(MENU_SHEET_SYNC_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify({ menu: currentMenu })
            });
        } catch (syncError) {
            console.error('Sheet sync failed:', syncError.message);
        }
    }

    if (SHEET_API_BASE_URL) {
        await writeSheetTab('menu', currentMenu);
    }

    res.json({ message: 'Menu updated successfully' });
});

app.get('/api/reservations', async (req, res) => {
    const fallback = loadReservationData().map(normalizeReservation);
    const reservations = await fetchSheetTab('reservations', fallback);
    res.json({ reservations: Array.isArray(reservations) ? reservations.map(normalizeReservation) : fallback });
});

app.put('/api/reservations/:id/status', async (req, res) => {
    const { status } = req.body;
    const reservations = loadReservationData();
    const reservation = reservations.find(item => String(item.id) === String(req.params.id));
    if (!reservation) {
        return res.status(404).json({ error: 'Reservation not found' });
    }
    reservation.status = status || reservation.status;
    saveJsonData(RESERVATIONS_DATA_FILE, reservations);

    if (SHEET_API_BASE_URL) {
        await writeSheetTab('reservations', reservations.map(normalizeReservation));
    }

    res.json({ message: 'Reservation updated successfully', reservation: normalizeReservation(reservation) });
});

app.get('/api/settings', async (req, res) => {
    const fallback = loadSettingsData();
    const settings = await fetchSheetTab('settings', fallback);
    res.json({ settings: Array.isArray(settings) ? normalizeSettings(settings) : normalizeSettings(fallback) });
});

app.post('/api/settings', async (req, res) => {
    const { key, value } = req.body;
    if (!key) {
        return res.status(400).json({ error: 'Setting key is required' });
    }
    const settings = loadSettingsData();
    const existing = settings.find(item => item.key === key);
    if (existing) {
        existing.value = String(value || existing.value);
    } else {
        settings.push({ key, value: String(value || '') });
    }
    saveJsonData(SETTINGS_DATA_FILE, settings);

    if (SHEET_API_BASE_URL) {
        await writeSheetTab('settings', normalizeSettings(settings));
    }

    res.json({ message: 'Setting saved successfully', settings: normalizeSettings(settings) });
});

app.get('/the-vault', (req, res) => {
    res.sendFile(path.join(__dirname, 'savanna-vault.html'));
});

// Reference for Status:
// 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 500 Server Error

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

    // Log the booking (since no database)
    console.log('New booking received:', { name, email, phone, date: datepicker, time, guests: persons, message });

    // Send confirmation email
    if (transporter) {
        const subject = 'Reservation Request Received - Savannah Spice';
        const text = `Hello ${name},\n\nThank you for your reservation request for ${persons} people on ${datepicker} at ${time}.\n\nWe will contact you soon to confirm.\n\nSavannah Spice Team`;
        const html = `<h3>Reservation Request Received</h3><p>Hello <b>${name}</b>,</p><p>Thank you for your reservation request for <b>${persons} people</b> on <b>${datepicker}</b> at <b>${time}</b>.</p><p>We will contact you soon to confirm.</p><p><i>Savannah Spice Team</i></p>`;

        const mailOptions = {
            from: '"Savannah Spice" <reservations@savannahspice.com>',
            to: email,
            subject: subject,
            text: text,
            html: html
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
            } else {
                console.log('Reservation email sent: %s', info.messageId);
                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            }
        });
    }

    res.status(201).json({
        message: 'Booking request submitted successfully. We will contact you to confirm.'
    });
});

// Get all bookings - REMOVED (no admin)


// --- Manager Portal ---

app.get('/manager-portal', (req, res) => {
    res.sendFile(path.join(__dirname, 'manager-portal', 'index.html'));
});

// --- Blog API ---

app.get('/api/blogs', (req, res) => {
    // Static blog data (since no database)
    const blogs = [
        { id: 1, title: 'Welcome to Savannah Spice', content: 'Our story begins...', image_url: 'images/blog/blog1.jpg', author: 'Savannah Spice Team', created_at: '2026-01-01' }
    ];
    res.json({ blogs });
});

app.post('/api/blogs', (req, res) => {
    // Log community submission (since no database)
    const { title, content, image_url, author } = req.body;
    console.log('New blog submission:', { title, content, image_url, author });
    res.status(201).json({ message: 'Blog submission received. Thank you!' });
});

// Update/Delete blog - REMOVED (no admin)


// --- Ads API ---

app.get('/api/ads', (req, res) => {
    // Static ads data (since no database)
    const ads = [
        { id: 1, title: 'Special Offer', image_url: 'images/ads/special.jpg', link_url: '#', position: 'sidebar', is_active: 1 }
    ];
    res.json({ ads });
});

// Add/Delete ads - REMOVED (no admin)

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
