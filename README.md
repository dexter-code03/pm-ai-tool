# PM AI Tool

A full-stack project management tool powered by AI, built with a modern React frontend and a Node/Express server backed by PostgreSQL.

## Live Demo
**Production URL:** [https://pm-ai-tool-nah6.onrender.com](https://pm-ai-tool-nah6.onrender.com)

### Default Login
* **Email:** `demo@pm-ai-tool.local`
* **Password:** `demo12345`

## Tech Stack
* **Frontend:** React, Vite, Tailwind CSS (or standard CSS), TypeScript
* **Backend:** Node.js, Express, Prisma ORM
* **Database:** PostgreSQL
* **Deployment:** Render (Automated CI/CD via `render.yaml`)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the database (optional if using external DB):
   ```bash
   docker-compose up -d
   ```

3. Generate Prisma Client and Push Schema:
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   npm run seed:user
   ```

4. Start the frontend and backend servers:
   ```bash
   # Terminal 1 (Frontend)
   npm run dev

   # Terminal 2 (Backend)
   cd server
   npm start
   ```
