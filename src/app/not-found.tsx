import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component, e.g., from shadcn/ui

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
      <p className="text-lg mb-8">Could not find the requested resource.</p>
      <Link href="/" passHref>
        {/* Using your Button component */}
        <Button>Return Home</Button>
      </Link>
    </div>
  );
}