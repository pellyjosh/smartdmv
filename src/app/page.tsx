import { mockVetServices } from '@/lib/mockData';
import { VetServiceCard } from '@/components/VetServiceCard';

export default function HomePage() {
  return (
    <div className="container mx-auto">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary tracking-tight">Find Veterinary Services</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Discover trusted local vets for your beloved pets.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockVetServices.map(service => (
          <VetServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}
