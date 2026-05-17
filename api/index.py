from flask import Flask, request, jsonify, render_template, Response, stream_with_context, redirect, url_for, flash
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from huggingface_hub import InferenceClient
import os
import json
import uuid
from datetime import datetime, timezone
from functools import wraps

app = Flask(__name__, template_folder='../templates', static_folder='../static')

# Configuration Production
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'liteai-super-secret-key')

# Sur Vercel, utilisez une DB externe (Postgres). SQLite ne fonctionnera pas en prod.
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'sqlite:///liteai.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app)
db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# --- Modèles de Données ---

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    api_keys = db.relationship('ApiKey', backref='owner', lazy=True)
    sessions = db.relationship('ChatSession', backref='user', lazy=True)

class ApiKey(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    usage_count = db.Column(db.Integer, default=0)
    last_used = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class ChatSession(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(100), default="Nouvelle conversation")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    messages = db.relationship('Message', backref='session', lazy=True, cascade="all, delete-orphan")

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(36), db.ForeignKey('chat_session.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

# --- Configuration IA ---
HF_TOKEN = os.environ.get('HF_TOKEN')
if not HF_TOKEN:
    raise RuntimeError("La variable d'environnement HF_TOKEN est requise.")
MODEL_ID = os.environ.get('MODEL_ID', "Qwen/Qwen3-32B")
client = InferenceClient(provider="novita", api_key=HF_TOKEN)

# --- Helpers ---

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key_str = request.headers.get('X-API-Key')
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            api_key_str = auth_header.split(' ')[1]
            
        key_obj = ApiKey.query.filter_by(key=api_key_str).first()
        if not key_obj:
            return jsonify({"error": "Clé API invalide"}), 401
        
        key_obj.usage_count += 1
        key_obj.last_used = datetime.now(timezone.utc)
        db.session.commit()
        
        request.api_key_owner = key_obj.user_id
        return f(*args, **kwargs)
    return decorated

# --- Routes UI ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('index'))
        flash('Identifiants invalides')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/docs')
@login_required
def docs():
    return render_template('docs.html')

@app.route('/admin/keys')
@login_required
def admin_keys():
    if not current_user.is_admin:
        return "Accès refusé", 403
    keys = ApiKey.query.all()
    users = User.query.all()
    return render_template('admin_keys.html', keys=keys, users=users)

# --- Routes API Chat ---

@app.route('/api/chat', methods=['POST'])
@require_api_key
def chat():
    data = request.json
    session_id = data.get('session_id')
    user_id = request.api_key_owner or (current_user.id if current_user.is_authenticated else None)
    
    if not session_id:
        session_id = str(uuid.uuid4())
        new_sess = ChatSession(id=session_id, user_id=user_id)
        db.session.add(new_sess)
    
    sess = db.session.get(ChatSession, session_id)
    history = [{"role": m.role, "content": m.content} for m in sess.messages]
    
    user_content = data.get('message') or data.get('messages')[-1]['content']
    db.session.add(Message(session_id=session_id, role='user', content=user_content))
    
    full_messages = history + [{"role": "user", "content": user_content}]
    
    try:
        response = client.chat.completions.create(
            model=MODEL_ID,
            messages=full_messages,
            max_tokens=1024,
            temperature=0.7
        )
        ai_content = response.choices[0].message.content
        db.session.add(Message(session_id=session_id, role='assistant', content=ai_content))
        db.session.commit()
        
        return jsonify({"session_id": session_id, "response": ai_content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/v1/chat/completions', methods=['POST'])
@require_api_key
def openai_compat_chat():
    return chat()

@app.route('/v1/messages', methods=['POST'])
@require_api_key
def anthropic_compat_chat():
    """Adaptateur pour le format Anthropic (utilisé par Claude Code)."""
    data = request.json
    system_prompt = data.get('system', '')
    messages = data.get('messages', [])
    
    if system_prompt:
        messages.insert(0, {"role": "system", "content": system_prompt})
    
    try:
        response = client.chat.completions.create(
            model=MODEL_ID,
            messages=messages,
            max_tokens=data.get('max_tokens', 1024),
            temperature=data.get('temperature', 0.7)
        )
        ai_content = response.choices[0].message.content
        
        return jsonify({
            "id": f"msg_{uuid.uuid4().hex[:24]}",
            "type": "message",
            "role": "assistant",
            "model": MODEL_ID,
            "content": [{"type": "text", "text": ai_content}],
            "stop_reason": "end_turn",
            "usage": {"input_tokens": 0, "output_tokens": 0}
        })
    except Exception as e:
        return jsonify({"error": {"type": "api_error", "message": str(e)}}), 500

@app.route('/v1/models', methods=['GET'])
@app.route('/api/models', methods=['GET'])
@require_api_key
def list_models():
    """Liste le modèle disponible (format compatible OpenAI)."""
    return jsonify({
        "object": "list",
        "data": [
            {
                "id": MODEL_ID,
                "object": "model",
                "created": 1700000000,
                "owned_by": "huggingface"
            }
        ]
    })

@app.route('/api/chat/stream', methods=['POST'])
@require_api_key
def chat_stream():
    data = request.json
    session_id = data.get('session_id')
    user_id = request.api_key_owner or (current_user.id if current_user.is_authenticated else None)

    if not session_id:
        session_id = str(uuid.uuid4())
        db.session.add(ChatSession(id=session_id, user_id=user_id))
        db.session.commit()

    sess = db.session.get(ChatSession, session_id)
    history = [{"role": m.role, "content": m.content} for m in sess.messages]
    user_content = data.get('message') or data.get('messages')[-1]['content']
    
    db.session.add(Message(session_id=session_id, role='user', content=user_content))
    db.session.commit()

    def generate():
        full_ai_content = ""
        try:
            stream = client.chat.completions.create(
                model=MODEL_ID,
                messages=history + [{"role": "user", "content": user_content}],
                stream=True
            )
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_ai_content += content
                    yield f"data: {json.dumps({'content': content, 'session_id': session_id})}\n\n"
            
            db.session.add(Message(session_id=session_id, role='assistant', content=full_ai_content))
            if len(sess.messages) <= 2:
                sess.title = user_content[:30] + "..."
            db.session.commit()
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

# --- Routes Gestion Admin & Sessions ---

@app.route('/api/sessions', methods=['GET'])
@login_required
def list_sessions():
    sessions = ChatSession.query.filter_by(user_id=current_user.id).order_by(ChatSession.created_at.desc()).all()
    return jsonify([{"id": s.id, "title": s.title, "date": s.created_at.isoformat()} for s in sessions])

@app.route('/api/history/<session_id>', methods=['GET'])
@login_required
def get_session_history(session_id):
    sess = db.session.get(ChatSession, session_id)
    if not sess: return "Introuvable", 404
    if sess.user_id != current_user.id: return "Interdit", 403
    return jsonify({
        "id": sess.id,
        "title": sess.title,
        "messages": [{"role": m.role, "content": m.content} for m in sess.messages]
    })

@app.route('/api/admin/keys', methods=['POST'])
@login_required
def create_key():
    if not current_user.is_admin: return "Interdit", 403
    data = request.json
    new_key = f"sk-liteai-{str(uuid.uuid4())[:8]}"
    target_user_id = data.get('user_id', current_user.id)
    db.session.add(ApiKey(key=new_key, user_id=target_user_id))
    db.session.commit()
    return jsonify({"success": True, "key": new_key})

@app.route('/api/admin/keys/<key>', methods=['DELETE'])
@login_required
def delete_key(key):
    if not current_user.is_admin: return "Interdit", 403
    key_obj = ApiKey.query.filter_by(key=key).first()
    if key_obj:
        db.session.delete(key_obj)
        db.session.commit()
        return jsonify({"success": True})
    return jsonify({"error": "Clé introuvable"}), 404

@app.route('/api/admin/users', methods=['POST'])
@login_required
def create_user():
    if not current_user.is_admin: return "Interdit", 403
    data = request.json
    username = data.get('username')
    password = data.get('password')
    is_admin = data.get('is_admin', False)
    
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Utilisateur existe déjà"}), 400
        
    new_user = User(username=username, password_hash=generate_password_hash(password), is_admin=is_admin)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"success": True})

# --- Initialisation ---

with app.app_context():
    try:
        db.create_all()
        if not User.query.first():
            admin = User(username='admin', password_hash=generate_password_hash('admin123'), is_admin=True)
            db.session.add(admin)
            db.session.commit()
            db.session.add(ApiKey(key='sk-liteai-12345', user_id=admin.id))
            db.session.commit()
    except Exception as e:
        print(f"Erreur d'initialisation DB: {e}")

if __name__ == '__main__':
    app.run(debug=True, port=5000)
