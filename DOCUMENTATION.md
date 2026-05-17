# 📚 Documentation LiteAI

Bienvenue dans la documentation officielle de **LiteAI**, une solution moderne, performante et sécurisée pour exposer une suite de modèles d'intelligence artificielle de pointe via une interface web fluide et une API robuste.

---

## 🚀 Installation & Lancement

### Prérequis
- Python 3.8+
- Base de données PostgreSQL (Supabase recommandée)
- Un compte ou un token d'API Hugging Face (`HF_TOKEN`)

### Installation
```bash
pip install -r requirements.txt
```

### Lancement
```bash
python app.py
```
Le serveur local sera disponible sur `http://127.0.0.1:5000`.

---

## 🔐 Authentification

Toutes les requêtes vers l'API doivent être authentifiées via l'une de ces méthodes :

1. **Format Standard LiteAI** : Header `X-API-Key: sk-liteai-12345`
2. **Format OpenAI** : Header `Authorization: Bearer sk-liteai-12345`

---

## 📡 Endpoints API

### 🚀 Compatibilité OpenAI (CLI & Outils)
- **URL** : `/v1/chat/completions` (Alias vers `/api/chat`)

### 1. Chat (Standard)
Envoie une requête et attend la réponse complète de l'IA.

- **URL** : `/api/chat`
- **Méthode** : `POST`
- **Body (JSON)** :
```json
{
  "message": "Bonjour, comment vas-tu ?",
  "session_id": "optional-uuid",
  "model": "qwen3-32b",
  "temperature": 0.7,
  "max_tokens": 1024,
  "web_search": false
}
```

### 2. Chat (Streaming avec RAG & Vision)
Reçoit la réponse en temps réel via Server-Sent Events (SSE).

- **URL** : `/api/chat/stream`
- **Méthode** : `POST`
- **Body (JSON)** :
```json
{
  "message": "Décris cette image et cherche la date de cet événement sur le web",
  "session_id": "optional-uuid",
  "model": "kimi-k2",
  "web_search": true,
  "file_type": "image",
  "fileContent": "data:image/png;base64,iVBORw0KGgoAAA..."
}
```

#### Événements SSE retournés :
Le flux renvoie des blocs JSON avec des types de messages spécifiques :
- **Status de recherche** : `data: {"type": "search_status", "status": "Recherche sur le web..."}`
- **Résultats de recherche** : `data: {"type": "search_results", "sources": [{"title": "...", "url": "...", "body": "..."}]}`
- **Contenu généré** : `data: {"content": "...", "session_id": "...", "model": "..."}`
- **Fin du flux** : `[DONE]`

---

### 3. Compatibilité Anthropic
Traduit automatiquement le format Anthropic vers le backend LiteAI.
- **URL** : `/v1/messages`
- **Méthode** : `POST`
- **Headers** : `X-API-Key: <votre_cle>`
- **Body** :
```json
{
  "model": "claude-3-5-sonnet-20240620",
  "max_tokens": 1024,
  "messages": [{"role": "user", "content": "Bonjour"}]
}
```

---

### 4. Lister les modèles
- **URL** : `/v1/models` ou `/api/models`
- **Méthode** : `GET`
- **Headers** : `X-API-Key: <votre_cle>`

---

### 5. Gestion de l'Historique
LiteAI gère automatiquement la persistance des discussions en base de données.

- **Récupérer l'historique** : `GET /api/history/<session_id>`
- **Supprimer l'historique** : `DELETE /api/history/<session_id>`

---

## 🎨 Fonctionnalités de l'Interface Web (Kimi/Claude-like)

### 🌐 Recherche Web en Temps Réel
- Un bouton globe (🌐) dans la zone d'écriture active la recherche web en direct.
- Il interroge DuckDuckGo, extrait les informations pertinentes et les injecte de manière invisible dans le contexte de l'IA pour garantir des réponses actualisées.
- Les sources consultées s'affichent sous forme de "chips" interactifs cliquables au-dessus de la réponse.

### 👁️ Capacités Visuelles (Multimodal)
- Support de l'analyse d'images (`.png`, `.jpg`, `.jpeg`, `.webp`) par simple glisser-déposer ou sélection dans la zone d'écriture.
- Fonctionnalité activée automatiquement sur les modèles compatibles vision (`kimi-k2`, `glm-5`). Un message d'avertissement s'affiche si vous tentez d'analyser une image avec un modèle textuel pur.

### 📄 Générateur de Documents (Client-Side)
L'exportation de documents s'effectue directement sur le navigateur (offloading serveur, vitesse instantanée) :
- **DOCX (.doc)** : Génère un document structuré et stylisé avec un template HTML et CSS Office, parfaitement lisible sous MS Word.
- **PPTX** : Génère une présentation de diapositives de façon dynamique grâce à `PptxGenJS` en analysant la structure du texte (titres et listes).
- **XLSX** : Si l'IA produit un tableau Markdown, le système génère un tableur Excel soigné.
- **PDF, MD, TXT** : Formats classiques d'exports rapides.

---

## ⚙️ Configuration & Variables d'Environnement

Dans votre fichier `.env` ou sur votre dashboard Vercel :
- `DATABASE_URL` : Chaîne de connexion PostgreSQL.
- `HF_TOKEN` : Jeton Hugging Face pour l'accès aux APIs d'inférence.
- `SECRET_KEY` : Clé de sécurisation des sessions Flask.

---

*Documentation mise à jour pour la version Multimodale de LiteAI.*
