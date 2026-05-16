import './globals.css';

export const metadata = {
  title: 'Abhaya Grid | Safety Matrix',
  description: 'Geospatial Women\'s Safety Matrix for public utility and monitoring.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
