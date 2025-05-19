"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { getServiceById, mockVetServices } from '@/lib/mockData';
import type { VetService } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FavoriteButton } from '@/components/FavoriteButton';
import { MapPin, Phone, Globe, Clock, ListChecks, Star, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function ServiceDetailsPage() {
  const params = useParams();
  const [service, setService] = useState<VetService | null | undefined>(undefined); // undefined for loading, null for not found

  useEffect(() => {
    if (params.id) {
      const foundService = getServiceById(Array.isArray(params.id) ? params.id[0] : params.id);
      setService(foundService || null);
    }
  }, [params.id]);

  if (service === undefined) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-96 w-full rounded-lg" />
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-2xl font-semibold">Service not found</h1>
        <p className="text-muted-foreground">The veterinary service you are looking for does not exist.</p>
        <Button asChild className="mt-4">
          <Link href="/">Back to Services</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button variant="outline" asChild className="mb-6">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Services
        </Link>
      </Button>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2">
          <Card className="overflow-hidden shadow-xl">
            <CardHeader className="p-0 relative">
              <Image
                src={service.imageUrl}
                alt={service.name}
                width={800}
                height={500}
                className="w-full h-auto md:h-[400px] object-cover"
                data-ai-hint="vet clinic interior"
                priority
              />
              <div className="absolute top-4 right-4">
                 <FavoriteButton serviceId={service.id} className="bg-background/70 hover:bg-background/90 p-2 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <h1 className="text-3xl font-bold text-primary mb-2">{service.name}</h1>
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-6 h-6 ${i < Math.round(service.rating) ? 'text-accent fill-accent' : 'text-muted-foreground/30'}`}
                  />
                ))}
                <span className="ml-2 text-lg text-muted-foreground">({service.rating.toFixed(1)} rating)</span>
              </div>
              <p className="text-foreground leading-relaxed mb-6">{service.fullDescription}</p>

              <h2 className="text-2xl font-semibold text-primary mb-3">Services Offered</h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {service.servicesOffered.map((svc) => (
                  <Badge key={svc} variant="secondary" className="text-sm px-3 py-1">{svc}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-primary">Contact & Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start">
                <MapPin className="w-5 h-5 mr-3 mt-1 text-primary flex-shrink-0" />
                <span className="text-foreground">{service.address}</span>
              </div>
              <div className="flex items-center">
                <Phone className="w-5 h-5 mr-3 text-primary flex-shrink-0" />
                <a href={`tel:${service.phone}`} className="text-foreground hover:text-primary transition-colors">{service.phone}</a>
              </div>
              <div className="flex items-center">
                <Globe className="w-5 h-5 mr-3 text-primary flex-shrink-0" />
                <a href={service.website} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors truncate">
                  {service.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
              <div className="flex items-start">
                <Clock className="w-5 h-5 mr-3 mt-1 text-primary flex-shrink-0" />
                <span className="text-foreground">{service.openingHours}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
