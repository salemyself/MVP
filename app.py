from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_mail import Mail, Message
from models import db, User, ChatHistory
from gemini_api import configure_gemini, generate_response
import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
import mimetypes

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.urandom(24),
    SQLALCHEMY_DATABASE_URI='sqlite:///database.db',
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    MAIL_SERVER='smtp.gmail.com',
    MAIL_PORT=587,
    MAIL_USE_TLS=True,
    MAIL_USERNAME=os.getenv('EMAIL_USER'),
    MAIL_PASSWORD=os.getenv('EMAIL_PASSWORD'),
    UPLOAD_FOLDER='uploads',
    MAX_CONTENT_LENGTH=16 * 1024 * 1024  # 16MB max file size
)

# Создаем папку для загрузок
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Разрешенные типы файлов
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx', 'rtf'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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

@app.route('/brand-platform')
def brand_platform():
    return render_template('brand_platform.html')

@app.route('/brandbook')
def brandbook():
    return render_template('brandbook.html')

@app.route('/chat')
def chat():
    # Получаем историю диалогов пользователя
    user_id = session.get('user_id')
    if not user_id:
        # Создаем временного пользователя для демо
        user_id = str(uuid.uuid4())
        session['user_id'] = user_id
    
    chat_history = ChatHistory.query.filter_by(user_id=user_id).order_by(ChatHistory.created_at.desc()).all()
    return render_template('chat.html', chat_history=chat_history)

@app.route('/chat/<chat_id>')
def view_chat(chat_id):
    chat = ChatHistory.query.get_or_404(chat_id)
    user_id = session.get('user_id')
    
    # Проверяем, что чат принадлежит текущему пользователю
    if chat.user_id != user_id:
        flash('Доступ запрещен', 'error')
        return redirect(url_for('chat'))
    
    return render_template('chat_view.html', chat=chat)

@app.route('/submit_chat', methods=['POST'])
def handle_chat():
    try:
        user_id = session.get('user_id')
        if not user_id:
            user_id = str(uuid.uuid4())
            session['user_id'] = user_id
        
        # Обработка файлов
        uploaded_files = []
        essay_text = ""
        
        if 'files' in request.files:
            files = request.files.getlist('files')
            for file in files:
                if file and file.filename and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    unique_filename = f"{uuid.uuid4()}_{filename}"
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(file_path)
                    uploaded_files.append({
                        'original_name': filename,
                        'file_path': file_path
                    })
                    
                    # Читаем содержимое текстовых файлов
                    if filename.endswith('.txt'):
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                essay_text += f"\n\nСодержимое файла {filename}:\n{f.read()}"
                        except:
                            try:
                                with open(file_path, 'r', encoding='cp1251') as f:
                                    essay_text += f"\n\nСодержимое файла {filename}:\n{f.read()}"
                            except:
                                essay_text += f"\n\nНе удалось прочитать файл {filename}"
        
        # Получаем текст из формы
        form_essay = request.form.get('essay', '').strip()
        requirements = request.form.get('requirements', '').strip()
        
        # Объединяем текст из формы и файлов
        final_essay = form_essay + essay_text
        
        if not final_essay or not requirements:
            return jsonify({'error': 'Заполните все поля или загрузите файлы'}), 400
        
        # Генерируем ответ
        response = generate_response(final_essay, requirements)
        
        # Сохраняем в историю
        chat_entry = ChatHistory(
            user_id=user_id,
            essay_text=final_essay[:1000] + ('...' if len(final_essay) > 1000 else ''),  # Ограничиваем длину
            requirements=requirements,
            ai_response=response.get('response', ''),
            uploaded_files=str(uploaded_files) if uploaded_files else None
        )
        db.session.add(chat_entry)
        db.session.commit()
        
        # Добавляем ID чата в ответ
        response['chat_id'] = chat_entry.id
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/delete_chat/<int:chat_id>', methods=['POST'])
def delete_chat(chat_id):
    user_id = session.get('user_id')
    chat = ChatHistory.query.get_or_404(chat_id)
    
    if chat.user_id != user_id:
        return jsonify({'error': 'Доступ запрещен'}), 403
    
    # Удаляем связанные файлы
    if chat.uploaded_files:
        try:
            import ast
            files = ast.literal_eval(chat.uploaded_files)
            for file_info in files:
                file_path = file_info.get('file_path')
                if file_path and os.path.exists(file_path):
                    os.remove(file_path)
        except:
            pass
    
    db.session.delete(chat)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/subscribe', methods=['POST'])
def subscribe():
    email = request.form.get('email')
    if not email or '@' not in email:
        return jsonify({'error': 'Неверный email адрес'}), 400
    
    try:
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Этот email уже зарегистрирован'}), 400
        
        return jsonify({'message': 'Спасибо за подписку! Мы направим вам письмо, как только бета-тестирование начнется.'})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)