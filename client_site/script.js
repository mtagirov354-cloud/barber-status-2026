// Данные услуг
const services = [
    {
        id: 1,
        name: "Детская стрижка",
        price: "500 ₽",
        description: "Аккуратно, быстро и комфортно. Подберём форму под возраст и тип волос, создадим стильный образ без стресса для ребёнка.",
        details: "Опытный барбер и дружелюбная атмосфера."
    },
    {
        id: 2,
        name: "Биозавивка",
        price: "4000 ₽",
        description: "Стойкий объём и естественные локоны без вреда для волос. Мягкий состав, аккуратная техника.",
        details: "Подходит для мужских стрижек любой длины."
    },
    {
        id: 3,
        name: "Бритье опасным лезвием",
        price: "500 ₽",
        description: "Идеально гладкая кожа и чёткие контуры. Классическая техника, горячие полотенца и профессиональные средства.",
        details: "Комфорт, точность и настоящий мужской ритуал."
    },
    {
        id: 4,
        name: "Мужская стрижка",
        price: "800 ₽",
        description: "Точная работа барбера, стиль и аккуратность. Подберём форму под тип лица, учтём рост волос и тренды.",
        details: "Классика или современный образ — качественно и со вкусом."
    },
    {
        id: 5,
        name: "Обучение «Барбер с нуля»",
        price: "1 ₽",
        description: "Практический курс в барбершопе для начинающих. Освоите мужские стрижки, бритьё, работу с бородой.",
        details: "Опытные наставники, практика на моделях."
    },
    {
        id: 6,
        name: "Камуфляж Седины",
        price: "500 ₽",
        description: "Естественный результат без эффекта окрашивания. Мягко выравниваем тон волос и бороды.",
        details: "Сохраняем мужской стиль и ухоженный вид."
    },
    {
        id: 7,
        name: "Уход за кожей лица",
        price: "400 ₽",
        description: "Очищение, увлажнение и восстановление мужской кожи. Профессиональные средства, расслабляющая процедура.",
        details: "Свежий, ухоженный и здоровый вид."
    },
    {
        id: 8,
        name: "Моделирование бороды / бритье",
        price: "500 ₽",
        description: "Чёткие линии, аккуратная форма и ухоженный вид. Подберём стиль под лицо.",
        details: "Классическое или королевское бритьё."
    },
    {
        id: 9,
        name: "Коррекция воском",
        price: "200 ₽",
        description: "Быстрое и эффективное удаление нежелательных волос. Чёткие линии, аккуратный результат.",
        details: "Подходит для бровей, ушей, носа и зоны бороды."
    }
];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Отображение услуг
    const servicesGrid = document.querySelector('.services-grid');
    
    services.forEach(service => {
        const serviceCard = document.createElement('div');
        serviceCard.className = 'service-card';
        serviceCard.innerHTML = `
            <h3>${service.name}</h3>
            <div class="price">${service.price}</div>
            <p class="description">${service.description}</p>
            <p class="details">${service.details}</p>
        `;
        servicesGrid.appendChild(serviceCard);
    });
    
    // Установка минимальной даты на сегодня
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.min = today;
        dateInput.value = today;
    }
    
    // Инициализация отзывов
    loadReviews();
    
    // Инициализация модального окна для изображений
    initImageModal();
    
    // Обработчик формы записи
    const bookingForm = document.getElementById('bookingForm');
    const messageDiv = document.getElementById('message');
    
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                service: document.getElementById('service').value,
                date: document.getElementById('date').value,
                time: document.getElementById('time').value,
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                timestamp: new Date().toISOString(),
                status: 'Новая'
            };
            
            try {
                const response = await fetch('http://localhost:5000/api/order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    showMessage('✅ Запись успешно отправлена! Мы свяжемся с вами для подтверждения.', 'success');
                    bookingForm.reset();
                    dateInput.value = today;
                } else {
                    showMessage('❌ Ошибка при отправке. Попробуйте позже.', 'error');
                }
            } catch (error) {
                showMessage('❌ Ошибка соединения. Проверьте интернет.', 'error');
            }
        });
    }
    
    // Обработчик формы отзыва
    const reviewForm = document.getElementById('reviewForm');
    const reviewMessage = document.getElementById('reviewMessage');
    const charCount = document.getElementById('charCount');
    const reviewText = document.getElementById('reviewText');
    
    if (reviewForm) {
        reviewForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('reviewName').value,
                rating: parseInt(document.querySelector('input[name="rating"]:checked').value),
                service: document.getElementById('reviewService').value,
                text: document.getElementById('reviewText').value,
                date: new Date().toISOString(),
                approved: false
            };
            
            try {
                const response = await fetch('http://localhost:5000/api/review', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    showReviewMessage('✅ Спасибо за ваш отзыв! Он появится после проверки администратором.', 'success');
                    reviewForm.reset();
                    loadReviews();
                } else {
                    showReviewMessage('❌ Ошибка при отправке отзыва. Попробуйте позже.', 'error');
                }
            } catch (error) {
                showReviewMessage('❌ Ошибка соединения. Проверьте интернет.', 'error');
            }
        });
    }
    
    // Счетчик символов для отзыва
    if (reviewText) {
        reviewText.addEventListener('input', function() {
            const remaining = 500 - this.value.length;
            charCount.textContent = remaining;
            charCount.style.color = remaining < 50 ? '#ff6b6b' : '#fff';
        });
    }
    
    // Плавная прокрутка для якорных ссылок
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Загрузка отзывов
async function loadReviews() {
    try {
        const response = await fetch('http://localhost:5000/api/reviews?approved=true');
        const reviews = await response.json();
        
        displayReviews(reviews);
        updateReviewStats(reviews);
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
    }
}

// Отображение отзывов
function displayReviews(reviews) {
    const reviewsGrid = document.getElementById('reviewsGrid');
    if (!reviewsGrid) return;
    
    reviewsGrid.innerHTML = '';
    
    // Сортируем по дате (новые сначала)
    reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Ограничиваем количество отображаемых отзывов
    const displayReviews = reviews.slice(0, 6);
    
    if (displayReviews.length === 0) {
        reviewsGrid.innerHTML = `
            <div class="no-reviews" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p style="color: #888; font-size: 1.2rem;">Пока нет отзывов. Будьте первым!</p>
            </div>
        `;
        return;
    }
    
    displayReviews.forEach(review => {
        const reviewCard = document.createElement('div');
        reviewCard.className = 'review-card';
        
        // Форматируем дату
        const reviewDate = new Date(review.date);
        const formattedDate = reviewDate.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        // Создаем звезды рейтинга
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += i <= review.rating ? '★' : '☆';
        }
        
        reviewCard.innerHTML = `
            <div class="review-header">
                <div class="reviewer-info">
                    <h4>${review.name}</h4>
                    <div class="review-date">${formattedDate}</div>
                </div>
                <div class="review-rating">${stars}</div>
            </div>
            
            ${review.service ? `<div class="review-service">${review.service}</div>` : ''}
            
            <p class="review-text">${review.text}</p>
        `;
        
        reviewsGrid.appendChild(reviewCard);
    });
}

// Обновление статистики отзывов
function updateReviewStats(reviews) {
    if (reviews.length === 0) {
        document.getElementById('averageRating').textContent = '5.0';
        document.getElementById('totalReviews').textContent = '0';
        return;
    }
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = (totalRating / reviews.length).toFixed(1);
    
    document.getElementById('averageRating').textContent = averageRating;
    document.getElementById('totalReviews').textContent = reviews.length;
}

// Показать сообщение для записи
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Показать сообщение для отзывов
function showReviewMessage(text, type) {
    const messageDiv = document.getElementById('reviewMessage');
    if (!messageDiv) return;
    
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Модальное окно для изображений
function initImageModal() {
    const modal = document.getElementById('imageModal');
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.review-image-modal-close');
    const modalImg = modal.querySelector('#modalImage');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    window.openImageModal = function(src) {
        modalImg.src = src;
        modal.style.display = 'block';
    };
} 
