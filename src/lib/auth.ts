import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

function getGitHubLogin(profile: unknown) {
  return typeof profile === "object" &&
    profile !== null &&
    "login" in profile &&
    typeof profile.login === "string"
    ? profile.login.toLowerCase()
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
    async signIn({ profile }) {
      const login = getGitHubLogin(profile);
      return Boolean(login && getAllowedGitHubUsers().has(login));
    },
    async jwt({ token, profile }) {
      const login = getGitHubLogin(profile);
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
