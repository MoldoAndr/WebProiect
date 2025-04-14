LLM Studio
Descriere Generală

LLM Studio este o platformă web avansată concepută pentru gestionarea și interacțiunea 
cu modele de limbaj de mari dimensiuni (Large Language Models – LLM). Proiectul 
integrează o arhitectură modernă și securizată, oferind suport pentru multiple 
roluri de utilizatori și o varietate de funcționalități esențiale​
Scopul platformei este de a facilita accesul la diferite modele LLM într-un mod centralizat, 
permițând utilizatorilor să inițieze conversații cu modelele și să gestioneze eficient 
datele și rezultatele obținute.

Arhitectură

Aplicația este construită pe o arhitectură modulară, compusă din mai multe componente 
principale, care lucrează împreună pentru a oferi o experiență fluentă:

    Frontend (ReactJS): Interfața utilizator pe care o vede și cu care interacționează 
        utilizatorul final. Aceasta este o aplicație React ce comunică cu backend-ul 
        prin API REST și WebSocket-uri securizate.

    Backend (FastAPI): Serviciul web principal al platformei, realizat cu FastAPI 
        în Python, care expune API-urile necesare pentru autentificare, gestionarea 
        utilizatorilor, stocarea conversațiilor și interacțiunea cu modelele LLM. 
        Backend-ul implementează logica de afaceri și validează toate solicitările primite.

    Autentificare (JWT): Sistemul de autentificare se bazează pe JSON Web Tokens, 
        asigurând sesiuni securizate și controlul accesului. La fiecare cerere, token-ul 
        JWT este verificat de backend pentru a valida identitatea și permisiunile utilizatorului.

    Bază de Date (MongoDB): Datele aplicației (precum informațiile despre utilizatori, 
        conversații salvate, configurațiile modelelor etc.) sunt stocate într-o bază de date 
        NoSQL MongoDB, care oferă flexibilitate și scalabilitate pentru tipurile de date manipulate.

    Server Web (Nginx): Un server Nginx este utilizat pentru a servi conținutul frontend-ului 
        și pentru a inversa proxy către backend. Acesta gestionează traficul HTTP/HTTPS către 
        componentele interne, asigurând încărcarea rapidă a interfeței și rutarea eficientă 
        a cererilor API.

    Modul de Gestionare LLM (Flask + Python): Un serviciu separat, construit în Flask 
        (Python), se ocupă de încărcarea și rularea efectivă a modelelor LLM. Acest modul 
        integrează biblioteci precum LLaMA și Hugging Face Transformers pentru a suporta o 
        varietate de modele de limbaj. Backend-ul interacționează cu acest serviciu pentru 
        a trimite prompt-uri către modele și a primi răspunsurile generate.

Această structură pe mai multe componente asigură o separare clară a responsabilităților 
în sistem și permite scalarea sau modificarea fiecărui modul independent. Comunicarea 
între frontend, backend și serviciul LLM este protejată prin HTTPS și token-uri de acces, 
iar utilizarea WebSocket-urilor permite actualizarea în timp real a răspunsurilor modelului 
către frontend.

Stack Tehnologic

Platforma folosește un set modern de tehnologii, după cum urmează:

    Frontend: ReactJS (JavaScript/TypeScript, pentru interfața de utilizator).
    Backend: FastAPI (Python, pentru API-ul web și logica de server).
    Autentificare: JWT (JSON Web Tokens, pentru sesiuni de autentificare securizate).
    Bază de Date: MongoDB (bază de date NoSQL pentru stocarea persistentă a datelor).
    Server Web: Nginx (HTTP invers-proxy, folosit pentru servirea aplicației și rutare).
    Gestionare LLM: Biblioteca LLaMA și Hugging Face (rulate într-un serviciu Flask/Python).
    Protocol: HTTPS (toate comunicațiile între client și server sunt criptate prin SSL/TLS).

Această combinație tehnologică asigură un echilibru între performanță, securitate și 
ușurința în dezvoltare. React și FastAPI permit dezvoltarea rapidă a front-end-ului și 
back-end-ului, MongoDB oferă persistență flexibilă, în timp ce Nginx și HTTPS garantează 
o livrare sigură a conținutului. Integrarea LLaMA/Transformers permite suportul pentru 
modele LLM locale sau externe, după necesități.

Instalare și Rulare

    Descarcarea arhivei cu toate dependintele necesare, pozitionarea in folderul llm-studio si darea comenzii:
    docker compose --file docker-compose-dev.yml up --build

Odată ce aplicația rulează, puteți începe să explorați interfața web.
Asigurați-vă că toate containerele (frontend, backend, database, LLM service) sunt active
    și nu au erori în log. Dacă întâmpinați probleme la rulare, verificați în consola 
    terminalului mesajele afișate de Docker Compose pentru a identifica eventualele 
    erori (de exemplu, lipsa unor resurse sau conflicte de porturi).

Funcționalități Principale

LLM Studio oferă o serie de funcționalități cheie care facilitează interacțiunea cu modelele 
de limbaj și administrarea aplicației. Iată o listă a principalelor module și caracteristici 
ale platformei:

    Suport Multi-LLM: Posibilitatea de a alege și utiliza diferite modele de limbaj disponibile 
        pe platformă. Utilizatorii pot selecta dintr-o listă de modele LLM (ex: modele 
        open-source precum GPT-neo, LLaMA etc., care au fost adăugate în sistem) pentru a 
        iniția conversații. Aceasta oferă flexibilitate în testarea și utilizarea diverselor 
        modele în funcție de nevoi.
    
    Autentificare și gestionare utilizatori: Platforma include un sistem de autentificare 
        securizată (bazat pe JWT) și funcționalități de gestionare a utilizatorilor. Fiecare 
        utilizator își poate crea un cont (sau poate fi creat de un administrator) și are un 
        profil cu date de bază. Autentificarea asigură accesul doar la funcțiile permise 
        fiecărui rol, iar administratorii pot gestiona lista de utilizatori (creare, modificare, 
        dezactivare conturi).

    Conversație interactivă cu LLM: Utilizatorii pot iniția chat-uri sau sesiuni de conversație 
        cu un model LLM selectat. Prin intermediul interfeței web, utilizatorul trimite 
        întrebări sau comenzi în limbaj natural către model, iar răspunsurile generate de 
        model sunt afișate în timp real. Conversația se desfășoară într-o manieră interactivă, 
        permițând utilizatorilor să pună întrebări suplimentare sau să clarifice răspunsurile primite.
    
    Istoric conversații: Fiecare sesiune de chat cu un LLM poate fi salvată și vizualizată 
        ulterior. Platforma menține un istoric al conversațiilor anterioare, astfel încât 
        utilizatorii să poată relua discuții vechi sau să revadă răspunsurile primite anterior. 
        Acest lucru este util pentru continuitatea în utilizare, permițând reluarea unui dialog 
        din punctul în care a fost întrerupt sau analizarea evoluției răspunsurilor.

    Vizualizare date și statistici: LLM Studio include componente de dashboard pentru afișarea 
        datelor într-un format grafic și ușor de interpretat. De exemplu, administratorii 
        pot vedea statistici despre utilizarea platformei (număr de conversații, modele 
        folosite, eventuale diagrame cu volumul de cereri în timp). Aceste vizualizări 
        ajută la monitorizarea performanței sistemului și la înțelegerea modului în care 
        sunt utilizați diferiții roboți conversaționali.

    Sistem de suport (tichete): Platforma oferă un modul de suport integrat, unde utilizatorii 
        pot trimite tichete de asistență atunci când întâmpină probleme sau au nevoie de ajutor. 
        Un utilizator poate completa un formular de suport (sau ticket) descriind problema, 
        care apoi este trimis către echipa tehnică/administrator pentru rezolvare. 
        Administratorii au posibilitatea să vizualizeze și să gestioneze aceste tichete 
        de suport, marcându-le ca rezolvate sau comunicând cu utilizatorii pentru clarificări. 
        Acest sistem intern simplifică procesul de suport tehnic, fără a necesita mijloace 
        externe de raportare a problemelor.

    Acces bazat pe roluri: Funcționalitățile platformei sunt accesibile în mod diferențiat, 
        în funcție de rolul fiecărui utilizator. Astfel, există capabilități specifice pentru 
        utilizatori obișnuiți, pentru administratori și pentru tehnicieni. De exemplu, un 
        utilizator standard poate iniția conversații și vizualiza propriile date, însă nu 
        are acces la setările aplicației sau la gestionarea utilizatorilor. Un administrator 
        poate accesa în plus secțiuni de administrare (cum ar fi managementul utilizatorilor 
        și vizualizarea statisticilor), iar un tehnician are instrumente dedicate pentru 
        administrarea modelelor LLM din sistem. (Detalii despre permisiunile fiecărui rol 
        sunt oferite în secțiunea Roluri de Utilizatori de mai jos.)

Aceste funcționalități lucrează împreună pentru a oferi o platformă completă de interacțiune cu 
    LLM-uri, permițând atât utilizatorilor finali, cât și administratorilor sau echipei tehnice, 
    să își îndeplinească sarcinile specifice eficient și în siguranță.

Gestionarea LLM-urilor

Unul dintre elementele distinctive ale platformei LLM Studio este abilitatea de a gestiona dinamic 
    modelele LLM disponibile. Acest lucru este realizat prin intermediul rolului de Tehnician, care are 
    acces la secțiuni speciale în interfață pentru administrarea modelelor de limbaj.

Principalele acțiuni legate de gestionarea LLM-urilor sunt:

    Adăugarea unui nou model LLM: Tehnicianul poate adăuga un model de limbaj suplimentar în platformă, 
        făcându-l disponibil pentru utilizatori. Pentru a realiza acest lucru, trebuie furnizate detalii 
        precum un nume descriptiv al modelului și un link către fișierele modelului. De exemplu, platforma s
        uportă adăugarea de modele de pe Hugging Face prin link direct către fișierul modelului – 
        un link valid ar putea arăta astfel: 
        https://huggingface.co/<organizatie>/<nume-model>/resolve/main/<fisier-model>.gguf. 
        Odată furnizat un astfel de link (ca în exemplul de mai sus, care adaugă un model LLaMA 2 de 7B 
        cuantizat), sistemul va descărca modelul și îl va integra, astfel încât să poată fi folosit 
        în conversații. Noul model adăugat va apărea în lista de selecție a LLM-urilor din interfața 
        utilizatorului.

    Modificarea unui model existent: În cazul în care un model LLM deja adăugat necesită actualizare 
        (de exemplu, înlocuirea cu o versiune mai nouă, schimbarea unor parametri de configurare sau 
        corectarea numelui/descripției), tehnicianul poate edita informațiile modelului prin interfața 
        de administrare. Aceasta poate implica schimbarea URL-ului sursă către un alt fișier de model 
        sau ajustarea setărilor de încărcare. După salvarea modificărilor, platforma va folosi noile 
        date pentru următoarele conversații inițiate cu acel model.

    Ștergerea/eliminarea unui model: Dacă un anumit model nu mai este necesar sau prezintă probleme, 
        tehnicianul îl poate elimina din platformă. Această acțiune va face modelul respectiv indisponibil 
        pentru utilizatori (nu va mai apărea în lista de modele). Datele istorice legate de conversațiile 
        purtate cu acel model pot fi păstrate în continuare în sistem, dar modelul nu va mai putea fi 
        selectat pentru noi sesiuni.

Gestionarea LLM-urilor este proiectată să fie cât mai simplă, folosind interfața grafică a aplicației. 
    Toate aceste operațiuni (adăugare, modificare, ștergere) nu necesită oprirea sistemului – ele pot fi 
    efectuate dinamic, iar modificările se propagă imediat, permițând o administrare flexibilă a modelelor 
    disponibile.

Notă tehnică: Asigurarea compatibilității modelelor adăugate este importantă. Platforma suportă în 
    principal modele de tip LLaMA/Transformer care pot fi rulate local. De exemplu, formatul .gguf 
    menționat este specific pentru anumite implementări optimizate (cum ar fi folosirea librăriei llama.cpp). 
    Tehnicianul trebuie să furnizeze un link către un fișier de model compatibil cu sistemul; un link 
    incorect sau un model nesuportat poate duce la erori la încărcare. În documentația extinsă a proiectului 
    sunt oferite recomandări privind modelele testate și suportate. 

Roluri de Utilizatori

LLM Studio definește trei tipuri principale de utilizatori, fiecare cu niveluri diferite 
    de acces și permisiuni în cadrul platformei. Această separare pe roluri asigură că 
    funcționalitățile sensibile sunt accesibile doar persoanelor potrivite și că interfața 
    este adaptată pentru nevoile fiecărui tip de utilizator. Rolurile disponibile și 
    capacitățile lor sunt următoarele:

Utilizator (standard): Acest rol este destinat utilizatorilor 
    obișnuiți ai platformei. Un utilizator poate interacționa cu 
    modelele LLM (iniția conversații și primi răspunsuri), își poate salva și 
    vizualiza propriul istoric de conversații și poate vedea anumite date 
    sau statistici generale permise. Utilizatorii standard nu au acces la 
    setări administrative sau la configurări de sistem. Practic, ei folosesc 
    platforma pentru scopul principal – conversia cu LLM-urile – și funcționalitățile 
    asociate (ex: trimiterea de tichete de suport atunci când au probleme).

Administrator: Rolul de administrator include toate privilegiile unui utilizator obișnuit,
    însă adaugă drepturi de administrare a aplicației. Un administrator poate gestiona 
    utilizatorii platformei (vizualiza lista de utilizatori înregistrați, modifica rolurile 
    sau informațiile conturilor, bloca/debloca accesul unui utilizator)​
    De asemenea, administratorul poate vizualiza informații despre modelele LLM disponibile 
    (lista de modele, detalii despre fiecare model) și poate accesa statisticile de 
    utilizare a platformei (dashboard cu metrici, jurnalul conversațiilor – dacă este 
    necesar pentru audit). Administratorul poate, de regulă, să vadă tichetele de suport 
    trimise de utilizatori și să coordoneze rezolvarea lor. Totuși, un administrator nu adaugă 
    sau modifică direct modelele LLM – această responsabilitate aparține tehnicianului.

    Tehnician: Acest rol este dedicat persoanelor responsabile cu întreținerea tehnică a 
    platformei și a modelelor LLM. Un tehnician are acces la toate funcționalitățile unui 
    administrator și, în plus, la secțiunile de gestionare a LLM-urilor​
    Tehnicianul poate adăuga modele noi, modifica sau șterge modele existente, 
    asigurându-se că platforma are la dispoziție cele mai potrivite și 
    actualizate modele. De asemenea, tehnicianul se ocupă de monitorizarea 
    stării serviciului de inferență al LLM (de exemplu, verifică dacă modelele 
    sunt încărcate corespunzător și optimizează performanța acestora). Practic, 
    rolul de tehnician combină atribuțiile de administrator cu capabilități 
    tehnice avansate orientate spre mentenanța sistemului AI.

Pentru a rezuma diferențele: 
    un Utilizator folosește platforma pentru conversatii și vizualizare de date, 
    un Administrator configurează platforma și utilizatorii (fără a altera modelele AI), 
    iar un Tehnician gestionează direct modelele AI și aspectele tehnice ale sistemului. 
Această separare previne accesul neautorizat la funcții critice – de exemplu, doar 
tehnicianul poate afecta modul de funcționare al LLM-urilor – și în același timp 
oferă fiecărui tip de utilizator o interfață adaptată nevoilor sale (utilizatorii nu 
văd meniurile de administrare, iar tehnicienii au în plus meniuri pentru LLM-uri).

Cont de test:
	Admin: 
		username: andrei
		parola: 123456
	Utilizator:
		username: utilizator
		parola: andrei
