import express from 'express';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied. Please log in." });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid or expired token." });
        req.user = user;
        next();
    });
};

app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await client.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
            [username, hashedPassword]
        );
        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: "Username already exists or database error." });
    } finally {
        await client.end();
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: "User not found." });

        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) return res.status(400).json({ error: "Invalid password." });

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, username: user.username });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await client.end();
    }
});

app.get('/api/comments', async (req, res) => {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        const { rows } = await client.query('SELECT username, comment_text, created_at FROM comments ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await client.end();
    }
});

app.post('/api/comments', authenticateToken, async (req, res) => {
    const { text } = req.body;
    const username = req.user.username;
    
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        await client.query(
            'INSERT INTO comments (username, comment_text) VALUES ($1, $2)',
            [username, text]
        );
        res.status(200).json({ message: 'Comment added!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await client.end();
    }
});


export default app;