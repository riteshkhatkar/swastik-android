# Push your changes to Prerana1709/swastik-hospital-frontend using AtharvaBambare727

You can't push directly to someone else's repo unless they add you as a collaborator. Use **Fork + Pull Request**:

---

## Step 1: Fork the repo (on GitHub)

1. Open: **https://github.com/Prerana1709/swastik-hospital-frontend**
2. Log in as **AtharvaBambare727**.
3. Click the **"Fork"** button (top right).
4. This creates **https://github.com/AtharvaBambare727/swastik-hospital-frontend** under your account.

---

## Step 2: Add your fork as a remote and push (on your PC)

In the project folder, run:

```powershell
cd "d:\orelse\EHR_ALL\swastik-hospital-frontend"

# Add your fork as a remote (name: atharva)
git remote add atharva https://github.com/AtharvaBambare727/swastik-hospital-frontend.git

# Push your committed code to your fork
git push atharva main
```

If you already added a remote named `atharva` before, use:

```powershell
git remote remove atharva
git remote add atharva https://github.com/AtharvaBambare727/swastik-hospital-frontend.git
git push atharva main
```

---

## Step 3: Open a Pull Request (on GitHub)

1. Go to **https://github.com/AtharvaBambare727/swastik-hospital-frontend**
2. You should see a yellow bar: **"AtharvaBambare727/swastik-hospital-frontend had recent pushes"** with a **"Compare & pull request"** button. Click it.
3. Or: Click **"Pull requests"** → **"New pull request"**. Set:
   - **base:** `Prerana1709/swastik-hospital-frontend` → `main`
   - **compare:** `AtharvaBambare727/swastik-hospital-frontend` → `main`
4. Add a title, e.g. **"Add Crater payment & billing integration"**, and description.
5. Click **"Create pull request"**.

Prerana1709 can then review and merge your changes into the main repo.

---

## Optional: If Prerana adds you as collaborator

If she adds **AtharvaBambare727** as a collaborator with write access:

1. Remove the need for a fork for future pushes (optional):  
   `git push origin main` will work.
2. Make sure Git uses your GitHub login: when you push, sign in as **AtharvaBambare727** when the browser or credential manager asks.

---

## Summary

| Step | Where | Action |
|------|--------|--------|
| 1 | GitHub (browser) | Fork Prerana1709/swastik-hospital-frontend → creates your fork |
| 2 | Terminal (your PC) | `git remote add atharva https://github.com/AtharvaBambare727/swastik-hospital-frontend.git` then `git push atharva main` |
| 3 | GitHub (browser) | Open Pull Request from your fork to Prerana1709/swastik-hospital-frontend |

Your code is already committed locally; Step 2 sends it to your fork, Step 3 asks Prerana to merge it into the original repo.
