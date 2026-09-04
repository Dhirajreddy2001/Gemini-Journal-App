# Personal Gemini Journal — Production-Grade Secure Web Application

A production-ready, user-authenticated personal reflection and journaling web application powered by **Firebase Authentication**, **Cloud Firestore**, **Gemini 3.6 Flash**, **Google Cloud Secret Manager**, and **Google Cloud Run**.

---

## 1. Architecture Overview & Threat Model

### System Architecture
```
┌────────────────────────────────────────────────────────┐
│                   Client (React / TS)                  │
│  - Firebase Auth (Google Sign-In)                      │
│  - User-Isolated Firestore Reads & Writes              │
│  - ID Token Bearer Header on API Calls                 │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS + Bearer Token
┌───────────────────────────▼────────────────────────────┐
│         Backend Server (Node.js / Express on Cloud Run)│
│  - ID Token Verification via Google JWKS (jose)        │
│  - Caller UID strictly derived from token subject (sub)│
│  - Sliding-window rate limiter per authenticated user  │
│  - Input validation (max 4000 char prompt limit)       │
│  - Resilient Gemini Model Fallback Ladder              │
│  - Zero-Log Confidentiality Policy                     │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
  ┌───────────────────────┐   ┌───────────────────────────┐
  │  Google Cloud Vertex  │   │  Cloud Firestore          │
  │  / Gemini 3.6 Flash   │   │  (Users, Sessions,        │
  │  API (Server Only)    │   │   Messages, Insights)     │
  └───────────────────────┘   └───────────────────────────┘
```

### Agentic Threat Model (5 Threat Zones)

| Threat Zone | Specific Threat / Vulnerability | Impact | Mitigation & Security Control |
| :--- | :--- | :--- | :--- |
| **1. Input Surfaces** | Prompt injection, malicious payloads, oversized strings | DoS, model manipulation, XSS | Top-level body parser limit (1MB), max 4000 char validation, safe ReactMarkdown output encoding. |
| **2. Planning & Reasoning** | System instruction bypass via user reflection text | AI breaks persona or leaks instructions | Contextual framing treating user journal reflections strictly as passive data inside delimited blocks; system instructions prioritized. |
| **3. Tool Execution** | Unchecked API proxying, unauthorized backend invocation | Resource exhaustion, SSRF, identity spoofing | Mandatory Firebase ID token verification for all `/api/gemini/*` routes; client-supplied UIDs are discarded in favor of `decodedToken.uid`. |
| **4. Memory & State** | Cross-user Firestore reads/writes, insecure direct object reference (IDOR) | Data leak of sensitive personal journals | Path-level ABAC in `firestore.rules`: `match /users/{userId}/{allPaths=**} { allow read, write: if request.auth != null && request.auth.uid == userId; }`. |
| **5. Inter-System Communication** | Gemini API key exposure in client bundles or network logs | Credential theft, unauthorized quota abuse | API key stored in Secret Manager / server environment variables; client only communicates with `/api/*` endpoints; zero logging of journal text or tokens. |

---

## 2. Prerequisites & Cloud Setup

### 1. Install Tools & Authenticate
Ensure you have the Google Cloud SDK (`gcloud`) and Node.js (>= 20) installed:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable Required Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 3. Secret Management Setup (Google Cloud Secret Manager)

Store the Gemini API key securely in Secret Manager so it is never exposed in client bundles or repository commits:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Cloud Firestore Security Rules

Deploy the following owner-bound security rules to ensure zero cross-user access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default deny all access
    match /{document=**} {
      allow read, write: if false;
    }

    // User-isolated tree: only the authenticated user can access their own data
    // Covers sessions, messages, insights, goals, decisions, and weekly reports
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

To deploy rules directly with the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Google Cloud Run Deployment Flow

### 1. Build and Deploy Container
Deploy the application to Cloud Run using source-to-container build with Secret Manager integration:

```bash
SERVICE_NAME="personal-gemini-journal"
REGION="us-central1"

gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars=NODE_ENV=production,PORT=3000
```

### 2. Mandatory Verification Labeling Binding
To register the service for automated challenge verification, apply the mandatory campaign label:

```bash
gcloud run services update personal-gemini-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Verification & Test Walkthrough

Every user flow and security boundary has a corresponding verification step below:

| # | Test Scenario | Step-by-Step Walkthrough | Expected Result |
|---|---|---|---|
| **1** | **User Isolation (User A vs User B)** | Sign in as User A, create an entry "Secret Notes A". Sign out. Sign in as User B with a separate Google account. | User B sees an empty session list. Querying `/users/{userA_uid}/sessions` via DevTools or API fails with `permission-denied` (403). |
| **2** | **Unauthenticated API Rejection** | Issue `curl -X POST https://<HOST>/api/chat -H "Content-Type: application/json" -d '{"prompt":"hello"}'`. | Server responds with `401 Unauthorized: Missing or malformed Authorization header`. |
| **3** | **Firestore Security Rules Defense** | Attempt to write to a document outside the authenticated user's hierarchy, e.g. `/users/other_user_id/sessions/test`. | Cloud Firestore SDK rejects the write immediately with `FirebaseError: Missing or insufficient permissions`. |
| **4** | **Invalid Firebase Token Rejection** | Send a request to `/api/chat` with `Authorization: Bearer invalid.jwt.token`. | Server rejects the call with `401 Unauthorized: Invalid or expired Firebase ID token`. |
| **5** | **Zero Gemini API Key Leakage** | Inspect browser network requests (DevTools Network tab) and bundled JS sources. Search for `AIzaSy`. | The Gemini API key never appears in client requests or responses; all AI calls are routed through `/api/chat`. |
| **6** | **Session & Message Persistence** | Write 3 messages in a reflection session. Refresh the browser page (`F5`). | All 3 messages, timestamps, and model replies reload from Firestore instantly. |
| **7** | **Gemini Error Handling & Fallback** | Temporarily disconnect internet or simulate an API rate limit error. | The UI displays a clear, non-blocking error banner with a "Retry" button. User input is never discarded. |
| **8** | **Zero Data Loss on Write Rejection** | If Firestore encounters a temporary read/write failure during a reflection exchange. | An alert toast notifies the user, and the prompt remains intact in the input buffer or state. |
| **9** | **Logout Access Revocation** | Click "Sign Out" in the navigation bar. | The dashboard immediately unmounts, session and message memory is wiped, and the public landing page is rendered. |
| **10**| **Session Deletion Completeness** | Click the trash icon on a session and confirm deletion. | The session, all nested messages, and associated insights are removed from Firestore and no longer retrievable. |
| **11**| **Ask My Journal Grounding** | Switch to "Ask Journal" tab. Click a suggested question e.g. "What decisions have I made about my job search?". | Gemini responds strictly based on user's past journal entries, providing cited sessions and key takeaways. |
| **12**| **Private Memory Graph Interaction** | Switch to "Memory Graph". Click on any topic node (e.g. #career or #health). | The canvas highlights connected edges and displays all corresponding journal sessions with one-click navigation. |
| **13**| **Goal Tracker Extraction & Status** | In "Goal Tracker", click "Detect from Journal". | Gemini scans journal sessions for commitments and adds them to Firestore. User can toggle Active, Paused, or Done, edit progress notes, and set target dates. |
| **14**| **Decision Journal & Bias Coach** | In "Decisions", click "Record New Decision". Enter title, options, and click "Analyze Biases & Blind Spots". | Gemini stress-tests the decision, flagging blind spots and unexamined assumptions. User logs confidence rating and review horizon. |
| **15**| **Weekly Reflection Report Generation** | In "Weekly Reports", click "Generate Weekly Report". | Gemini 3.6 Flash synthesizes the past week's thoughts, top recurring themes, pending goals, and next steps with an archive saved to Firestore. |

