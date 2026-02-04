<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1sYvuqLh1Z6eBWvm8NNIzA1EGlI4xJWdq

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment to Google Cloud Run

This project is configured for automated deployment to Google Cloud Run using GitHub Actions.

### Prerequisites

1. **Google Cloud Project**: Create a GCP project.
2. **Artifact Registry**: Create a Docker repository in Artifact Registry (e.g., `sheetsense-repo`).
3. **Service Account**: Create a Service Account with the following roles:
   - `Cloud Run Admin`
   - `Artifact Registry Writer` (or `Storage Admin`)
   - `Service Account User`
4. **GitHub Secrets**: Add the following secrets to your GitHub repository:
   - `GCP_PROJECT_ID`: Your Google Cloud Project ID.
   - `GCP_SA_KEY`: The JSON key of your Service Account.
   - `GEMINI_API_KEY`: Your Gemini API Key (used at build time).

### Deployment Workflow

The deployment is triggered automatically on every push to the `main` branch. The workflow defined in `.github/workflows/deploy.yaml` will:
1. Build the Docker image (injecting the `GEMINI_API_KEY`).
2. Push the image to Google Artifact Registry.
3. Deploy the service to Cloud Run.

**Note**: Since the API key is embedded in the build (client-side app), ensure your API key has appropriate restrictions in the Google Cloud Console (e.g., restrict by HTTP referrer).

