# 🤖 LLM Studio Manager

O platformă web completă pentru gestionarea și interacțiunea cu diferite LLM-uri.

![Licență](https://img.shields.io/badge/licență-MIT-blue)
![Versiune](https://img.shields.io/badge/versiune-1.0.0-green)
![Docker](https://img.shields.io/badge/docker-suportat-brightgreen)

## 🚀 Caracteristici

- **Suport Multi-LLM**: Alegeți dintre diverse LLM-uri disponibile pe platformă
- **Gestionarea Utilizatorilor**: Autentificare securizată și gestionarea profilurilor
- **Istoric Conversații**: Urmăriți și continuați conversațiile anterioare cu LLM
- **Vizualizare Date**: Vedeți datele în formate grafice
- **Acces bazat pe Roluri**: Capabilități diferite pentru utilizatori, administratori și tehnicieni

## 🏗️ Arhitectură

```
├── Frontend (ReactJS)
├── Backend (FastAPI)
├── Autentificare (JWT)
├── Bază de Date (MongoDB)
├── Server Web (Nginx)
└── Gestionare LLM (Flask + Python + llama + transformers)
```

## 🔧 Stack Tehnologic

| Componentă | Tehnologie |
|-----------|------------|
| Frontend | ReactJS |
| Backend | FastAPI |
| Autentificare | JWT |
| Bază de Date | MongoDB |
| Server Web | Nginx |
| Gestionare LLM | LLama |
| Protocol | HTTPS |

## 🛡️ Caracteristici de Securitate

- JWT cu generare sigura de token
- Validare serializare input
- Backend accesibil doar prin frontend
- HTTPS în întreaga aplicație
- Functionare izolata pentru LLM-uri
- WebSockets pentru transmisie de continut

## 📦 Instalare si rulare

```
docker compose --file docker-compose-dev.yml up --build
```

## 📦 Adaugare LLM-uri
Exemplu de link valid pentru adaugare de LLM:
[llama](https://huggingface.co/TheBloke/Llama-2-7B-GGUF/resolve/main/llama-2-7b.Q5_0.gguf)


## 👥 Roluri Utilizatori

- **Utilizator**: Interacționează cu LLM-uri, salvează conversații și vizualizează date
- **Administrator**: Gestionează utilizatorii și informațiile despre LLM
- **Tehnician**: Adaugă, modifică sau șterge LLM-uri
