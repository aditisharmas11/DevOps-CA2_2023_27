import time
import psycopg2
import sys

db_host = sys.argv[1] if len(sys.argv) > 1 else 'db'
db_port = sys.argv[2] if len(sys.argv) > 2 else '5432'
db_name = sys.argv[3] if len(sys.argv) > 3 else 'logistics_db'
db_user = sys.argv[4] if len(sys.argv) > 4 else 'postgres'
db_pass = sys.argv[5] if len(sys.argv) > 5 else 'postgres'

print(f"Waiting for database at {db_host}:{db_port}...")
while True:
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            dbname=db_name,
            user=db_user,
            password=db_pass
        )
        conn.close()
        print("Database is ready!")
        break
    except psycopg2.OperationalError as e:
        print("Database not ready yet, sleeping 1s...")
        time.sleep(1)
