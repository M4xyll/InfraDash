<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-5.x-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker" alt="Docker" />
</p>

<h1 align="center">InfraDash</h1>

<p align="center">
  <strong>A modern, self-hosted infrastructure management dashboard</strong>
  <br />
  Track servers, VMs, disks, IPs, and network connections with a beautiful visual workspace.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Features

### Visual Workspace
- **2D Canvas** — Drag and arrange your infrastructure visually with ReactFlow
- **Hierarchical View** — See Internet → Servers → VMs at a glance
- **Colored Uplinks** — Customize network connection colors for easy identification
- **Persistent Layouts** — Your arrangement is saved per user

### Infrastructure Management
- **Servers** — Track physical or virtual hosts with location info
- **Virtual Machines** — Organize VMs under their parent servers
- **Disks** — Monitor storage with HDD/SSD/NVMe types and sizes
- **IP Addresses** — Manage IPs with status (Free, In Use, Reserved) and types
- **Network Connections** — Define server and VM uplinks with bandwidth and colors

### Security & Access Control
- **Role-Based Access** — Admin, Operator, and Viewer roles
- **JWT Authentication** — Secure token-based auth
- **Admin-Only Registration** — No public signup; admins create users

### Modern UI/UX
- **Glassmorphism Design** — Premium dark theme with blur effects
- **Responsive Layout** — Works on desktop and tablet
- **Sidebar Navigation** — Collapsible sidebar with quick access
- **Real-time Updates** — TanStack Query for efficient data fetching

---

## Screenshots

### Dashboard
![Dashboard](https://i.ibb.co/zTK2yr5b/image.png)
> Overview with stats cards showing servers, VMs, storage, and IPs

### Visual Workspace
![Visual Workspace](https://i.ibb.co/N6BY9JXq/image.png)
> 2D canvas with draggable nodes representing your infrastructure hierarchy

### Network Connections
![Network Connections](https://i.ibb.co/TDHSpmrM/image.png)
> Manage uplinks with custom colors, bandwidth, and types

### User Management
![User Management](https://i.ibb.co/N2gVpvtt/image.png)
> Admin panel for creating and managing users

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- Git

### One-Command Deploy

```bash
# Clone the repository
git clone https://github.com/M4xyll/infradash.git
cd infradash

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d --build

# Run database migrations and seed
docker exec -it $(docker ps -qf "name=backend") npx prisma migrate dev --name init
docker exec -it $(docker ps -qf "name=backend") npx prisma db seed
```

### Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | `http://localhost:4781` | Web dashboard |
| Backend | `http://localhost:4782/api` | REST API |
| Database | `localhost:5437` | PostgreSQL |

### Default Login

After seeding, use these credentials:

| Email | Password | Role |
|-------|----------|------|
| `admin@infra.local` | `admin123` | Admin |
| `operator@infra.local` | `operator123` | Operator |
| `viewer@infra.local` | `viewer123` | Viewer |

> ⚠️ **Important**: Change these passwords immediately in production!

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
POSTGRES_USER=infrauser
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=infra_db

# Backend
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d
NODE_ENV=production
CORS_ORIGIN=*

# Frontend (set to your server IP/domain in production)
NEXT_PUBLIC_API_URL=http://localhost:4782/api
```

### Production Deployment

For production, make sure to:

1. **Change all default passwords** in `.env`
2. **Set a strong `JWT_SECRET`** (use `openssl rand -base64 32`)
3. **Configure `CORS_ORIGIN`** to your frontend domain
4. **Set `NEXT_PUBLIC_API_URL`** to your backend URL
5. **Use HTTPS** with a reverse proxy (nginx, Caddy, Traefik)

#### Example with Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name infra.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:4781;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /api {
        proxy_pass http://localhost:4782/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui, Radix UI |
| **State** | TanStack Query (React Query) |
| **Visualization** | ReactFlow, Dagre (auto-layout) |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma 5 |
| **Auth** | JWT, bcrypt |
| **Container** | Docker, Docker Compose |

---

## Project Structure

```
infradash/
├── docker-compose.yml          # Container orchestration
├── .env.example                 # Environment template
│
├── backend/
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Sample data seeder
│   └── src/
│       ├── index.ts            # Express app entry
│       ├── config/             # Configuration
│       ├── middleware/         # Auth, RBAC, error handling
│       ├── routes/             # API endpoints
│       ├── services/           # Business logic
│       ├── types/              # TypeScript types
│       └── utils/              # JWT, logger utilities
│
├── frontend/
│   ├── Dockerfile
│   └── src/
│       ├── app/                # Next.js App Router pages
│       │   ├── dashboard/      # Protected dashboard routes
│       │   └── login/          # Auth pages
│       ├── components/         # React components
│       │   ├── ui/             # shadcn/ui components
│       │   ├── sidebar.tsx     # Navigation sidebar
│       │   └── workspace/      # ReactFlow nodes
│       ├── hooks/              # Custom React hooks
│       └── lib/                # API client, utilities
│
└── scripts/
    └── init-db.sh              # Database initialization
```

---

## API Reference

### Authentication

```http
POST   /api/auth/login          # Login with email/password
GET    /api/auth/me             # Get current user
POST   /api/auth/users          # Create user (Admin only)
GET    /api/auth/users          # List users (Admin only)
PUT    /api/auth/users/:id      # Update user (Admin only)
DELETE /api/auth/users/:id      # Delete user (Admin only)
```

### Infrastructure

```http
GET    /api/tree                # Full hierarchy with stats

# Servers
GET    /api/servers             # List all servers
POST   /api/servers             # Create server
GET    /api/servers/:id         # Get server
PUT    /api/servers/:id         # Update server
DELETE /api/servers/:id         # Delete server

# Virtual Machines
GET    /api/vms                 # List all VMs
POST   /api/vms                 # Create VM
PUT    /api/vms/:id             # Update VM
DELETE /api/vms/:id             # Delete VM

# Disks
GET    /api/disks               # List all disks
POST   /api/disks               # Create disk
PUT    /api/disks/:id           # Update disk
DELETE /api/disks/:id           # Delete disk

# IP Addresses
GET    /api/ips                 # List all IPs
POST   /api/ips                 # Create IP
PUT    /api/ips/:id             # Update IP
DELETE /api/ips/:id             # Delete IP

# Network Connections
GET    /api/network-connections     # List all connections
POST   /api/network-connections     # Create connection
PUT    /api/network-connections/:id # Update connection
DELETE /api/network-connections/:id # Delete connection
```

### Workspace

```http
GET    /api/workspace/layout    # Get saved layout
POST   /api/workspace/layout    # Save layout positions
```

---

## Role Permissions

| Action | Admin | Operator | Viewer |
|--------|:-----:|:--------:|:------:|
| View infrastructure | ✅ | ✅ | ✅ |
| Create resources | ✅ | ✅ | ❌ |
| Update resources | ✅ | ✅ | ❌ |
| Delete resources | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Save workspace layout | ✅ | ✅ | ✅ |

---

## Development

### Local Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL connection
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Database Commands

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create a migration
npx prisma migrate dev --name your_migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio
```

---

## Roadmap
- [X] **VM Support** - BYO VMs to quickly monitor your services
- [X] **Server Support** - BYO Servers to connect them to your VMs
- [X] **IP Integration** - Add your IPs to monitor used or not
- [X] **2D Draggable Canvas** - Quickly view your services in a detailed canvas
- [ ] **Export/Import** — Backup and restore configurations
- [ ] **Monitoring Integration** — CPU, RAM, disk usage stats
- [ ] **3D Workspace Canvas** - Overkill feature just for fun
- [ ] **Proxmox Sync** — Auto-import VMs from Proxmox API
- [ ] **Audit Logs** — Track who changed what and when
- [ ] **Multi-tenancy** — Separate workspaces for teams
- [ ] **API Keys** — Programmatic access without JWT

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the GPL 3.0 License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for the self-hosting community
  <br />
  <sub>If this project helps you, consider giving it a ⭐</sub>
</p>
