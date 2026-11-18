# Hostinger Preview Deployment

The preview frontend is deployed from the `main` branch by `.github/workflows/deploy-hostinger.yml`.

The workflow builds the Vite application and uploads the contents of `dist/` to the Hostinger website document root. Configure the following GitHub Actions repository secrets before deployment:

- `HOSTINGER_FTP_SERVER`
- `HOSTINGER_FTP_USERNAME`
- `HOSTINGER_FTP_PASSWORD`
- `HOSTINGER_FTP_SERVER_DIR`

This is a frontend preview only. Supabase authentication, authorization, live data, and payment workflows are not enabled by this deployment.
