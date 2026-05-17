# LiteAI 🤖

Une plateforme IA personnelle, sécurisée et open-source — compatible OpenAI, Anthropic et CLI.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lionellite/liteai)

---

## ✨ Fonctionnalités

- 🧠 **Multi-modèles** : Qwen3-32B, Llama 3.3 70B, DeepSeek R1, Mistral 7B, Qwen2.5 Coder
- 🔑 **Authentification** : Gestion d'utilisateurs + clés API avec stats d'utilisation
- 📁 **Fichiers** : Upload (PDF, CSV, TXT, MD) et export des réponses (TXT, MD, DOCX, XLSX, PDF)
- 🔌 **API Universelle** : Compatible OpenAI (`/v1/chat/completions`) et Anthropic (`/v1/messages`)
- 💬 **Historique persistant** : Sessions de chat sauvegardées par utilisateur
- 🎨 **Interface Premium** : Design style Claude/KIMI, Markdown, coloration syntaxique

---

## 🚀 Déploiement sur Vercel + Supabase

### 1. Base de données — Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Dans **Project Settings → Database**, copiez la **Connection String (URI)**
3. Format : `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`

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

### Upload d'un fichier
```bash
curl -X POST http://localhost:5000/api/upload \
  -H "X-API-Key: sk-liteai-12345" \
  -F "file=@rapport.pdf"
```

### Export en PDF
```bash
curl -X POST http://localhost:5000/api/export/pdf \
  -H "X-API-Key: sk-liteai-12345" \
  -H "Content-Type: application/json" \
  -d '{"content":"Mon texte...","filename":"rapport"}' \
  --output rapport.pdf
```

---

## 🧠 Modèles disponibles

| Clé API | Modèle | Spécialité |
|---|---|---|
| `qwen3-32b` | Qwen3 32B | Général (défaut) |
| `llama3-70b` | Llama 3.3 70B | Code & raisonnement |
| `deepseek-r1` | DeepSeek R1 | Maths & logique |
| `mistral-7b` | Mistral 7B | Léger & rapide |
| `qwen-coder` | Qwen2.5 Coder 32B | Programmation |

---

## 📄 Licence

MIT — Libre d'utilisation, de modification et de distribution.
