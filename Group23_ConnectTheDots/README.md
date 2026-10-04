Engineering Report: https://docs.google.com/document/d/1JMoT1fFwjYkRiT_Kc0zOmKkeeWf-sP9D7wiuiDNB6_o/edit?tab=t.0
1. Project Overview
Connect the Dots is a fully containerized, production-ready infrastructure system that integrates five independent services into a single cohesive platform. All external traffic is routed through a central Nginx reverse proxy. The system supports metadata storage and retrieval, binary file upload and download, and exposes a health check endpoint that verifies all services simultaneously.

System Architecture
<img width="1440" height="1440" alt="image" src="https://github.com/user-attachments/assets/8109d079-2206-4cc1-810c-dce5745b8dab" />


Component	Technology	Purpose
Reverse Proxy	Nginx	Single entry point, routing, static file serving
Frontend	React + Vite	UI for metadata and file operations
Backend API	Spring Boot 3.2 (Java 17)	Business logic, caching coordination
Metadata Store	MongoDB 7	Document storage
Cache	Redis 7	In-memory read cache with TTL
File Storage	MinIO	S3-compatible binary object storage
Containerization	Docker + Docker Compose	Reproducible environment

2. High-Level Architecture
All requests enter through Nginx on port 80. Nginx routes traffic based on URL path:

•	/ — serves the React SPA as static files
•	/api/* — proxied to Spring Boot backend on internal port 8080
•	/storage/* — proxied to MinIO object storage on internal port 9000

Spring Boot is the only service that communicates with MongoDB, Redis, and MinIO. These services never communicate directly with each other or with the frontend. MongoDB stores metadata (title, description, filePath). MinIO stores binary file bytes. Redis caches the metadata list to avoid repeated database reads.

3. Prerequisites
Install the following on a clean machine before proceeding:

Tool	Version	Download
Docker Desktop	Latest	docker.com/products/docker-desktop
Node.js	20 LTS	nodejs.org
Java JDK	17 or 21	adoptium.net
Git	Latest	git-scm.com

After installing Docker Desktop, start it and verify it is running (whale icon in taskbar). Verify installation:

docker --version
docker compose version
node --version
java --version

4. Clone the Repository
git clone https://github.com/your-username/hackathon.git
cd hackathon

The repository structure is:

hackathon/
  backend/          <- Spring Boot source + Dockerfile
  frontend/         <- React + Vite source
  nginx/            <- nginx.conf
  docker-compose.yml
  .env.example
  README.md
  docs/
    engineering-report.docx

5. Environment Configuration
Copy the example environment file and configure it:

cp .env.example .env

The .env file contains all configuration. Default values work out of the box for local development. Do not commit the .env file to Git — it is listed in .gitignore.

Variable	Default Value	Description
SPRING_DATA_MONGODB_URI	mongodb://mongodb:27017/hackathon	MongoDB connection string
SPRING_DATA_REDIS_HOST	redis	Redis hostname
SPRING_DATA_REDIS_PORT	6379	Redis port
MINIO_URL	http://minio:9000	MinIO endpoint
MINIO_ACCESS_KEY	(set in .env)	MinIO access key
MINIO_SECRET_KEY	(set in .env)	MinIO secret key
MINIO_BUCKET	uploads	Bucket name for file storage

6. Running the System
6.1 Full System (Recommended — Single Command)
This builds and starts all services. Run from the hackathon/ root directory:

# Step 1: Build React static files
cd frontend
npm install
npm run build
cd ..

# Step 2: Build and start all containers
docker compose up --build

Wait for all services to report ready. You will see log lines from nginx, backend, mongodb, redis, and minio. The system is ready when you see:

backend  | Started HackathonApplication in X seconds

Open your browser at: http://localhost

6.2 Development Mode (Hot Reload)
For active development with hot reload, run infrastructure in Docker and the app servers locally:

# Terminal 1 — start infrastructure only
docker compose up -d mongodb redis minio

# Terminal 2 — start Spring Boot from IntelliJ (play button)
# or from terminal:
cd backend && mvn spring-boot:run

# Terminal 3 — start React dev server
cd frontend && npm run dev

React runs at http://localhost:5173 and proxies /api calls to Spring Boot on port 8080 automatically.

6.3 Stopping the System
docker compose down

# To also remove all stored data (volumes):
docker compose down -v

7. Testing the System
7.1 Health Check
Verify all services are running:

curl http://localhost/api/health

Expected response (HTTP 200):

{
  "mongodb": "up",
  "redis":   "up",
  "minio":   "up",
  "status":  "ok"
}

7.2 Store Metadata
curl -X POST http://localhost/api/metadata \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"My first entry","filePath":""}' 

7.3 Retrieve Metadata
curl http://localhost/api/metadata

7.4 Upload a File
curl -X POST http://localhost/api/upload-file \
  -F "file=@/path/to/your/file.pdf" \
  -F "title=My Document" \
  -F "description=Uploaded via curl"

Note the id field in the response — you need it to retrieve the file.

7.5 Download a File
curl http://localhost/api/get-file?id=<id-from-upload> --output downloaded.pdf

7.6 Integration Test Sequence
Run all endpoints in order to verify the full integration:

1.	GET /api/health — verify status is ok and all services are up
2.	POST /api/metadata — store a metadata entry, note the returned id
3.	GET /api/metadata — verify the entry appears in the list
4.	POST /api/upload-file — upload a file with title and description
5.	GET /api/get-file?id= — download the file using the returned id

8. API Endpoints
Method	Endpoint	Description	Request Body / Params
GET	/api/health	System health check	None
POST	/api/metadata	Store metadata	JSON: title, description, filePath
GET	/api/metadata	Get all metadata	None
POST	/api/upload-file	Upload file to MinIO	Multipart: file, title, description
GET	/api/get-file	Download file by ID	Query param: id

9. Monitoring and Debugging
View logs for a specific service
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f mongodb

Check running containers
docker ps

Access MinIO web console
Open http://localhost:9001 in your browser. Log in with your MINIO_ACCESS_KEY and MINIO_SECRET_KEY. You can browse uploaded files in the uploads bucket.

Access MongoDB with Compass
Connect MongoDB Compass to: mongodb://localhost:27017. Open the hackathon database and metadata collection to inspect stored documents.

10. Assumptions
•	Docker Desktop is running before any docker compose command is executed
•	The uploads bucket in MinIO is created automatically on the first file upload by the application code
•	File size limit is 50MB — configurable via SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE in application.properties
•	Redis cache TTL is 5 minutes — metadata reads within this window are served from cache without hitting MongoDB
•	No authentication is implemented — all endpoints are publicly accessible
•	The frontend must be built (npm run build) before running docker compose up --build
•	host.docker.internal is used in development mode nginx.conf to reach Spring Boot on the host machine — this works on Windows and Mac automatically

