# 📚 Documentation LiteAI

Bienvenue dans la documentation officielle de **LiteAI**, une solution légère et puissante pour exposer l'intelligence artificielle (Qwen 32B via Hugging Face) sous forme d'API polyvalente.

## 🚀 Installation & Lancement

### Prérequis
- Python 3.8+
- Un compte Hugging Face (pour changer la clé si besoin)

### Installation
```bash
pip install -r requirements.txt
```

### Lancement
```bash
python app.py
```
Le serveur sera disponible sur `http://127.0.0.1:5000`.

---

## 🔐 Authentification

Toutes les requêtes vers l'API doivent être authentifiées. LiteAI supporte deux formats :

1.  **Format Standard** : Header `X-API-Key: sk-liteai-12345`
2.  **Format OpenAI (Compatible CLI)** : Header `Authorization: Bearer sk-liteai-12345`

---

## 📡 Endpoints API

### 🚀 Compatibilité OpenAI (CLI & Outils)
Pour utiliser LiteAI avec des outils existants (comme des clients CLI ou des plugins IDE), utilisez cet endpoint :
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
  "temperature": 0.7,
  "max_tokens": 1024
}
```

### 2. Chat (Streaming)
Reçoit la réponse en temps réel via Server-Sent Events (SSE).

- **URL** : `/api/chat/stream`
- **Méthode** : `POST`
- **Format de sortie** : Flux de données `data: {"content": "..."}`

### 3. Compatibilité Anthropic (Claude Code, etc.)
**POST** `/v1/messages`
LiteAI traduit automatiquement le format Anthropic vers le format Qwen.
- **Headers** : `X-API-Key: <votre_cle>`
- **Exemple de corps** :
```json
{
  "model": "claude-3-5-sonnet-20240620",
  "max_tokens": 1024,
  "messages": [{"role": "user", "content": "Bonjour"}]
}
```

---

### 4. Lister les modèles
**GET** `/v1/models` ou `/api/models`
- **Headers** : `X-API-Key: <votre_cle>`
- **Réponse** : Retourne les détails du modèle Qwen 32B actif.

---

### 4. Gestion de l'Historique
LiteAI gère automatiquement la mémoire de la conversation.

- **Récupérer l'historique** : `GET /api/history/<session_id>`
- **Supprimer l'historique** : `DELETE /api/history/<session_id>`

---

## 💻 Exemples d'Intégration

### Python (Scripts & Agents)
```python
import requests

headers = {"X-API-Key": "sk-liteai-12345"}
data = {"message": "Qui es-tu ?", "session_id": "user-123"}

response = requests.post("http://127.0.0.1:5000/api/chat", headers=headers, json=data)
print(response.json()['response'])
```

### JavaScript (Web Apps)
```javascript
fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'sk-liteai-12345'
  },
  body: JSON.stringify({ message: "Hello" })
});
```

---

## ⚙️ Configuration Avancée
Dans `app.py`, vous pouvez modifier les variables suivantes :
- `MODEL_ID` : Changer le modèle Hugging Face.
- `API_KEYS` : Ajouter ou supprimer des clés d'accès.
- `chat_sessions` : Par défaut en mémoire. À migrer vers Redis pour la production.

---

## 🎨 Interface & UX Avancée
L'interface LiteAI inclut des fonctionnalités modernes pour une meilleure expérience :
- **Blocs de Réflexion (`<think>`)** : Les pensées internes de l'IA sont automatiquement isolées dans des blocs stylisés.
- **Markdown & Code** : Rendu complet du Markdown avec coloration syntaxique (`Highlight.js`).
- **Copie Facile** : Bouton "Copier" automatique sur tous les blocs de code.

---

## 🛠️ Gestion des Clés (Admin)
Une interface visuelle est disponible sur `/admin/keys` pour :
- Lister les clés actives.
- Générer de nouvelles clés sécurisées.
- Révoquer l'accès d'une clé existante.

---

*Documentation générée par LiteAI.*
