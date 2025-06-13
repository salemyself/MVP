from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def __repr__(self):
        return f'<User {self.email}>'

class ChatHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False)  # UUID для анонимных пользователей
    essay_text = db.Column(db.Text, nullable=False)
    requirements = db.Column(db.Text, nullable=False)
    ai_response = db.Column(db.Text, nullable=False)
    uploaded_files = db.Column(db.Text)  # JSON строка с информацией о файлах
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ChatHistory {self.id}>'
    
    @property
    def short_essay(self):
        """Возвращает сокращенную версию эссе для отображения в списке"""
        if len(self.essay_text) > 100:
            return self.essay_text[:100] + '...'
        return self.essay_text
    
    @property
    def short_requirements(self):
        """Возвращает сокращенную версию требований для отображения в списке"""
        if len(self.requirements) > 50:
            return self.requirements[:50] + '...'
        return self.requirements