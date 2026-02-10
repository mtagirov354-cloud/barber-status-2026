let currentOrderId = null;
let currentReviewId = null;
const modal = document.getElementById('statusModal');
const closeBtn = document.querySelector('.close');
const saveBtn = document.getElementById('saveStatus');

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    updateDate();
    checkAuthAndLoadData();
    setupEventListeners();
});

// Проверка аутентификации и загрузка данных
async function checkAuthAndLoadData() {
    try {
        await loadOrders();
        await loadReviews();
    } catch (error) {
        if (error.status === 401) {
            // Не авторизован, перенаправляем на страницу входа
            window.location.href = '/admin';
            return;
        }
        console.error('Ошибка загрузки данных:', error);
        showNotification('❌ Ошибка загрузки данных', 'error');
    }
}

// Обновление даты
function updateDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('currentDate').textContent = 
        now.toLocaleDateString('ru-RU', options);
}

// Загрузка заявок с обработкой ошибок
async function loadOrders() {
    try {
        const response = await fetch('http://localhost:5000/api/orders');
        
        if (response.status === 401) {
            throw { status: 401, message: 'Требуется авторизация' };
        }
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const orders = await response.json();
        displayOrders(orders);
        updateStats(orders);
    } catch (error) {
        if (error.status === 401) {
            throw error; // Пробрасываем дальше для обработки
        }
        console.error('Ошибка загрузки заявок:', error);
        showNotification('❌ Ошибка загрузки заявок', 'error');
    }
}

// Отображение заявок в таблице
function displayOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';
    
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    const filteredOrders = orders.filter(order => {
        if (statusFilter !== 'all' && order.status !== statusFilter) return false;
        if (dateFilter && order.date !== dateFilter) return false;
        return true;
    });
    
    filteredOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${formatDate(order.date)}</td>
            <td>${order.time}</td>
            <td>${order.name}</td>
            <td><a href="tel:${order.phone}">${order.phone}</a></td>
            <td>${order.service}</td>
            <td><span class="status-badge status-${getStatusClass(order.status)}">${order.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action" onclick="changeStatus(${order.id}, '${order.name}', '${order.service}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action" onclick="deleteOrder(${order.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Обновление статистики
function updateStats(orders) {
    const now = new Date().toISOString().split('T')[0];
    
    const newOrders = orders.filter(o => o.status === 'Новая').length;
    const todayOrders = orders.filter(o => o.date === now).length;
    const completedOrders = orders.filter(o => o.status === 'Выполнена').length;
    const totalOrders = orders.length;
    
    document.getElementById('newOrders').textContent = newOrders;
    document.getElementById('todayOrders').textContent = todayOrders;
    document.getElementById('completedOrders').textContent = completedOrders;
    document.getElementById('totalOrders').textContent = totalOrders;
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Получение класса для статуса
function getStatusClass(status) {
    const classes = {
        'Новая': 'new',
        'Подтверждена': 'confirmed',
        'Выполнена': 'completed',
        'Отменена': 'cancelled'
    };
    return classes[status] || 'new';
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка обновления
    document.getElementById('refreshBtn').addEventListener('click', () => {
        checkAuthAndLoadData();
        showNotification('✅ Данные обновлены', 'success');
    });
    
    // Фильтры заявок
    document.getElementById('statusFilter').addEventListener('change', () => loadOrders().catch(console.error));
    document.getElementById('dateFilter').addEventListener('change', () => loadOrders().catch(console.error));
    document.getElementById('clearFilters').addEventListener('click', () => {
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('dateFilter').value = '';
        loadOrders().catch(console.error);
    });
    
    // Модальное окно
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    saveBtn.addEventListener('click', saveStatus);
    
    // Клик вне модального окна
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    
    // Кнопки изменения статуса
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.status-btn').forEach(b => b.style.opacity = '1');
            this.style.opacity = '0.7';
        });
    });
    
    // Автообновление каждые 30 секунд
    setInterval(() => {
        loadOrders().catch(console.error);
        loadReviews().catch(console.error);
    }, 30000);
}

// Изменение статуса заявки
function changeStatus(id, name, service) {
    currentOrderId = id;
    document.getElementById('modalOrderInfo').textContent = 
        `Заявка #${id}: ${name} - ${service}`;
    
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.style.opacity = '1';
    });
    
    modal.style.display = 'block';
}

// Сохранение статуса с проверкой авторизации
async function saveStatus() {
    if (!currentOrderId) return;
    
    const activeBtn = document.querySelector('.status-btn[style*="opacity: 0.7"]');
    if (!activeBtn) {
        showNotification('⚠️ Выберите статус', 'warning');
        return;
    }
    
    const newStatus = activeBtn.dataset.status;
    
    try {
        const response = await fetch(`http://localhost:5000/api/order/${currentOrderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.status === 401) {
            window.location.href = '/admin';
            return;
        }
        
        if (response.ok) {
            modal.style.display = 'none';
            await loadOrders();
            showNotification(`✅ Статус заявки #${currentOrderId} изменен на "${newStatus}"`, 'success');
        } else {
            throw new Error('Ошибка обновления');
        }
    } catch (error) {
        console.error('Ошибка обновления статуса:', error);
        showNotification('❌ Ошибка обновления статуса', 'error');
    }
}

// Удаление заявки с проверкой авторизации
async function deleteOrder(id) {
    if (!confirm('Удалить эту заявку?')) return;
    
    try {
        const response = await fetch(`http://localhost:5000/api/order/${id}`, {
            method: 'DELETE'
        });
        
        if (response.status === 401) {
            window.location.href = '/admin';
            return;
        }
        
        if (response.ok) {
            await loadOrders();
            showNotification(`✅ Заявка #${id} удалена`, 'success');
        } else {
            throw new Error('Ошибка удаления');
        }
    } catch (error) {
        console.error('Ошибка удаления заявки:', error);
        showNotification('❌ Ошибка удаления заявки', 'error');
    }
}

// Загрузка отзывов в админке
async function loadReviews() {
    try {
        const response = await fetch('http://localhost:5000/api/reviews');
        
        if (response.status === 401) {
            throw { status: 401, message: 'Требуется авторизация' };
        }
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const reviews = await response.json();
        displayReviewsInAdmin(reviews);
        setupReviewFilters();
    } catch (error) {
        if (error.status === 401) {
            throw error;
        }
        console.error('Ошибка загрузки отзывов:', error);
        showNotification('❌ Ошибка загрузки отзывов', 'error');
    }
}

// Отображение отзывов в админ-панели
function displayReviewsInAdmin(reviews) {
    const tbody = document.getElementById('reviewsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const statusFilter = document.getElementById('reviewStatusFilter')?.value || 'all';
    const ratingFilter = document.getElementById('reviewRatingFilter')?.value || 'all';
    const searchFilter = document.getElementById('reviewSearch')?.value.toLowerCase() || '';
    
    const filteredReviews = reviews.filter(review => {
        // Фильтр по статусу
        if (statusFilter !== 'all') {
            const statusMap = {
                'pending': false,
                'approved': true,
                'rejected': null
            };
            if (review.approved !== statusMap[statusFilter]) return false;
        }
        
        // Фильтр по рейтингу
        if (ratingFilter !== 'all' && review.rating != ratingFilter) return false;
        
        // Фильтр по поиску
        if (searchFilter) {
            const searchText = searchFilter.toLowerCase();
            const nameMatch = review.name.toLowerCase().includes(searchText);
            const textMatch = review.text.toLowerCase().includes(searchText);
            if (!nameMatch && !textMatch) return false;
        }
        
        return true;
    });
    
    // Сортируем по дате (новые сначала)
    filteredReviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    filteredReviews.forEach(review => {
        const row = document.createElement('tr');
        
        // Форматируем дату
        const reviewDate = new Date(review.date);
        const formattedDate = reviewDate.toLocaleDateString('ru-RU');
        
        // Определяем статус
        let statusText, statusClass;
        if (review.approved === true) {
            statusText = 'Одобрен';
            statusClass = 'approved';
        } else if (review.approved === false) {
            statusText = 'На модерации';
            statusClass = 'pending';
        } else {
            statusText = 'Отклонен';
            statusClass = 'rejected';
        }
        
        // Создаем звезды рейтинга
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= review.rating ? '★' : '☆';
        }
        
        // Обрезаем текст для отображения
        const shortText = review.text.length > 100 
            ? review.text.substring(0, 100) + '...' 
            : review.text;
        
        row.innerHTML = `
            <td>${review.id}</td>
            <td>${formattedDate}</td>
            <td>${review.name}</td>
            <td>${review.service || '—'}</td>
            <td class="review-rating-cell">${stars}</td>
            <td class="review-text-cell" title="${review.text}">
                ${shortText}
                ${review.text.length > 100 ? 
                    `<button class="btn-action" onclick="showFullReview(${review.id})">
                        <i class="fas fa-expand"></i>
                    </button>` : ''}
            </td>
            <td><span class="review-status status-${statusClass}">${statusText}</span></td>
            <td>
                <div class="review-actions">
                    ${review.approved !== true ? 
                        `<button class="review-action-btn approve" onclick="approveReview(${review.id})">
                            <i class="fas fa-check"></i> Одобрить
                        </button>` : ''}
                    
                    ${review.approved !== false ? 
                        `<button class="review-action-btn reject" onclick="rejectReview(${review.id})">
                            <i class="fas fa-times"></i> Отклонить
                        </button>` : ''}
                    
                    <button class="review-action-btn delete" onclick="deleteReview(${review.id})">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Настройка фильтров для отзывов
function setupReviewFilters() {
    const statusFilter = document.getElementById('reviewStatusFilter');
    const ratingFilter = document.getElementById('reviewRatingFilter');
    const searchInput = document.getElementById('reviewSearch');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => loadReviews().catch(console.error));
    }
    
    if (ratingFilter) {
        ratingFilter.addEventListener('change', () => loadReviews().catch(console.error));
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => loadReviews().catch(console.error), 300));
    }
}

// Функция debounce для поиска
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Одобрить отзыв с проверкой авторизации
async function approveReview(id) {
    try {
        const response = await fetch(`http://localhost:5000/api/review/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ approved: true })
        });
        
        if (response.status === 401) {
            window.location.href = '/admin';
            return;
        }
        
        if (response.ok) {
            await loadReviews();
            showNotification(`✅ Отзыв #${id} одобрен`, 'success');
        } else {
            throw new Error('Ошибка одобрения');
        }
    } catch (error) {
        console.error('Ошибка одобрения отзыва:', error);
        showNotification('❌ Ошибка при одобрении отзыва', 'error');
    }
}

// Отклонить отзыв с проверкой авторизации
async function rejectReview(id) {
    try {
        const response = await fetch(`http://localhost:5000/api/review/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ approved: null })
        });
        
        if (response.status === 401) {
            window.location.href = '/admin';
            return;
        }
        
        if (response.ok) {
            await loadReviews();
            showNotification(`✅ Отзыв #${id} отклонен`, 'success');
        } else {
            throw new Error('Ошибка отклонения');
        }
    } catch (error) {
        console.error('Ошибка отклонения отзыва:', error);
        showNotification('❌ Ошибка при отклонении отзыва', 'error');
    }
}

// Удалить отзыв с проверкой авторизации
async function deleteReview(id) {
    if (!confirm('Удалить этот отзыв?')) return;
    
    try {
        const response = await fetch(`http://localhost:5000/api/review/${id}`, {
            method: 'DELETE'
        });
        
        if (response.status === 401) {
            window.location.href = '/admin';
            return;
        }
        
        if (response.ok) {
            await loadReviews();
            showNotification(`✅ Отзыв #${id} удален`, 'success');
        } else {
            throw new Error('Ошибка удаления');
        }
    } catch (error) {
        console.error('Ошибка удаления отзыва:', error);
        showNotification('❌ Ошибка при удалении отзыва', 'error');
    }
}

// Показать полный текст отзыва с проверкой авторизации
async function showFullReview(id) {
    try {
        const response = await fetch(`http://localhost:5000/api/review/${id}`);
        
        if (response.status === 401) {
            window.location.href = '/admin';
            return;
        }
        
        const review = await response.json();
        
        // Создаем модальное окно если его нет
        let modal = document.getElementById('reviewFullModal');
        const modalTitle = document.getElementById('modalReviewTitle');
        const modalContent = document.getElementById('modalReviewContent');
        
        const reviewDate = new Date(review.date);
        const formattedDate = reviewDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        modalTitle.textContent = `Отзыв #${review.id}`;
        
        modalContent.innerHTML = `
            <p><strong>👤 Клиент:</strong> ${review.name}</p>
            <p><strong>📅 Дата:</strong> ${formattedDate}</p>
            <p><strong>✂️ Услуга:</strong> ${review.service || 'Не указана'}</p>
            <p><strong>⭐ Оценка:</strong> ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</p>
            <div class="review-full-text">${review.text}</div>
        `;
        
        modal.style.display = 'block';
        
        // Добавляем обработчик закрытия
        const closeBtn = modal.querySelector('.review-full-modal-close');
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    } catch (error) {
        console.error('Ошибка загрузки отзыва:', error);
        showNotification('❌ Ошибка загрузки отзыва', 'error');
    }
}

// Показать уведомление
function showNotification(message, type) {
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#222' : type === 'warning' ? '#332200' : '#331111'};
        color: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#ff6b6b'};
        border: 1px solid ${type === 'success' ? '#333' : type === 'warning' ? '#664400' : '#662222'};
        border-radius: 2px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Добавляем анимации для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Кнопка выхода
document.addEventListener('DOMContentLoaded', function() {
    // Добавляем кнопку выхода в хедер
    const adminHeader = document.querySelector('.admin-header .admin-info');
    if (adminHeader) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn-refresh';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Выйти';
        logoutBtn.style.marginLeft = '1rem';
        logoutBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите выйти?')) {
                window.location.href = '/admin/logout';
            }
        });
        adminHeader.appendChild(logoutBtn);
    }
});