import { Geist, Geist_Mono } from "next/font/google";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "../styles/globals.css";

// GraphQL Playground styles
import '@graphiql/plugin-explorer/style.css';
import '@graphiql/react/style.css';
import 'graphiql/graphiql.css';
import 'graphiql/style.css';
import "../share/graphql-playground/styles/graphql-playground.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function MyApp({ Component, pageProps }) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}>
      <Component {...pageProps} />
    </div>
  );
}


