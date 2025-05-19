import Link from 'next/link';
import Image from 'next/image';
import type { VetService } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FavoriteButton } from './FavoriteButton';
import { Star, MapPin } from 'lucide-react';

interface VetServiceCardProps {
  service: VetService;
}

export function VetServiceCard({ service }: VetServiceCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0 relative">
        <Link href={`/services/${service.id}`} className="block">
          <Image
            src={service.imageUrl}
            alt={service.name}
            width={600}
            height={400}
            className="w-full h-48 object-cover"
            data-ai-hint="vet clinic building"
          />
        </Link>
        <div className="absolute top-2 right-2">
          <FavoriteButton serviceId={service.id} className="bg-background/70 hover:bg-background/90" />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-xl mb-2">
          <Link href={`/services/${service.id}`} className="hover:text-primary transition-colors">
            {service.name}
          </Link>
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground mb-2 line-clamp-3">
          {service.shortDescription}
        </CardDescription>
        <div className="flex items-center text-sm text-muted-foreground mt-2">
          <MapPin className="w-4 h-4 mr-1 text-primary" />
          <span>{service.address.split(',')[1]?.trim() || service.address.split(',')[0]?.trim()}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 flex justify-between items-center border-t">
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${i < Math.round(service.rating) ? 'text-accent fill-accent' : 'text-muted-foreground/50'}`}
            />
          ))}
          <span className="ml-2 text-sm text-muted-foreground">({service.rating.toFixed(1)})</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/services/${service.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
