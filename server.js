const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка CORS и обработка JSON
app.use(cors());
app.use(express.json());

// Раздача ВСЕХ статических файлов (index.html, cart.html, auth.html, css, img) из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Подключение к БД SQLite
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Успешное подключение к SQLite.');
    }
});

// Инициализация таблиц
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_name TEXT,
        phone TEXT,
        comment TEXT,
        items TEXT,
        total_price REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// ==========================================
// API Маршруты
// ==========================================

// Регистрация
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }

    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [email, password], function(err) {
        if (err) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }
        res.json({ success: true, userId: this.lastID });
    });
});

// Авторизация
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [email, password], (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'Неверный логин или пароль' });
        }
        res.json({ success: true, user: { id: user.id, username: user.username } });
    });
});

// Заказ
app.post('/api/orders', (req, res) => {
    const { userId, name, phone, comment, items, totalPrice } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Корзина пуста' });
    }

    const query = `INSERT INTO orders (user_id, customer_name, phone, comment, items, total_price) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(query, [userId || null, name || 'Гость', phone || null, comment || null, JSON.stringify(items), totalPrice || 0], function(err) {
        if (err) {
            return res.status(500).json({ success: false, error: 'Ошибка сохранения заказа' });
        }
        res.json({ success: true, orderId: this.lastID });
    });
});

// ==========================================
// Маршруты страниц
// ==========================================

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Все остальные HTML запросы отдают index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
