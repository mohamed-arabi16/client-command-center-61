# Session Zen Pro - Project Guide

## 1. Project Overview
**Session Zen Pro** is a comprehensive business management platform designed for freelancers, agencies, and service providers. It streamlines client management, proposal creation, content planning, and business intelligence tracking.

The application is built as a modern Single Page Application (SPA) using React and Vite, with Supabase as the backend for authentication and data storage.

## 2. Key Features

### 👥 Client Management
- **Client Dashboard**: Centralized view of all clients with status indicators.
- **Client Details**: Detailed profile for each client including contract info, deliverables, and activity logs.
- **Instagram Integration**: Scrape and track client Instagram metrics (followers, bio, profile pic).
- **Payment Terms**: Track installment schedules and payment statuses.

### 📝 Proposals & Contracts
- **Proposal Builder**: Drag-and-drop interface to create professional proposals.
- **Templates**: Save and reuse proposal templates for faster workflow.
- **Sharing**: Secure public links for clients to view and approve proposals.
- **Package Comparison**: Tools to compare different service packages.

### 📅 Content & Productivity
- **Content Calendar**: Visual calendar to plan and schedule content.
- **Content Uploader**: Manage and upload media assets.
- **Time Tracking**: Track time spent on various tasks and clients.
- **AI Tools Tracking**: Monitor usage and costs of AI tools.

### 📊 Business Intelligence
- **Dashboard**: High-level metrics on revenue, active clients, and pending tasks.
- **Admin Services**: Manage service offerings and pricing.

## 3. Technology Stack

- **Frontend Framework**: [React](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (based on Radix UI)
- **Backend & Auth**: [Supabase](https://supabase.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest) (React Query)
- **Routing**: [React Router](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 4. Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── ui/            # Shadcn UI primitives (Button, Card, etc.)
│   ├── client-detail/ # Components specific to client pages
│   └── ...
├── pages/             # Main route components (Dashboard, Auth, etc.)
├── hooks/             # Custom React hooks
├── contexts/          # React Context providers (AuthContext)
├── integrations/      # External service integrations (Supabase)
├── lib/               # Utility functions and helpers
└── types/             # TypeScript type definitions
```

## 5. Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or bun

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd session-zen-pro
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory with your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

5.  **Build for Production**
    ```bash
    npm run build
    ```

## 6. Development Guidelines

- **Lazy Loading**: All main page routes are lazy-loaded in `App.tsx` to optimize performance.
- **Styling**: Use Tailwind utility classes for styling. Define custom colors in `index.css` (HSL format) and `tailwind.config.ts`.
- **Components**: Build small, reusable components. Place generic UI components in `src/components/ui` and feature-specific ones in their respective folders.
- **Data Fetching**: Use `useQuery` and `useMutation` from TanStack Query for all server state.

## 7. Deployment
The project is configured for easy deployment on platforms like Vercel or Netlify. Ensure you add the environment variables in your deployment provider's settings.
