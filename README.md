# LiteAI 🤖

Une plateforme IA personnelle, hautement performante, multimodale et sécurisée — compatible OpenAI, Anthropic et CLI.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lionellite/liteai)

---

## ✨ Fonctionnalités

- 🧠 **Multi-modèles SOTA** : Qwen3-32B, DeepSeek V4 Pro, Llama 3.3 70B, Kimi K2.6, GLM 5.1, GPT-OSS 120B.
- 👁️ **Multimodal (Vision)** : Support de l'analyse d'images (PNG, JPG, WEBP).
- 🌐 **Recherche Web (RAG)** : Navigation internet en temps réel pour des réponses sourcées et d'actualité.
- 📄 **Génération de Documents** : Export intelligent et instantané (Client-Side) en DOCX, PPTX, XLSX, PDF, MD, et TXT.
- 🔑 **Authentification** : Gestion des utilisateurs et clés API via Supabase (PostgreSQL).
- 📁 **Fichiers** : Upload et analyse de données (PDF, CSV, TXT, MD, Images).
- 🔌 **API Universelle** : Compatible OpenAI (`/v1/chat/completions`) et Anthropic (`/v1/messages`).
- 🎨 **Interface Premium** : Design type Kimi/Claude, coloration syntaxique, historique persistant.

---

## 🚀 Déploiement sur Vercel + Supabase

### 1. Base de données — Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Dans **Project Settings → Database**, copiez la **Connection String (URI) IPv4**. Assurez-vous d'utiliser le Transaction Pooler (port 6543).
3. Format : `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

### 2. Déploiement — Vercel

1. Forkez / importez ce dépôt sur [vercel.com](https://vercel.com)
2. Dans **Settings → Environment Variables**, ajoutez :

| Variable | Description | Exemple |
|---|---|---|
| `HF_TOKEN` | Clé API Hugging Face | `hf_xxxx` |
| `SECRET_KEY` | Clé secrète Flask (aléatoire) | `abc123...` |
| `DATABASE_URL` | URL de connexion Supabase | `postgresql://...` |

3. Déployez — les tables sont créées automatiquement au premier démarrage.
4. **Identifiants par défaut** : `admin` / `admin123` — **changez-les immédiatement !**

---

## 🖥️ Installation locale

```bash
git clone https://github.com/lionellite/liteai.git
cd liteai

# Copier et remplir les variables d'environnement
cp .env.example .env
# Éditez .env avec vos clés

pip install -r requirements.txt
python app.py
```

Accédez à **http://localhost:5000**

---

## 📡 API — Exemples

### Compatible OpenAI
```bash
curl -X POST http://localhost:5000/v1/chat/completions \
  -H "Authorization: Bearer sk-liteai-12345" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3-32b","messages":[{"role":"user","content":"Bonjour !"}]}'
```

### Compatible Anthropic (Claude Code)
```bash
ANTHROPIC_BASE_URL=http://localhost:5000
ANTHROPIC_API_KEY=sk-liteai-12345
claude "Explique Docker en 3 lignes"
```

### Upload d'un fichier (Documents & Images)
```bash
curl -X POST http://localhost:5000/api/upload \
  -H "X-API-Key: sk-liteai-12345" \
  -F "file=@image.png"
```

---

## 🧠 Modèles disponibles

| Clé API | Modèle | Vision | Spécialité |
|---|---|---|---|
| `qwen3-32b` | Qwen3 32B | Non | Général (défaut) |
| `deepseek-v4` | DeepSeek V4 Pro | Non | Raisonnement & Code |
| `qwen3-coder` | Qwen3 Coder Next | Non | Programmation |
| `llama3-70b` | Llama 3.3 70B | Non | Polyvalent |
| `kimi-k2` | Kimi K2.6 | Oui | Multimodal / Vision |
| `glm-5` | GLM 5.1 | Oui | Multimodal / Vision |
| `gpt-oss` | GPT-OSS 120B | Non | Capacité massive |

---

## 📄 Licence

MIT — Libre d'utilisation, de modification et de distribution.
