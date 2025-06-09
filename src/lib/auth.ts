import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@/generated/prisma'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import type { Session, User } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import type { SessionStrategy } from 'next-auth'

const prisma = new PrismaClient()

declare module 'next-auth' {
  interface User {
    id: string
    role: string
  }
  interface Session {
    user: {
      id: string
      role: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    sub?: string
    email?: string
  }
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' as SessionStrategy },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user) {
          return null
        }
        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          return null
        }
        return { id: user.id, sub: user.id, email: user.email, role: user.role }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/signout',
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, user }: { token: JWT, user?: User }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.sub = user.id
      } else if (!token.role && token.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } })
        token.role = dbUser?.role || 'user'
        token.id = dbUser?.id
        token.sub = dbUser?.id
      }
      return token
    },
    async session({ session, token }: { session: Session, token: JWT }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = (token.id || token.sub) as string
      }
      return session
    },
  },
} 