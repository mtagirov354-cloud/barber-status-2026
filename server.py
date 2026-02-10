from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for
from flask_cors import CORS
import json
import os
from datetime import datetime
from pathlib import Path

app = Flask(__name__, static_folder=None)  # Отключаем стандартный static
CORS(app)
app.secret_key = os.environ.get('SECRET_KEY', 'barber_status_2026_secret_key_prod_render')

# Конфигурация
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'BARBERSTATUSADM')
PORT = int(os.environ.get('PORT', 10000))

# Пути к файлам
BASE_DIR = Path(__file__).parent
ORDERS_FILE = BASE_DIR / "admin_panel" / "orders.json"
REVIEWS_FILE = BASE_DIR / "admin_panel" / "reviews.json"
CLIENT_DIR = BASE_DIR / "client_site"
ADMIN_DIR = BASE_DIR / "admin_panel"

# Инициализация файлов
def init_files():
    if not ORDERS_FILE.exists():
        ORDERS_FILE.parent.mkdir(exist_ok=True)
        with open(ORDERS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)
    
    if not REVIEWS_FILE.exists():
        REVIEWS_FILE.parent.mkdir(exist_ok=True)
        with open(REVIEWS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)

# Проверка аутентификации для API
def check_auth():
    return session.get('authenticated', False)

# Декоратор для защиты API
def require_auth(f):
    def decorated_function(*args, **kwargs):
        if not check_auth():
            return jsonify({'error': 'Требуется авторизация'}), 401
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

# Статические файлы для клиентского сайта
@app.route('/')
def index():
    return send_from_directory(CLIENT_DIR, 'index.html')

@app.route('/<path:path>')
def client_files(path):
    return send_from_directory(CLIENT_DIR, path)

# Аутентификация для админ-панели
@app.route('/admin', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'GET':
        return send_from_directory(ADMIN_DIR, 'login.html')
    
    # POST запрос - проверка пароля
    password = request.form.get('password', '')
    if password == ADMIN_PASSWORD:
        session['authenticated'] = True
        return redirect('/admin/admin.html')
    else:
        return '''
        <!DOCTYPE html>
        <html>
        <head>
            <title>BARBER STATUS 2026 - Ошибка входа</title>
            <style>
                body {
                    background: #000;
                    color: #fff;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .login-container {
                    background: #111;
                    padding: 3rem;
                    border-radius: 2px;
                    border: 1px solid #333;
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                }
                h1 {
                    color: #fff;
                    margin-bottom: 2rem;
                }
                .error {
                    color: #ff6b6b;
                    margin: 1rem 0;
                    padding: 1rem;
                    background: rgba(255, 107, 107, 0.1);
                    border-radius: 2px;
                }
                .btn {
                    background: #fff;
                    color: #000;
                    padding: 0.8rem 2rem;
                    text-decoration: none;
                    border-radius: 2px;
                    border: 2px solid #fff;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: inline-block;
                    margin-top: 1rem;
                }
                .btn:hover {
                    background: transparent;
                    color: #fff;
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <h1>BARBER STATUS 2026</h1>
                <div class="error">❌ Неверный пароль. Попробуйте снова.</div>
                <a href="/admin" class="btn">Вернуться к входу</a>
            </div>
        </body>
        </html>
        ''', 401

# Выход из админ-панели
@app.route('/admin/logout')
def admin_logout():
    session.pop('authenticated', None)
    return redirect('/admin')

# Защищенные статические файлы для админ-панели
@app.route('/admin/<path:path>')
def admin_files(path):
    if path == 'admin.html':
        if not check_auth():
            return redirect('/admin')
    return send_from_directory(ADMIN_DIR, path)

# API для работы с заказами
@app.route('/api/order', methods=['POST'])
def create_order():
    try:
        orders = read_data(ORDERS_FILE)
        order = request.json
        
        # Валидация
        required_fields = ['service', 'date', 'time', 'name', 'phone']
        for field in required_fields:
            if field not in order or not str(order[field]).strip():
                return jsonify({'error': f'Поле {field} обязательно'}), 400
        
        # Добавляем ID и timestamp
        order['id'] = generate_id(orders)
        order['timestamp'] = datetime.now().isoformat()
        order['status'] = 'Новая'
        
        orders.append(order)
        write_data(ORDERS_FILE, orders)
        
        # Логирование
        print("\n" + "="*50)
        print("📞 НОВАЯ ЗАЯВКА НА ЗАПИСЬ")
        print("="*50)
        print(f"   ID: #{order['id']}")
        print(f"   👤 Имя: {order['name']}")
        print(f"   📱 Телефон: {order['phone']}")
        print(f"   ✂️ Услуга: {order['service']}")
        print(f"   📅 Дата: {order['date']}")
        print(f"   ⏰ Время: {order['time']}")
        print("="*50 + "\n")
        
        return jsonify(order), 201
    except Exception as e:
        print(f"❌ Ошибка создания заявки: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/orders', methods=['GET'])
@require_auth
def get_orders():
    try:
        orders = read_data(ORDERS_FILE)
        # Сортируем по дате (новые сначала)
        orders.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return jsonify(orders)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/order/<int:order_id>', methods=['PUT'])
@require_auth
def update_order(order_id):
    try:
        orders = read_data(ORDERS_FILE)
        
        for order in orders:
            if order['id'] == order_id:
                data = request.json
                if 'status' in data:
                    old_status = order['status']
                    order['status'] = data['status']
                    print(f"📝 Статус заявки #{order_id} изменен: {old_status} → {order['status']}")
                write_data(ORDERS_FILE, orders)
                return jsonify(order)
        
        return jsonify({'error': 'Заказ не найден'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/order/<int:order_id>', methods=['DELETE'])
@require_auth
def delete_order(order_id):
    try:
        orders = read_data(ORDERS_FILE)
        new_orders = [order for order in orders if order['id'] != order_id]
        
        if len(new_orders) == len(orders):
            return jsonify({'error': 'Заказ не найден'}), 404
        
        write_data(ORDERS_FILE, new_orders)
        print(f"🗑️ Заявка #{order_id} удалена")
        return jsonify({'message': 'Заказ удален'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# API для работы с отзывами
@app.route('/api/review', methods=['POST'])
def create_review():
    try:
        reviews = read_data(REVIEWS_FILE)
        review = request.json
        
        # Валидация
        required_fields = ['name', 'rating', 'text']
        for field in required_fields:
            if field not in review or not str(review[field]).strip():
                return jsonify({'error': f'Поле {field} обязательно'}), 400
        
        # Проверка рейтинга
        try:
            rating = int(review['rating'])
            if not 1 <= rating <= 5:
                return jsonify({'error': 'Рейтинг должен быть от 1 до 5'}), 400
        except ValueError:
            return jsonify({'error': 'Некорректный рейтинг'}), 400
        
        # Добавляем ID и дату
        review['id'] = generate_id(reviews)
        review['date'] = datetime.now().isoformat()
        review['approved'] = False  # Новые отзывы требуют модерации
        
        reviews.append(review)
        write_data(REVIEWS_FILE, reviews)
        
        # Логирование
        print("\n" + "="*50)
        print("⭐ НОВЫЙ ОТЗЫВ")
        print("="*50)
        print(f"   ID: #{review['id']}")
        print(f"   👤 Имя: {review['name']}")
        print(f"   ⭐ Рейтинг: {review['rating']}/5")
        print(f"   ✂️ Услуга: {review.get('service', 'Не указана')}")
        print(f"   📝 Статус: На модерации")
        print("="*50 + "\n")
        
        return jsonify(review), 201
    except Exception as e:
        print(f"❌ Ошибка создания отзыва: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    try:
        reviews = read_data(REVIEWS_FILE)
        
        # Для клиентов возвращаем только одобренные отзывы
        if request.args.get('approved') == 'true':
            reviews = [r for r in reviews if r.get('approved') == True]
        
        # Сортируем по дате (новые сначала)
        reviews.sort(key=lambda x: x.get('date', ''), reverse=True)
        return jsonify(reviews)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/review/<int:review_id>', methods=['GET'])
@require_auth
def get_review(review_id):
    try:
        reviews = read_data(REVIEWS_FILE)
        for review in reviews:
            if review['id'] == review_id:
                return jsonify(review)
        return jsonify({'error': 'Отзыв не найден'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/review/<int:review_id>', methods=['PUT'])
@require_auth
def update_review(review_id):
    try:
        reviews = read_data(REVIEWS_FILE)
        
        for review in reviews:
            if review['id'] == review_id:
                data = request.json
                if 'approved' in data:
                    old_status = review.get('approved')
                    review['approved'] = data['approved']
                    
                    status_text = "одобрен" if data['approved'] == True else "отклонен" if data['approved'] is None else "снят с модерации"
                    print(f"📝 Отзыв #{review_id} {status_text}")
                
                write_data(REVIEWS_FILE, reviews)
                return jsonify(review)
        
        return jsonify({'error': 'Отзыв не найден'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/review/<int:review_id>', methods=['DELETE'])
@require_auth
def delete_review(review_id):
    try:
        reviews = read_data(REVIEWS_FILE)
        new_reviews = [r for r in reviews if r['id'] != review_id]
        
        if len(new_reviews) == len(reviews):
            return jsonify({'error': 'Отзыв не найден'}), 404
        
        write_data(REVIEWS_FILE, new_reviews)
        print(f"🗑️ Отзыв #{review_id} удален")
        return jsonify({'message': 'Отзыв удален'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Вспомогательные функции
def read_data(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def write_data(file_path, data):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def generate_id(data):
    if not data:
        return 1
    return max([item.get('id', 0) for item in data]) + 1

# Инициализация при запуске
init_files()

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 BARBER STATUS 2026 - ЗАПУСК НА RENDER")
    print("="*60)
    print(f"📍 Адрес: Республика Дагестан, Дербент, ул. Гагарина, 12")
    print(f"📱 Телефон: +7 963 426-22-33")
    print(f"🔐 Пароль админки: {ADMIN_PASSWORD}")
    print("="*60)
    print(f"🌍 Порт: {PORT}")
    print("="*60 + "\n")
    
    app.run(debug=False, host='0.0.0.0', port=PORT)