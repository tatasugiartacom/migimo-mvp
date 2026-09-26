# Migimo Community staging deployment

The `community-v1-foundation` branch deploys to the Migimo staging Railway project. The environment is named `production` in Railway, but this service is a development staging site.

## Database

The web service uses a private Railway reference for `DATABASE_URL` to the persistent `Postgres` service. Before a new code deployment, Railway runs `npm run db:migrate`. The migrator uses a transaction, an advisory lock, and `community_schema_migrations` to apply only pending SQL files. The service health check is `/health`.

Run `npm test` before pushing changes. To apply pending migrations manually from the web service console, run `npm run db:migrate`. Do not put database credentials in the repository.

## Google sign in

Google sign in stays disabled until a Google Cloud OAuth web client is configured. Its authorized redirect URI is `https://community-web-production-cf01.up.railway.app/auth/google/callback`. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as private web service variables in Railway, then test the full registration and login flow. The app and Community must share this identity foundation as the Flutter app is developed.
