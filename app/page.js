import AbhayaDashboard from '@/components/AbhayaDashboard';

export const metadata = {
  title: 'Abhaya Grid | Safety Matrix',
  description: 'Geospatial Women\'s Safety Matrix for public utility and monitoring.',
};

export default function Home() {
  return (
    <main className="app-container">
      <AbhayaDashboard />
    </main>
  );
}
