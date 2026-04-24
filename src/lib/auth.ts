import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

type GitHubProfileLike = {
  avatar_url?: unknown;
  email?: unknown;
  id?: unknown;
  login?: unknown;
};

function normalizePrincipal(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : null;
}

function isPrincipal(value: string | null): value is string {
  return Boolean(value);
}

function getGitHubLogin(profile: unknown) {
  return typeof profile === "object" &&
    profile !== null &&
    "login" in profile &&
    typeof profile.login === "string"
    ? normalizePrincipal(profile.login)
    : null;
}

export function getAllowedGitHubUsers() {
  return new Set(
    (process.env.ALLOWED_GITHUB_USERS ?? "")
      .split(",")
      .map((user) => user.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAppAuthEnabled() {
  return Boolean(
    process.env.AUTH_GITHUB_ID &&
      process.env.AUTH_GITHUB_SECRET &&
      (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET) &&
      getAllowedGitHubUsers().size > 0,
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
      profile(profile: GitHubProfileLike) {
        return {
          id: String(profile.id ?? profile.login ?? ""),
          name: normalizePrincipal(profile.login) ?? "github-user",
          email: typeof profile.email === "string" ? profile.email : null,
          image: typeof profile.avatar_url === "string" ? profile.avatar_url : null,
        };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ profile, user }) {
      const allowedUsers = getAllowedGitHubUsers();
      const candidates = [
        getGitHubLogin(profile),
        normalizePrincipal(user.name),
        normalizePrincipal(user.email),
      ].filter(isPrincipal);

      return candidates.some((candidate) => allowedUsers.has(candidate));
    },
    async jwt({ token, profile, user }) {
      const login = getGitHubLogin(profile) ?? normalizePrincipal(user?.name);
      if (login) {
        (token as typeof token & { githubUsername?: string }).githubUsername =
          login;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.email === "string") {
        session.user.email = token.email;
      }

      return session;
    },
  },
};
