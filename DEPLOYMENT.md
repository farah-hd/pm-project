# 🚀 PM QUEST – Complete GitHub & Render Deployment Guide (Free Plan)

Follow these exact, step-by-step instructions to deploy **PM QUEST** on GitHub and Render. Once deployed, anyone with a smartphone can access the game over public HTTPS from anywhere in the world!

---

## 📋 Table of Contents
1. [Project Readiness & Architecture](#1-project-readiness--architecture)
2. [Step 1: Create a GitHub Repository](#step-1-create-a-github-repository)
3. [Step 2: Upload Your Code to GitHub](#step-2-upload-your-code-to-github)
   - [Option A: Direct Web Upload (Zero Installation Required)](#option-a-direct-web-upload-easiest--fastest)
   - [Option B: Using Git CLI](#option-b-using-git-cli)
4. [Step 3: Connect GitHub to Render & Deploy](#step-3-connect-github-to-render--deploy)
5. [Step 4: Your Public URLs & QR Code](#step-4-your-public-urls--qr-code)
6. [Render Free Plan Considerations (Cold Starts)](#render-free-plan-considerations-cold-starts)
7. [How to Make Future Updates](#how-to-make-future-updates)

---

## 1. Project Readiness & Architecture
Your application is already 100% prepared for Render:
- ✅ **Dynamic Public Origin:** Detects Render's `x-forwarded-proto` and `x-forwarded-host` headers. The QR code automatically encodes your public Render player URL (`https://your-app.onrender.com/player`).
- ✅ **Port Binding:** Reads `process.env.PORT` assigned by Render and listens on `0.0.0.0`.
- ✅ **Proxy Buffering Disabled:** Headers include `X-Accel-Buffering: no` so Render's Nginx reverse proxy transmits real-time SSE buzzer events instantly.
- ✅ **Keep-Alive Heartbeats:** Automated 20s SSE comments keep connections open through Render's 100-second idle timeout.
- ✅ **Health Check Endpoint:** `/healthz` is configured for Render health monitoring.
- ✅ **Zero Dependencies:** Built on pure Node.js, so deployment takes less than 30 seconds with zero build failures!

---

## Step 1: Create a GitHub Repository

1. Open your browser and go to [https://github.com](https://github.com).
2. Log in (or sign up for a free GitHub account if you don't have one).
3. In the top-right corner, click the **`+`** icon and select **New repository** (or visit [https://github.com/new](https://github.com/new)).
4. Fill in the details:
   - **Repository name:** `pm-quest`
   - **Description:** `PM QUEST - The Project Management Challenge Interactive Web Application`
   - **Visibility:** Select **Public** (required for Render's free tier).
   - **Do NOT** check "Add a README file", "Add .gitignore", or choose a license (your project already has these!).
5. Click **Create repository**.
6. Keep this page open.

---

## Step 2: Upload Your Code to GitHub

Your project files are located on your computer at:
`C:\Users\farah\.gemini\antigravity\scratch\pm-quest`

Choose either **Option A** (easiest, no software installation needed) or **Option B** (standard Git CLI):

### Option A: Direct Web Upload (Easiest & Fastest)
1. On your newly created GitHub repository page, you will see a message:
   *"...or upload an existing file"*. Click the link that says **uploading an existing file** (or visit `https://github.com/YOUR_USERNAME/pm-quest/upload`).
2. Open Windows File Explorer and navigate to:
   `C:\Users\farah\.gemini\antigravity\scratch\pm-quest`
3. Select and drag all files and folders into the GitHub upload area:
   - `data/` folder
   - `public/` folder
   - `server.js`
   - `package.json`
   - `render.yaml`
   - `.gitignore`
   - `README.md`
4. In the "Commit changes" box at the bottom, type:
   `Initial commit: PM Quest complete app`
5. Click **Commit changes**.
6. Your repository is now live on GitHub!

---

### Option B: Using Git CLI
If you prefer using the command line:
1. Open PowerShell and install Git using Windows Package Manager:
   ```powershell
   winget install --id Git.Git -e --source winget
   ```
2. Close and reopen PowerShell, then run:
   ```powershell
   cd C:\Users\farah\.gemini\antigravity\scratch\pm-quest
   git init
   git add .
   git commit -m "Initial commit: PM Quest complete app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/pm-quest.git
   git push -u origin main
   ```

---

## Step 3: Connect GitHub to Render & Deploy

1. Open your browser and go to [https://render.com](https://render.com).
2. Click **Get Started for Free** or **Sign In**.
3. Choose **Continue with GitHub** to log in using your GitHub account. Authorize Render when prompted.
4. Once inside the Render Dashboard:
   - Click the blue **New +** button in the top navigation bar.
   - Select **Web Service**.
5. Connect your repository:
   - Under *Connect a repository*, look for `pm-quest`.
   - If it doesn't appear, click **Configure account** (under the GitHub section), select your GitHub account, and grant Render access to `pm-quest` (or all repositories).
   - Click **Connect** next to `pm-quest`.
6. Configure the Web Service settings:
   - **Name:** `pm-quest` (or a custom name like `pm-quest-quiz`). *This will define your URL: `https://pm-quest.onrender.com`.*
   - **Region:** Choose the region closest to you (e.g., `Frankfurt (EU)` or `Oregon (US)`).
   - **Branch:** `main`
   - **Root Directory:** Leave blank.
   - **Runtime:** `Node`
   - **Build Command:** `echo "Build complete"` (or `npm run build`)
   - **Start Command:** `node server.js`
   - **Instance Type:** Select **Free** ($0 / month).
7. Scroll to the bottom and click **Deploy Web Service** (or **Create Web Service**).

Render will immediately clone your repository and launch your application. The deployment log will show:
```text
==> Running 'echo "Build complete"'
Build complete
==> Starting service with 'node server.js'
⚔️  PM QUEST – The Project Management Challenge
🎮 Server running on Port 10000
==> Your service is live 🎉
```

---

## Step 4: Your Public URLs & QR Code

Once the status changes to a green **Live** badge:
1. At the top of your Render service page, you will see your permanent public HTTPS URL:
   `https://YOUR-APP.onrender.com`
2. Your two dedicated URLs are:
   - 📺 **Host Presentation Screen:**
     `https://YOUR-APP.onrender.com/host`
   - 📱 **Student Mobile Interface:**
     `https://YOUR-APP.onrender.com/player`

### QR Code Verification:
- Open `https://YOUR-APP.onrender.com/host` on your presentation laptop.
- The host screen automatically generates a QR code pointing to `https://YOUR-APP.onrender.com/player`.
- Any student on campus, at home, or on cellular data can scan the code and instantly join your game!

---

## Render Free Plan Considerations (Cold Starts)

> [!IMPORTANT]
> **Understanding Free Plan "Spin Down" (Cold Starts):**
> - On Render's free tier, your web service will automatically "spin down" (go to sleep) if it receives no web traffic for **15 consecutive minutes**.
> - When someone opens the link after the server has spun down, Render takes **30 to 50 seconds** to wake up the server (a "cold start").
> - **Presentation Best Practice:**
>   Open `https://YOUR-APP.onrender.com/host` on your laptop **2 minutes before your classroom presentation begins**. This will wake up the service so that when your classmates scan the QR code, it responds instantly!
> - Once active, the server stays awake throughout your presentation as long as host and players are interacting with it.

---

## How to Make Future Updates

Whenever you want to modify questions, answers, or text:
1. Edit the file locally (e.g. `data/knowledgeData.js`).
2. Commit and push the changes to GitHub (or upload the updated file on GitHub.com).
3. Render will automatically detect the new commit and redeploy your changes in ~40 seconds with zero downtime!
