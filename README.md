# Karaoke

Aplikacja karaoke typu **full-stack** z frontendem w **Next.js** oraz backendem w **ASP.NET Core**, uruchamiana w całości przy pomocy **Docker Compose**.

Projekt umożliwia szybkie uruchomienie środowiska developerskiego bez ręcznej konfiguracji zależności.

## Technologie

- **Frontend:** Next.js (React, TypeScript)
- **Backend:** ASP.NET Core 9
- **Baza danych:** PostgreSQL
- **Autoryzacja:** JWT (cookie)
- **Konteneryzacja:** Docker + Docker Compose

## Struktura projektu

.

├── client/ # Frontend (Next.js)

├── server/ # Backend (ASP.NET Core)

├── files/ # Przykładowe pliki do seedera

├── docker-compose.yml

└── README.md

Repozytorium korzysta z seedera, który jest uruchamiany przy każdym uruchomieniu aplikacji, aby go wyłączyć należy znaleźć linijke 
DbSeeder.Seed(db); w Program.cs znajdującym się w folderze /server/ i ją usunąć.

## Uruchomienie projektu (poprzez Dockera)

```bash
git clone https://github.com/rendor535/Karaoke
cd Karaoke

docker compose up --build
```

dostęp do aplikacji: 
Frontend: http://localhost:3000/login
Swagger: http://localhost:5159/swagger/index.html

## Przykładowe konta do testowania aplikacji
Admin:

login - admin@test.com

hasło - admin123


SuperUser:

login - kokos@test.com

hasło - suser123


User: 

login - user1@test.com"

hasło - User123!
