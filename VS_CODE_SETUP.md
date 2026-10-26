# ZenGen VS Code Setup Guide

This guide will walk you through setting up and running the ZenGen teen mental health application in Visual Studio Code.

## Prerequisites

1. **Node.js**: Ensure you have Node.js installed (version 16 or later)
2. **Visual Studio Code**: Latest version recommended
3. **Git**: For cloning the repository (optional)

## Setup Instructions

### 1. Clone or Download the Project

If using Git:
```bash
git clone <repository-url>
cd zengen
```

Or download and extract the ZIP file from the repository.

### 2. Open the Project in VS Code

```bash
code .
```

Or use File > Open Folder in VS Code and navigate to the project directory.

### 3. Configure Environment Variables

1. Check that the `.env` file exists in the project root
2. Update the values in the `.env` file:
   ```
   # Required for chatbot functionality
   OPENAI_API_KEY=your_openai_api_key_here
   
   # The PostgreSQL database connection (already configured for Neon)
   DATABASE_URL=your_neon_connection_string_here
   
   # For session security
   SESSION_SECRET=generate_a_random_secret
   ```
   
3. If you're using your own PostgreSQL database, replace the DATABASE_URL with your connection string

### 4. Install Dependencies

Open a terminal in VS Code (Terminal > New Terminal) and run:
```bash
npm install
```

### 5. Initialize Database

Run the database initialization script to set up the database schema:
```bash
node init-db.js
```
This step will create the required tables in the PostgreSQL database using Drizzle ORM.

## Running the Application

### Option 1: Using VS Code Terminal

In the VS Code terminal, run:
```bash
npx cross-env NODE_ENV=development tsx server/index.ts
```

If on Windows:
```bash
set NODE_ENV=development && npx tsx server/index.ts
```

### Option 2: Using VS Code Launch Configuration (Recommended)

1. Create a `.vscode` folder in the project root if it doesn't exist
2. Create a `launch.json` file inside it with the following content:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch ZenGen App",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/node_modules/tsx/dist/cli.js",
      "args": ["server/index.ts"],
      "env": {
        "NODE_ENV": "development",
        "OPENAI_API_KEY": "${env:OPENAI_API_KEY}",
        "SESSION_SECRET": "${env:SESSION_SECRET}"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

3. Press F5 or click the Run and Debug icon in VS Code's sidebar, then select "Launch ZenGen App"

## Accessing the Application

Once the server starts, you'll see a message:
```
=================================================
Server running at http://localhost:5000
Open this URL in your browser to view the app
=================================================
```

Open http://localhost:5000 in your browser to use the application.

## Project Structure

- **client/src/**: Frontend React code
  - **components/**: UI components
  - **hooks/**: React hooks
  - **lib/**: Utility functions
  - **pages/**: Page components
- **server/**: Backend Express code
  - **index.ts**: Server entry point
  - **routes.ts**: API routes
  - **auth.ts**: Authentication logic
- **shared/**: Code shared between frontend and backend
  - **schema.ts**: Database schema and types

## Troubleshooting

1. **Port is already in use**: If port 5000 is already in use, modify the port in `server/index.ts`

2. **OpenAI API issues**: If the chatbot isn't working, ensure your API key is valid and has available quota

3. **Database connection errors**: If using PostgreSQL, check your connection string in the `.env` file

## Features

- **Mental Health Assessment**: Predicts potential mental health concerns based on questionnaire responses
- **AI Chatbot**: Provides direct, solution-focused mental health support
- **Resources**: Curated articles and videos on mental wellness topics
- **User Authentication**: Secure login and registration system
