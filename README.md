# Rainblet Monorepo

This project is organized as:

- `frontend/`: Angular application
- `backend/`: Spring Boot API (Java 21, MySQL, Google OAuth2 + JWT)
- `docker-compose.yml`: Local multi-service stack (frontend + backend + mysql)

## Prerequisites

- Docker + Docker Compose
- For local (non-Docker) development:
  - Node.js 22+
  - Java 21
  - Maven 3.9+
  - MySQL 8+

## Frontend Backend URL Configuration

The frontend reads backend URL from a runtime config file:

- Source file: `frontend/src/assets/app-config.json`
- Deployed file path: `/assets/app-config.json`

Default value:

```json
{
  "apiBaseUrl": "http://localhost:8080"
}
```

For your domain deployment, set `apiBaseUrl` to your backend base URL, for example:

```json
{
  "apiBaseUrl": "https://api.yourdomain.com"
}
```

This is runtime-loaded, so you can change the deployed `/assets/app-config.json` without rebuilding Angular.

## Google OAuth Setup (Optional)

The backend now starts normally without Google OAuth credentials.
Google login is enabled only when both env vars are set.

1. Create OAuth credentials in Google API Console.
2. Configure redirect URI(s), including local dev:
   - `http://localhost:8080/login/oauth2/code/google`
3. Configure allowed JavaScript origin(s), including local dev:
   - `http://localhost:4200`
4. Export environment variables before startup:

```bash
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID=your-client-id
SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET=your-client-secret
APP_AUTH_JWT_SECRET=replace-with-your-own-very-long-secret
```

## Run Everything With Docker

From the repository root:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:8080`
- Backend health: `http://localhost:8080/api/health`
- MySQL: `localhost:3307` (db: `rainblet`, user: `root`, password: `root`)

Stop services:

```bash
docker compose down
```

Stop and remove database volume:

```bash
docker compose down -v
```

## Run Locally Without Docker

### Frontend

```bash
cd frontend
npm install
npm start
```

### Backend

```bash
cd backend
mvn spring-boot:run
```

Backend defaults are in `backend/src/main/resources/application.properties` and can be overridden via environment variables:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `APP_CORS_ALLOWED_ORIGINS`
- `APP_AUTH_JWT_SECRET`
- `APP_AUTH_OAUTH2_SUCCESS_REDIRECT`
- `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_ID` (optional)
- `SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GOOGLE_CLIENT_SECRET` (optional)

## API Endpoints

### Auth

- `GET /api/auth/google` (starts Google login when configured)
- `GET /api/auth/me` (requires Bearer token)
- `POST /api/auth/logout` (client-side JWT clear)

### Collectibles CRUD (authenticated)

- `GET /api/collectibles`
- `GET /api/collectibles/{id}`
- `POST /api/collectibles`
- `PUT /api/collectibles/{id}`
- `DELETE /api/collectibles/{id}`

Collectible payload:

```json
{
  "id": "spark-seed",
  "name": "Spark Seed",
  "description": "Awarded the first time you answer correctly.",
  "rarity": "common",
  "unlockRule": "Get 1 correct answer."
}
```

### Questions CRUD (authenticated)

- `GET /api/questions`
- `GET /api/questions/{id}`
- `POST /api/questions`
- `PUT /api/questions/{id}`
- `DELETE /api/questions/{id}`

Question payload:

```json
{
  "id": "math-1",
  "prompt": "What is 12 x 8?",
  "options": ["84", "96", "104", "108"],
  "correctIndex": 1,
  "topic": "Math"
}
```

## Notes

- Tables are auto-created/updated by Hibernate (`spring.jpa.hibernate.ddl-auto=update`).
- `correctIndex` is validated to ensure it is within the `options` bounds.
- Frontend routes `play`, `results`, `store`, and `collection` now require login.
- If Google OAuth is not configured, `GET /api/auth/google` returns `503`.
