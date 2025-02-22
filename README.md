# LLM Manager
## Cuprins
1. [Prezentare Generală](#prezentare-generală)
2. [Arhitectură - Schemă Logică](#arhitectură---schemă-logică)
3. [Principalele Componente](#principalele-componente)
4. [Funcționalități Cheie](#funcționalități-cheie)
5. [Organizare Exemplară a Proiectului](#organizare)

---

## Prezentare Generală

- Un **frontend** modern (React) servit de Nginx.  
- Un **backend** (FastAPI) care gestionează logica de business.  
- O **bază de date** (MongoDB) pentru persistența datelor.  
- Un **container dedicat** pentru LLM-uri

### **Aplicatia este disponibila prin intermediul unui docker, pentru integrare se foloseste docker-compose**

Rolurile disponibile:
| Rol        | Descriere                                                                                  |
|------------|--------------------------------------------------------------------------------------------|
| **Guest**  | Acces limitat (vizualizare).                                                               |
| **User**   | Inițiază conversații, vizualizează istoric, modifică parametri modele și propriile date.   |
| **Admin**  | Gestionează utilizatorii (creare, ștergere, modificare roluri).                            |
| **Technician** | Configurează și administrează modelele LLM.                                            |

---

## Arhitectură - Schemă Logică
```plaintext
                 ┌──────────────────────┐
                 │        Frontend      │
                 │  (React/Angular/Vue) │
                 │    Servit de Nginx   │
                 └──────────┬───────────┘
                            │
                      (HTTP Requests)
                            │
                   ┌────────▼────────┐
                   │     Nginx       │
                   │ (Reverse Proxy) │
                   └────────┬────────┘
                            │
            (Rutează /api/ către containerul backend)
                            │
                   ┌────────▼────────┐
                   │     Backend     │
                   │    (FastAPI)    │
                   └─────────┬───────┘      
                             │───────────────┐
                  (Acces DB & LLM info)      |
                             │               |
                     ┌───────▼────────┐      |
                     │   Database     │      |
                     │   MongoDB      │      |
                     └────────────────┘      |
                             ┌───────────────┘                        
                             │
                             ▼
                ┌────────────────────────┐
                │      LLM Container     │
                │ (Model local, ex. GPT, │
                │   LLaMA2, GPT-J etc.)  │
                └────────────────────────┘
```

---

## Principalele Componente
1. **Frontend** – Interfața cu utilizatorul, construită în React (sau alt framework) și servită static de Nginx.  
2. **Nginx** – Reverse proxy pentru cereri HTTP(s).  
3. **Backend** – Aplicație pentru autentificare, logica de business, roluri și interacțiunea cu LLM.  
4. **Database** – Stochează date despre utilizatori, istoricul conversațiilor, configurările LLM etc.  
5. **LLM Container** – Conține modelele NLP (GPT, LLaMA2, GPT-J).

---

## Funcționalități Cheie
- **Autentificare / Înregistrare** (stocare și validare date).  
- **Gestionare Roluri** (Guest, User, Admin, Technician).  
- **Administrare Utilizatori** (creare, ștergere, modificare date/roluri).  
- **Administrare LLM** (adăugare, ștergere, configurare modele).  
- **Chat cu LLM** (trimitere cereri, răspunsuri, istoric conversații).  
- **UI Responsiv** (framework CSS pentru adaptare la rezoluții variate).

---

## Organizare
```plaintext
.
├── frontend/
│   ├── build/        # Fișiere statice de producție
│   └── src/          # Codul sursă React/Angular/Vue
├── backend/
│   ├── main.py       # Sau server.js (depinde de limbaj)
│   ├── routers/      # Endpoint-uri API
│   ├── models/       # Definiții de date (User, LLM etc.)
│   ├── managers/     # Comunicare cu DB și LLM
│   └── ...
├── database/
│   └── ...           # Configuri DB (Dockerfile, scripturi init)
├── llm_container/
│   └── ...           # Dockerfile & scripturi pentru modelul LLM
└── docker-compose.yml # Definiția tuturor serviciilor
```