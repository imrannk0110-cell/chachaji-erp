# Chachaji Udyog ERP - Client Installation & Recovery Guide

This document contains all the necessary instructions for installing, running, and managing the Chachaji Udyog ERP & CRM Local System on a new computer, along with steps for Disaster Recovery.

---

## 1. System Requirements
- **Operating System:** Windows 10 or Windows 11 (Strictly Required).
  *(Note: Windows 7 is NOT supported by modern software like Node.js v20+ which this system uses).*
- **RAM:** Minimum 4GB (8GB Recommended).
- **Storage:** Minimum 2GB free space.

---

## 2. Prerequisites Installation (Node.js)
The ERP system requires Node.js to run the local server. You only need to install this **once** on a new system. 

You can install Node.js using any ONE of the following methods:

**Method 1: 1-Click Terminal Install (Recommended for Windows 10/11)**
1. Open **Command Prompt** or **PowerShell** on the new laptop.
2. Copy and paste the following command and press Enter:
   ```cmd
   winget install OpenJS.NodeJS.LTS
   ```
3. Wait for the installation to finish automatically.

**Method 2: Manual Download (If Method 1 fails)**
1. Open your web browser and go to [https://nodejs.org/](https://nodejs.org/).
2. Download the **LTS (Long Term Support)** version for Windows.
3. Open the downloaded `.msi` file and click "Next" on all screens to install it.

---

## 3. How to Start the ERP System
Once Node.js is installed, follow these steps to run your software:

1. Copy the entire `ERP + CRM` folder from your Pendrive to the new laptop's `D:\` or `E:\` drive.
2. Inside the main folder, find the file named **`Start_Chachaji_ERP.bat`**.
3. **Right-Click** this file -> Select **Send to** -> **Desktop (create shortcut)**.
4. Go to your Desktop and double-click the new shortcut to start the system.
5. Two black terminal windows will open (Backend & Frontend) – **Do not close them while using the software!** You can minimize them.
6. The ERP Dashboard will automatically open in your web browser (`http://localhost:3000`).

---

## 4. Data Backup vs. Data Export
In the Settings / Dashboard section, you will see two different buttons. It is important to know the difference:

1. **Export Master Data (Excel):**
   - **Use:** This exports your data (Orders, Customers, Suppliers) into a readable `.xlsx` Excel format.
   - **Purpose:** Use this for business reporting, auditing, or sharing data with your accountant.
   - *Note: This Excel file CANNOT be used to restore the system if it crashes.*

2. **Download System Backup (.db):**
   - **Use:** This downloads the raw `hd_safa.db` database file.
   - **Purpose:** This is your actual software database. Keep this safe! It is used to instantly revive your system if your PC crashes.

*(Note: The system also automatically takes a background backup every 4 hours and saves it in the `backend/backups/` folder).*

---

## 5. Disaster Recovery (If the System Crashes)
If your laptop crashes, windows gets corrupted, or your data gets accidentally wiped, you can restore 100% of your data using your `.db` backup file in 2 minutes:

**Step-by-step Recovery:**
1. **Stop the System:** Ensure the ERP is closed (close the black terminal windows).
2. **Find your Backup File:** 
   - Get the `.db` file you manually downloaded using the "System Backup" button.
   - OR, go to the `backend/backups/` folder and copy the latest `.db` file.
3. **Paste in Backend:** Go to the `backend` folder inside your main `ERP + CRM` directory. Paste the backup file here.
4. **Rename the File:** Rename your pasted backup file to exactly **`hd_safa`** (If file extensions are visible, make sure it is `hd_safa.db`).
5. **Restart System:** Double-click your Desktop shortcut to start the ERP again.
6. **Done!** Refresh your browser. All your data, orders, and settings will be fully restored exactly as they were.
