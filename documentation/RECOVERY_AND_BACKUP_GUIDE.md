# Database Recovery & Backup Guide

This document outlines the standard operating procedure for locating, extracting, and recovering the Humjoli Safa offline database (`hd_safa.db`) in the event of hardware failure, data corruption, or accidental deletion.

## 1. Automated Backup Architecture
The Humjoli Safa Node.js backend operates a background daemon that runs continuously. 
- It triggers automatically every **4 hours**.
- It creates an exact binary clone of the live SQLite database.
- These clones are organized into daily folders to prevent clutter.

## 2. Locating Your Backups
All automated backups are stored within the backend directory.
Path structure: `/backend/backups/DD-MM-YYYY/backup_HH-MM-AM_PM.db`

**Example Location:**
`E:\Client Projects\ERP + CRM\backend\backups\21-06-2026\backup_10-00-AM.db`

## 3. Database Restoration Protocol (Step-by-Step)
If your active software becomes corrupted or shows empty data, follow these steps exactly:

1. **Stop the Application Server**
   - Close the running terminal window or hit `Ctrl + C` in the console where `npm run dev` is running. This prevents the system from locking the files.

2. **Isolate the Corrupted Database**
   - Navigate to the root backend folder: `\backend\`
   - Locate the active database file named exactly `hd_safa.db`.
   - Rename it to `hd_safa_CORRUPTED.db` (do not delete it immediately, just in case).

3. **Extract a Clean Backup**
   - Navigate into the `\backend\backups\` folder.
   - Open the folder for the most recent valid date (e.g., `21-06-2026`).
   - Locate the most recent valid timestamp (e.g., `backup_10-00-AM.db`).
   - **Copy** this file. Do not move it.

4. **Mount the Backup**
   - Paste the copied backup file back into the main `\backend\` folder.
   - Rename the pasted file to exactly: `hd_safa.db`

5. **Reboot the System**
   - Open your terminal and run `npm run dev` as usual.
   - The application will instantly read the recovered database, preventing any significant business interruptions.
