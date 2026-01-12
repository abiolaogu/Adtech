# AdTech Platform - Frontend Application

Modern, responsive web application for the AdTech platform built with React, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at http://localhost:5173

## 📁 Project Structure

```
frontend-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Shared components (buttons, cards, etc.)
│   │   ├── charts/         # Chart components
│   │   └── layout/         # Layout components (header, sidebar)
│   ├── pages/              # Page components
│   │   ├── auth/           # Authentication pages
│   │   ├── advertiser/     # Advertiser dashboard & pages
│   │   ├── publisher/      # Publisher dashboard & pages
│   │   └── admin/          # Admin dashboard & pages
│   ├── services/           # API services
│   ├── stores/             # Zustand state stores
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Main app component with routing
│   └── main.tsx            # Application entry point
├── public/                 # Static assets
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
└── tailwind.config.js     # Tailwind CSS configuration
```

## 🎨 Tech Stack

### Core
- **React 18.2.0** - UI library
- **TypeScript 5.3.3** - Type safety
- **Vite 5.0.8** - Build tool and dev server

### Routing & State
- **React Router DOM 6.20.1** - Client-side routing
- **Zustand 4.4.7** - Lightweight state management
- **TanStack React Query 5.12.2** - Server state management

### Styling
- **Tailwind CSS 3.4.0** - Utility-first CSS framework
- **Headless UI 1.7.17** - Accessible UI components
- **Lucide React 0.294.0** - Icon library

### Forms & Validation
- **React Hook Form 7.49.2** - Form management
- **Zod 3.22.4** - Schema validation

### Data Visualization
- **Recharts 2.10.3** - Charts and graphs

### HTTP & API
- **Axios 1.6.2** - HTTP client

## 🔑 Key Features

### Multi-Role Support

The app supports multiple user roles with role-specific UIs:

1. **Advertiser** - Campaign creation, creative management, analytics
2. **Publisher** - Ad unit management, revenue analytics, inventory
3. **Admin** - Platform administration, user management, system monitoring
4. **Agency** - Multi-account management
5. **Analyst** - Advanced analytics and reporting
6. **Finance Manager** - Billing and financial oversight
7. **Content Moderator** - Creative review and approval

### Authentication

- JWT-based authentication
- Protected routes with role-based access control
- Persistent sessions with localStorage
- Automatic token refresh

### Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly UI elements
- Optimized for tablets and mobile devices

### Performance

- Code splitting with React.lazy
- Route-based lazy loading
- Optimized bundle size
- Fast refresh in development
- Production builds with tree shaking

## 🎯 Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true

# Environment
VITE_ENV=development
```

## 📱 Responsive Breakpoints

The app uses Tailwind's default breakpoints:

- **sm**: 640px - Small phones in landscape, large phones
- **md**: 768px - Tablets
- **lg**: 1024px - Small desktops, landscape tablets
- **xl**: 1280px - Large desktops
- **2xl**: 1536px - Extra large screens

## 🎨 Theme Configuration

The app supports light and dark themes through Tailwind CSS:

```typescript
// Theme detection
const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Theme classes
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-white">Content</p>
</div>
```

## 🧩 Component Examples

### Using the MetricCard Component

```tsx
import { MetricCard } from '@/components/common/MetricCard';
import { Eye } from 'lucide-react';

<MetricCard
  title="Impressions"
  value="1,234,567"
  change={12.5}
  trend="up"
  icon={<Eye className="w-6 h-6 text-blue-600" />}
/>
```

### Using Charts

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

const data = [
  { date: 'Jan', impressions: 4000 },
  { date: 'Feb', impressions: 5000 },
  { date: 'Mar', impressions: 6000 },
];

<LineChart width={600} height={300} data={data}>
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="impressions" stroke="#3b82f6" />
</LineChart>
```

## 🔄 State Management

### Zustand Store Example

```typescript
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    set({ user: response.data.user, isAuthenticated: true });
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));
```

### React Query Example

```typescript
import { useQuery } from '@tanstack/react-query';

const useCampaigns = () => {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const response = await api.get('/campaigns');
      return response.data;
    },
  });
};
```

## 🛣️ Routing

The app uses React Router with role-based protected routes:

```typescript
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/login" element={<Login />} />

  <Route element={<ProtectedRoute allowedRoles={['advertiser']} />}>
    <Route path="/advertiser" element={<AdvertiserDashboard />} />
    <Route path="/advertiser/campaigns" element={<Campaigns />} />
  </Route>

  <Route element={<ProtectedRoute allowedRoles={['publisher']} />}>
    <Route path="/publisher" element={<PublisherDashboard />} />
  </Route>

  <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
    <Route path="/admin" element={<AdminDashboard />} />
  </Route>
</Routes>
```

## 📦 Building for Production

```bash
# Build the app
npm run build

# Output directory: dist/
# - Minified JavaScript
# - Optimized CSS
# - Compressed assets
# - Source maps (optional)
```

### Build Optimization

The production build includes:

- ✅ Tree shaking to remove unused code
- ✅ Code splitting for optimal loading
- ✅ Minification of JS and CSS
- ✅ Asset optimization (images, fonts)
- ✅ Gzip compression
- ✅ Cache busting with content hashes

### Deployment

The `dist/` folder can be deployed to:

- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy --prod`
- **AWS S3 + CloudFront**: Upload to S3 bucket
- **Nginx**: Serve static files from dist/
- **Docker**: Use nginx:alpine base image

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Change port in vite.config.ts
export default defineConfig({
  server: {
    port: 5174, // Use different port
  },
});
```

### TypeScript Errors

```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
```

### Build Fails

```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run build
```

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Router Docs](https://reactrouter.com)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [TanStack Query Docs](https://tanstack.com/query/latest)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run linting: `npm run lint`
4. Test your changes
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feature/my-feature`
7. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details
