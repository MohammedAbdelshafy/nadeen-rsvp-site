document.addEventListener('DOMContentLoaded', () => {
    let allRsvps = [];
    let currentFilter = 'all';
    let currentSearch = '';

    const authOverlay = document.getElementById('authOverlay');
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('passwordInput');
    const loginError = document.getElementById('loginError');

    const refreshBtn = document.getElementById('refreshBtn');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    const telegramExportBtn = document.getElementById('telegramExportBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    const statTotal = document.getElementById('statTotal');
    const statAttending = document.getElementById('statAttending');
    const statNotAttending = document.getElementById('statNotAttending');
    const statBeef = document.getElementById('statBeef');
    const statChicken = document.getElementById('statChicken');

    const tableBody = document.getElementById('rsvpsTableBody');
    const searchInput = document.getElementById('searchInput');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // Get API base url if hosted externally
    const getApiUrl = (endpoint) => {
        const base = window.API_BASE_URL || '';
        return `${base}${endpoint}`;
    };

    const getAuthToken = () => sessionStorage.getItem('admin_token') || '';

    // Check existing session
    const checkAuth = async () => {
        const token = getAuthToken();
        if (!token) {
            authOverlay.classList.remove('hidden');
            return;
        }

        try {
            await fetchRsvps(token);
            authOverlay.classList.add('hidden');
        } catch (err) {
            sessionStorage.removeItem('admin_token');
            authOverlay.classList.remove('hidden');
        }
    };

    // Login Form Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd = passwordInput.value.trim();
        loginError.classList.add('hidden');

        try {
            await fetchRsvps(pwd);
            sessionStorage.setItem('admin_token', pwd);
            authOverlay.classList.add('hidden');
            passwordInput.value = '';
        } catch (err) {
            loginError.textContent = err.message || 'Invalid password';
            loginError.classList.remove('hidden');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('admin_token');
        authOverlay.classList.remove('hidden');
        allRsvps = [];
        renderTable();
    });

    // Fetch RSVPs
    async function fetchRsvps(token = getAuthToken()) {
        tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">Loading latest responses...</td></tr>';
        
        const response = await fetch(getApiUrl('/api/admin/rsvps'), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-admin-password': token
            }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to authenticate');
        }

        const data = await response.json();
        allRsvps = data.rsvps || [];

        // Update stats
        const summary = data.summary || {};
        statTotal.textContent = summary.total ?? 0;
        statAttending.textContent = summary.attending ?? 0;
        statNotAttending.textContent = summary.notAttending ?? 0;
        statBeef.textContent = summary.beef ?? 0;
        statChicken.textContent = summary.chicken ?? 0;

        renderTable();
    }

    // Render Table
    function renderTable() {
        const filtered = allRsvps.filter(r => {
            // Tab filter
            if (currentFilter === 'attending' && !r.attending) return false;
            if (currentFilter === 'declined' && r.attending) return false;

            // Search filter
            if (currentSearch) {
                const q = currentSearch.toLowerCase();
                const nameMatch = (r.name || '').toLowerCase().includes(q);
                const phoneMatch = (r.phone || '').includes(q);
                const msgMatch = (r.message || '').toLowerCase().includes(q);
                return nameMatch || phoneMatch || msgMatch;
            }

            return true;
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No guest responses found.</td></tr>';
            return;
        }

        tableBody.innerHTML = filtered.map(r => {
            const statusBadge = r.attending
                ? '<span class="badge badge-attending">✅ Attending</span>'
                : '<span class="badge badge-declined">❌ Declined</span>';

            const mealBadge = r.attending && r.meal
                ? `<span class="badge badge-meal">${r.meal === 'beef' ? '🍔 Beef' : '🍗 Chicken'}</span>`
                : '<span style="color:#aaa;">—</span>';

            const formattedDate = r.created_at
                ? new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                : '—';

            return `
                <tr>
                    <td style="font-weight:600;">${escapeHtml(r.name)}</td>
                    <td><a href="https://wa.me/${encodeURIComponent((r.phone || '').replace(/\+/g, ''))}" target="_blank" style="color:var(--primary);text-decoration:none;">${escapeHtml(r.phone)}</a></td>
                    <td>${statusBadge}</td>
                    <td>${mealBadge}</td>
                    <td>${escapeHtml(r.dietary || '—')}</td>
                    <td>${escapeHtml(r.message || '—')}</td>
                    <td style="font-size:12px;color:var(--text-muted);">${formattedDate}</td>
                </tr>
            `;
        }).join('');
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Event Listeners for Filters
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTable();
        });
    });

    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.trim();
        renderTable();
    });

    refreshBtn.addEventListener('click', () => {
        fetchRsvps().catch(err => alert(err.message));
    });

    // Download CSV
    downloadCsvBtn.addEventListener('click', () => {
        const token = getAuthToken();
        if (!token) return;
        window.open(getApiUrl(`/api/admin/export?action=download&token=${encodeURIComponent(token)}`), '_blank');
    });

    // Send to Telegram
    telegramExportBtn.addEventListener('click', async () => {
        const token = getAuthToken();
        if (!token) return;

        telegramExportBtn.disabled = true;
        telegramExportBtn.textContent = '⏳ Sending to Telegram...';

        try {
            const res = await fetch(getApiUrl('/api/admin/export?action=telegram'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-admin-password': token
                }
            });

            const result = await res.json();
            if (res.ok && result.success) {
                alert('🎉 ' + result.message);
            } else {
                alert('⚠️ Telegram delivery error: ' + (result.error || 'Unknown failure'));
            }
        } catch (err) {
            alert('⚠️ Network error: ' + err.message);
        } finally {
            telegramExportBtn.disabled = false;
            telegramExportBtn.textContent = '✈️ Send to Telegram';
        }
    });

    // Init
    checkAuth();
});
