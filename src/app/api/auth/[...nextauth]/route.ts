import NextAuth, { SessionStrategy } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const authOptions = {
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
        console.log('Credentials reçues:', credentials);
        if (!credentials?.email || !credentials?.password) {
          console.log('Email ou mot de passe manquant');
          return null;
        }
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        console.log('User trouvé:', user);
        if (!user) {
          console.log('Aucun utilisateur trouvé');
          return null;
        }
        const isValid = await bcrypt.compare(credentials.password, user.password);
        console.log('Résultat bcrypt:', isValid);
        if (!isValid) {
          console.log('Mot de passe invalide');
          return null;
        }
        console.log('Connexion réussie pour:', user.email);
        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    signOut: '/signout',
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role
      } else if (!token.role && token.email) {
        const prisma = new PrismaClient()
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } })
        token.role = dbUser?.role || 'user'
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role
      }
      return session
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export { authOptions }; 