from flask import Flask, render_template, request, jsonify
from flask_mail import Mail, Message
from models import db, User
from gemini_api import configure_gemini, generate_response
import os

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.urandom(24),
    SQLALCHEMY_DATABASE_URI='sqlite:///database.db',
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    MAIL_SERVER='smtp.gmail.com',
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME=os.getenv('EMAIL_USER'),
    MAIL_PASSWORD=os.getenv('EMAIL_PASSWORD')
)

# Инициализация компонентов
db.init_app(app)
mail = Mail(app)
configure_gemini('AIzaSyCwl50JbBcnyHLDEuYsnIP3xBhk5NJzCyo')

# Создание таблиц БД
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit_chat', methods=['POST'])
def handle_chat():
    try:
        data = request.json
        essay = data.get('essay')
        requirements = data.get('requirements')
        
        if not essay or not requirements:
            return jsonify({'error': 'Заполните все поля'}), 400
        
        response = generate_response(essay, requirements)
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/subscribe', methods=['POST'])
def subscribe():
    email = request.form.get('email')
    if not email or '@' not in email:
        return jsonify({'error': 'Неверный email адрес'}), 400
    
    try:
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Этот email уже зарегистрирован'}), 400
        
        #new_user = User(email=email)
        #db.session.add(new_user)
        #db.session.commit()
        
        # Отправка письма
        #msg = Message(
        #    'Добро пожаловать в Проверяй.AI',
        #    sender=app.config['MAIL_USERNAME'],
        #    recipients=[email]
        #)
        #msg.body = f'''Спасибо за подписку!
        #Вы получите уведомление, как только сервис станет доступен.
        #'''
        #mail.send(msg)
        
        return jsonify({'message': 'Спасибо за подписку! Мы направим вам письмо, как только бета-тестирование начнется.'})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
