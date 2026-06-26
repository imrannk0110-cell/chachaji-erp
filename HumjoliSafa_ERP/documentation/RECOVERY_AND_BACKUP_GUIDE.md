# 🛡️ SYSTEM RECOVERY & BACKUP GUIDE

This document outlines the failsafe backup procedures engineered into the Humjoli Safa Local ERP & CRM System.

## Automated Backup System
The system is equipped with an asynchronous background daemon that automatically clones the central database (`hd_safa.db`) every 4 hours while the server is active.

- **Backup Directory:** `backend/backups/`
- **File Structure:** `/DD-MM-YYYY/backup_HH-MM-AM_PM.db`

*Example:* `backend/backups/21-06-2026/backup_10-00-AM.db`

## How to Restore from a Corrupted Database
In the event of a power failure, hard drive sector corruption, or accidental data mutation, follow these steps strictly to restore normal operations:

### 1. Shut Down the System
Close the terminal/command prompt window running the ERP server. The system must be completely offline to perform a restore safely.

### 2. Locate the Corrupted Database
Navigate to the root folder: `HumjoliSafa_ERP/backend/`.
Locate the file named `hd_safa.db`.
Rename this file to `hd_safa_CORRUPTED.db` (do not delete it immediately, keep it as a forensic copy).

### 3. Retrieve the Backup
Navigate to `HumjoliSafa_ERP/backend/backups/`.
Open the folder with the most recent date (e.g., `21-06-2026`).
Copy the most recent backup file (e.g., `backup_10-00-AM.db`).

### 4. Restore the Backup
Paste the copied backup file into the `HumjoliSafa_ERP/backend/` directory.
Rename the file from `backup_10-00-AM.db` exactly to `hd_safa.db`.

### 5. Reboot the System
Run the startup script to boot the backend and frontend servers.
The system will instantly resume operations using the restored timeline state. Business interruption will be minimal.

## Manual Master Data Export
For accounting audits, use the "Export Master Data" button located at the top of the frontend Dashboard. This will compile all current active SQL tables (Suppliers, Customers, Orders, Products, Managers) into individual, Excel-compatible `.csv` files and download them to your browser's default downloads folder.
