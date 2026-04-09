const API_BASE = 'http://localhost:3000/api';

function updateUI() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    const authGuest = document.getElementById('auth-guest');
    const authUser = document.getElementById('auth-user');
    const commentInput = document.getElementById('comment-input-area');
    const loginPrompt = document.getElementById('login-prompt');

    if (token) {
        authGuest.classList.add('hidden');
        authUser.classList.remove('hidden');
        commentInput.classList.remove('hidden');
        loginPrompt.classList.add('hidden');
        document.getElementById('display-username').innerText = username;
    } else {
        authGuest.classList.remove('hidden');
        authUser.classList.add('hidden');
        commentInput.classList.add('hidden');
        loginPrompt.classList.remove('hidden');
    }
}

function toggleAuth(mode) {
    document.getElementById('login-form').classList.toggle('hidden', mode !== 'login');
    document.getElementById('signup-form').classList.toggle('hidden', mode !== 'signup');
}

function logout() {
    localStorage.clear();
    updateUI();
}

async function handleAuth(e, type) {
    e.preventDefault();
    const username = document.getElementById(`${type}-user`).value;
    const password = document.getElementById(`${type}-pass`).value;

    const res = await fetch(`${API_BASE}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
        if (type === 'login') {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            updateUI();
        } else {
            alert("Account created! Please login.");
            toggleAuth('login');
        }
    } else {
        alert(data.error);
    }
}

async function loadComments() {
    const res = await fetch(`${API_BASE}/comments`);
    const comments = await res.json();
    const display = document.getElementById('comments-display');
    
    display.innerHTML = comments.map(c => `
    <div class="comment-card">
        <div class="comment-header">
            <span class="comment-user">@${c.username}</span>
            <span class="comment-date">${new Date(c.created_at).toLocaleDateString()}</span>
        </div>
        <p>${c.comment_text}</p>
    </div>
`).join('');
}

async function postComment(e) {
    e.preventDefault();
    const text = document.getElementById('comment-text').value;
    const token = localStorage.getItem('token');

    const res = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ text })
    });

    if (res.ok) {
        document.getElementById('comment-text').value = '';
        loadComments();
    } else {
        alert("Session expired. Please log in again.");
        logout();
    }
}

document.getElementById('login-form').addEventListener('submit', (e) => handleAuth(e, 'login'));
document.getElementById('signup-form').addEventListener('submit', (e) => handleAuth(e, 'signup'));
document.getElementById('comment-form').addEventListener('submit', postComment);

document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    loadComments();
});