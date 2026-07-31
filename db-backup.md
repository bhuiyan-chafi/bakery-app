Edited deployment-guide.md
Edited .gitignore
Edited brain.md
Viewed brain.md:142-155

Here is everything you need to know about database backups on a VPS, how Namecheap VPS backups work, and the recommended solution for your bakery application.

---

### 1. VPS Snapshots vs. Database Application Backups

| Backup Type                                 | Provided By                       | What It Backs Up                                                         | Good For                                                                     | Limitations                                                                                             |
| :------------------------------------------ | :-------------------------------- | :----------------------------------------------------------------------- | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| **Server Snapshots / Auto-Backups**         | Namecheap VPS (Built-in / Add-on) | The entire server disk (OS, Docker images, config files, database files) | Total server disaster recovery (e.g., server failure or hardware crash).     | Cannot easily restore a single table or accidental data deletion without overwriting the entire server. |
| **PostgreSQL Database Backups (`pg_dump`)** | Your Application / Server Script  | Raw database data & SQL schemas                                          | Quick data restoration, point-in-time recovery, migration to another server. | Only backs up the database (not your application code or OS settings).                                  |

---

### 2. Should you use Namecheap's option or create your own?

**You should use BOTH (A Hybrid Approach):**

1. **Namecheap VPS Server Backups (Disaster Recovery):** Enable Namecheap's automated server backups/snapshots if available in your plan. This is your safety net if the VPS hardware or operating system breaks completely.
2. **Automated PostgreSQL `pg_dump` Cron Job (Data Protection - ESSENTIAL):** Create an automated backup script for your PostgreSQL container. This generates daily `.sql.gz` files that are lightweight, portable, and easy to restore in seconds if data is corrupted or deleted by accident.

---

### 3. Step-by-Step: Setting Up Automated Daily DB Backups on Your VPS

You can easily set up automated daily PostgreSQL backups on your VPS using Docker and a `cron` job.

#### Step 1: Create a Backup Script on the VPS Host

Create a script file on your server (e.g., `/var/www/bakery-app/backup.sh`):

```bash
sudo nano /var/www/bakery-app/backup.sh
```

Paste the following script:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/var/www/bakery-app/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="bakery_db"
POSTGRES_USER="${POSTGRES_USER:-bakery_prod_user}"
POSTGRES_DB="${POSTGRES_DB:-bakery_prod_db}"
RETENTION_DAYS=14

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Run pg_dump inside the running Docker container and compress output
docker exec -t $CONTAINER_NAME pg_dump -U $POSTGRES_USER -d $POSTGRES_DB | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

# Remove backups older than RETENTION_DAYS (14 days)
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully: db_backup_$TIMESTAMP.sql.gz"
```

Make the script executable:

```bash
chmod +x /var/www/bakery-app/backup.sh
```

---

#### Step 2: Schedule Daily Execution via Cron

Open the root user's `crontab`:

```bash
sudo crontab -e
```

Add this line to run the backup **every day at 2:00 AM**:

```cron
0 2 * * * /var/www/bakery-app/backup.sh >> /var/www/bakery-app/backups/backup.log 2>&1
```

---

#### Step 3: How to Restore a Backup (If Ever Needed)

If you ever need to restore your database from a backup file:

```bash
# Decompress and restore into the running Postgres container
gunzip -c /var/www/bakery-app/backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i bakery_db psql -U bakery_prod_user -d bakery_prod_db
```

---

### 4. Extra Security: Offsite Backups (Optional Best Practice)

To protect against total VPS loss, you can automatically upload the daily `.sql.gz` file to an offsite cloud bucket (such as **Cloudflare R2** or **Amazon S3** using `rclone` or `aws-cli`). This ensures your data is safe even if the VPS server disk fails.
