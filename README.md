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

├── api/ # Backend (ASP.NET Core)

├── docker-compose.yml

└── README.md

Repozytorium korzysta z seedera, który jest uruchamiany przy każdym 

## Uruchomienie projektu (poprzez Dockera)

```bash
git clone https://github.com/rendor535/Karaoke
cd Karaoke

docker compose up --build
```

dostęp do aplikacji: 
Frontend: http://localhost:3000/login
Swagger: http://localhost:5159/swagger/index.html
