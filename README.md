# ⚔️ PM QUEST – The Project Management Challenge
**An Interactive Real-Time Multiplayer Web Application for Classroom Presentations**

---

## ⚡ Quick Start (1-Click Launch)
Whenever you turn on or reboot your computer, simply:
1. Open the project folder:
   `C:\Users\farah\.gemini\antigravity\scratch\pm-quest`
2. **Double-click `launch-with-browser.bat`**
   - It will automatically start the background game server.
   - It will automatically open the Host Presentation Screen (`http://localhost:3000/host`) in your default browser.
   - **Keep the small server window open** while you present!

---

## 💻 Why the Quiz Didn't Launch After Restarting the PC
When you shut down, close, or restart Windows:
1. **The background server stops:** Node.js runs as an active process. When the PC shuts down or sleeps, the server process exits.
2. **Your local Wi-Fi IP address changes:** Whenever a PC reconnects to Wi-Fi, the router often assigns a new local IP address (e.g., `192.168.100.207` yesterday vs. `192.168.50.99` today).
3. **The fix:**
   Simply start the server again with **`launch-with-browser.bat`** (or by typing `node server.js` in your terminal). The host dashboard will automatically detect your fresh IP and generate the updated QR code for your classmates!

---

## 🎮 Concept Overview
**PM QUEST** transforms a traditional university presentation on the **9 PMBOK Project Management Knowledge Areas** into an adventure-themed multiplayer game. 

The presenter acts as the **Host / Quest Master**, displaying the journey on the classroom projector screen. Students scan a live QR code with their mobile phones to register their teams, follow the interactive roadmap, learn the concepts, and compete in timed quizzes to score points.

---

## 🎨 Theme & Color Palette
Designed in a warm retro café / RPG desktop aesthetic (inspired by vintage adventure games):
- **Deep Dark Espresso:** `#2b1a12` (Borders, primary text, window title bar)
- **Rich Roast Brown:** `#6f4e37` (Wooden cards, dialog boxes, hero banners)
- **Caramel Tan:** `#d4a373` (Buttons, accents, checkpoint flags)
- **Soft Cream Beige:** `#d9c9b8` (Badges, sub-containers)
- **Parchment White:** `#f4ece4` (Main paper canvas background)
- **Terracotta Crimson:** `#b23a2e` (Alerts, key reminders, active badges)

---

## 🗺️ The 9 Knowledge Areas Included
Each checkpoint follows the same structured learning layout on both Host and Mobile screens:
1. **Project Integration Management** (*Master Integrator*)
2. **Project Scope Management** (*Scope Guardian*)
3. **Project Schedule Management** (*Time Lord*)
4. **Project Cost Management** (*Budget Master*)
5. **Project Quality Management** (*Quality Champion*)
6. **Project Resource Management** (*Team Architect*)
7. **Project Communications Management** (*Master Communicator*)
8. **Project Risk Management** (*Risk Strategist*)
9. **Project Procurement Management** (*Procurement Titan*)

Plus an optional **Final Mission: The CyberPulse Launch Crisis** testing cross-knowledge area integration!

---

## 📱 How Multiple Classmates Connect With Their Phones

### Method A: University / Classroom Wi-Fi (Same Network)
1. Ensure your laptop and your classmates' phones are connected to the same Wi-Fi network.
2. Double-click `launch-with-browser.bat` (or run `node server.js`).
3. The host screen will automatically detect your local IPv4 address and render a **live QR code**.
4. Classmates simply open their phone camera, scan the QR code, and enter their team name!

### Method B: Mobile Hotspot (Recommended for Zero-Firewall Guarantees)
If your university Wi-Fi blocks peer-to-peer connections or device-to-device traffic:
1. Turn on the **Personal Hotspot** on your smartphone.
2. Connect your laptop to your smartphone's hotspot.
3. Have your classmates connect their phones to your hotspot.
4. Run `launch-with-browser.bat` and have students scan the QR code.

### Method C: Free Public Tunnel (If Students Are on Cellular 4G/5G Data)
If students want to stay on their cellular mobile data, run in a separate terminal:
```bash
npx localtunnel --port 3000
```
Share the generated link with students!

---

## 🕹️ Game Progression & Host Flow

1. **Waiting Room (Lobby):**
   - Presenter opens `/host`.
   - QR code is displayed on the projector.
   - Teams appear live as they join with their selected avatars.
   - Host clicks **"START THE QUEST"** when everyone is in.

2. **The Adventure Roadmap:**
   - Checkpoint 1 (Integration) is unlocked; Checkpoints 2–9 are locked.
   - Host clicks Checkpoint 1 to open its learning section.

3. **Learning Section (Synchronized on Host & Student Phones):**
   - **A. What is it?** Concise definition.
   - **B. What does it involve?** 4 visual process cards.
   - **C. Remember This!** High-visibility PM exam rule/warning.
   - **D. Start Challenge:** Host clicks to launch the quiz.

4. **20-Second Multiplayer Quiz (Independent Timers):**
   - Question text and 4 choices (A, B, C, D) appear on the screen and on student phones.
   - A visible 20-second countdown runs automatically.
   - **Independent Timer:** When a team submits, their timer freezes at their answer time and enters a waiting state. Other teams keep counting down!
   - **Automatic Close & Reveal:** When the 20-second timer hits 0, all remaining answers lock automatically, and question results + PMBOK rationale + speed points appear on all screens automatically!
   - Speed-based points:
     - 1st correct team: **100 pts**
     - 2nd correct team: **80 pts**
     - 3rd correct team: **60 pts**
     - 4th correct team: **40 pts**
     - Other correct teams: **20 pts**
     - Incorrect answer: **0 pts**

5. **Roadmap Unlock:**
   - Host clicks **"Unlock Next Checkpoint"**.
   - Checkpoint 1 is marked with a green checkmark ✅.
   - Checkpoint 2 is unlocked ⭐.
   - View returns to the roadmap.

6. **Final Challenge (Optional):**
   - After completing all 9 areas, the host can launch **The CyberPulse Launch Crisis**.
   - Teams multi-select the involved areas and earn up to **+150 bonus points**.

7. **The Grand Podium & Celebration:**
   - Host clicks **"Final Podium Celebration"**.
   - 3D retro podium reveals 1st (Gold Trophy), 2nd (Silver Trophy), and 3rd (Bronze Trophy).
   - Full rankings table with final scores.
   - Retro pixel confetti shower and 8-bit victory fanfare music!
