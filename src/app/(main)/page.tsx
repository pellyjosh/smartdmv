
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
// import { mockVetServices } from '@/lib/mockData';
// import { VetServiceCard } from '@/components/VetServiceCard';
// import { useUser } from '@/context/UserContext';

export default function HomePage() {
  // const { user, isLoading } = useUser();

  // const WelcomeMessage = () => (
  //   <div className="text-center">
  //     <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-6xl">
  //       Welcome to SmartDVM
  //     </h1>
  //     <p className="mt-6 text-lg leading-8 text-foreground">
  //       Your trusted partner in pet health management.
  //     </p>
  //     {!user && !isLoading && (
  //       <div className="mt-10 flex items-center justify-center gap-x-6">
  //         <Button asChild>
  //           <Link href="/auth/login">Get started</Link>
  //         </Button>
  //       </div>
  //     )}
  //   </div>
  // );

  return (
    <div className="container mx-auto py-8">
      {/* <WelcomeMessage /> */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-6xl">
          Welcome to SmartDVM (Simplified)
        </h1>
        <p className="mt-6 text-lg leading-8 text-foreground">
          This is the simplified home page.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild>
            <Link href="/auth/login">Login</Link>
          </Button>
        </div>
      </div>
      
      {/* 
      <section className="mt-12">
        <h2 className="text-3xl font-semibold text-center mb-8 text-foreground">
          Our Services
        </h2>
        {mockVetServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockVetServices.map(service => (
              <VetServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No services available at the moment.</p>
        )}
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/services">View All Services</Link>
          </Button>
        </div>
      </section>
      */}
    </div>
  );
}
