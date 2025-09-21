# PDF-AI-TechCBH Authentication System

A complete Next.js 15 application with Supabase authentication, featuring email/password signup, login, and session management.

## 🚀 Features

- ✅ **Simple email/password authentication**
- ✅ **User session management**
- ✅ **Route protection with middleware**
- ✅ **Email confirmation workflow**
- ✅ **Detailed error handling**
- ✅ **Server-side rendering (SSR) support**

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Package Manager**: pnpm

## 📁 Project Structure

```
my-app/
├── app/
│   ├── login/
│   │   ├── page.tsx          # Login/Signup forms
│   │   ├── actions.tsx       # Server actions for auth
│   │   └── error.tsx         # Login error handling
│   ├── error/
│   │   └── page.tsx          # Global error page with details
│   ├── private/
│   │   └── page.tsx          # Protected route example
│   └── test-supabase/
│       └── page.tsx          # Supabase connection test
├── utils/supabase/
│   ├── client.ts             # Browser-side Supabase client
│   ├── server.ts             # Server-side Supabase client
│   └── middleware.ts         # Middleware Supabase client
├── middleware.ts             # Route protection middleware
├── .env.local               # Environment variables
└── README.md               # This file
```

## 🔐 Authentication System Overview

### Core Files and Their Functions

#### **Environment Configuration**
```
📄 .env.local
```
**Purpose**: Stores Supabase credentials securely  
**Function**: Allows app to connect to your Supabase database  
**Usage**: Next.js automatically loads these variables at runtime

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### **Supabase Client Files**

**📄 `utils/supabase/client.ts`**
- **Purpose**: Creates Supabase client for browser-side operations
- **Function**: Handles auth operations in React components
- **Usage**: Client-side authentication calls

**📄 `utils/supabase/server.ts`**
- **Purpose**: Creates Supabase client for server-side operations
- **Function**: Handles auth in Server Actions and API routes
- **Usage**: Server-side authentication processing

**📄 `utils/supabase/middleware.ts`**
- **Purpose**: Creates Supabase client for middleware operations
- **Function**: Checks user authentication on every request
- **Usage**: Session validation and cookie management

#### **Route Protection**

**📄 `middleware.ts`**
- **Purpose**: Protects all routes by checking authentication
- **Function**: Ensures only logged-in users access protected pages
- **Usage**: Runs on every request, redirects unauthenticated users

#### **Authentication Pages**

**📄 `app/login/page.tsx`**
- **Purpose**: Provides login/signup forms
- **Function**: User interface for authentication
- **Usage**: Forms submit to Server Actions

**📄 `app/login/actions.tsx`**
- **Purpose**: Handles login/signup logic
- **Function**: Processes authentication securely on server
- **Usage**: Server Actions call Supabase auth methods

**📄 `app/error/page.tsx`**
- **Purpose**: Shows authentication errors with details
- **Function**: Helps debug auth failures
- **Usage**: Displays error messages from failed auth attempts

## 🔄 Authentication Flow

### **Signup Process:**
1. User fills form → `app/login/page.tsx`
2. Form submits → `app/login/actions.tsx` (signup function)
3. Server Action calls → `utils/supabase/server.ts`
4. Supabase sends → Confirmation email
5. User confirms → Account activated
6. Redirect to → Protected routes

### **Login Process:**
1. User enters credentials → `app/login/page.tsx`
2. Form submits → `app/login/actions.tsx` (login function)
3. Supabase validates → Credentials
4. Session created → Cookies set
5. Redirect to → Protected routes

### **Route Protection:**
1. User visits any URL → `middleware.ts` runs
2. Middleware calls → `utils/supabase/middleware.ts`
3. Checks session → `supabase.auth.getUser()`
4. If no user → Redirect to `/login`
5. If authenticated → Allow access

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Chrishegyesi/PDF-AI-TechCBH.git
   cd PDF-AI-TechCBH
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Configure Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key to `.env.local`
   - In Supabase dashboard → Authentication → URL Configuration:
     - Add `http://localhost:3000` to allowed redirect URLs
     - Set Site URL to `http://localhost:3000` for development

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Test the setup**
   - Visit `http://localhost:3000/test-supabase` to verify connection
   - Visit `http://localhost:3000/login` to test authentication

## 🧪 Testing the Authentication

### Test Connection
Visit `/test-supabase` to verify your Supabase connection is working.

### Test Authentication
1. Go to `/login`
2. Try signing up with a valid email
3. Check your email for confirmation link
4. Modify the confirmation URL to point to `localhost:3000`
5. Complete email verification
6. Log in with your credentials

## 🛡️ Security Features

- **Environment Variables**: Sensitive data stored securely
- **Server-Side Validation**: Authentication processed on server
- **Route Protection**: Middleware guards all protected routes
- **Session Management**: Automatic token refresh
- **Error Handling**: Detailed error messages for debugging

## 📝 Additional Components

### User Dashboard Example
```typescript
// app/dashboard/page.tsx
'use client'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  return (
    <div>
      <h1>Welcome {user?.email}</h1>
    </div>
  )
}
```

### Logout Button Component
```typescript
// components/LogoutButton.tsx
'use client'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return <button onClick={handleLogout}>Logout</button>
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Environment variables not loading**
   - Ensure file is named `.env.local` (with dot)
   - Restart development server after changes

2. **Authentication errors**
   - Check Supabase dashboard for project status
   - Verify URL and anon key in `.env.local`
   - Check email confirmation requirements

3. **Redirect issues**
   - Add `localhost:3000` to Supabase allowed URLs
   - Check middleware configuration

4. **Email confirmation not working**
   - Modify confirmation URL to point to localhost
   - Check Supabase email templates

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Built with ❤️ using Next.js 15 and Supabase**
