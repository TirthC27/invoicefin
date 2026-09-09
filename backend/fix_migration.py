import sqlite3
import datetime

db = sqlite3.connect('db.sqlite3')
cur = db.cursor()

# Check current state
cur.execute("SELECT name FROM django_migrations WHERE app='core' ORDER BY name")
print('Currently applied migrations:')
for row in cur.fetchall():
    print(' ', row[0])

# Mark 0006_invoice as fake-applied so the dependency chain is consistent
# (0006_invoice_invoicepool_uploadhistory is already applied and covers a superset)
cur.execute(
    "INSERT OR IGNORE INTO django_migrations (app, name, applied) VALUES ('core', '0006_invoice', ?)",
    (datetime.datetime.utcnow().isoformat(),)
)
db.commit()
print(f'\nInserted 0006_invoice fake record. Rows affected: {cur.rowcount}')

cur.execute("SELECT name FROM django_migrations WHERE app='core' ORDER BY name")
print('\nMigrations after fix:')
for row in cur.fetchall():
    print(' ', row[0])

db.close()
print('\nDone.')
