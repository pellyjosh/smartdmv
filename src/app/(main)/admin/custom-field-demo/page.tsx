"use client";
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { SimpleCustomFieldSelect } from "@/components/form/simple-custom-field-select";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  User,
  ArrowRight,
  ArrowDown,
  Check,
  X,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";

const basicFormSchema = z.object({
  species: z.string().min(1, { message: "Please select a species" }),
  breed: z.string().optional(),
  coat_color: z.string().optional(),
  temperament: z.string().optional(),
});

const dependentFormSchema = z.object({
  animal_type: z.string().min(1, { message: "Please select an animal type" }),
  cat_breed: z.string().optional(),
  dog_breed: z.string().optional(),
  exotic_species: z.string().optional(),
  habitat_type: z.string().optional(),
  diet_type: z.string().optional(),
});

type BasicFormValues = z.infer<typeof basicFormSchema>;
type DependentFormValues = z.infer<typeof dependentFormSchema>;

const CustomFieldDemoPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("basic");
  const { auditLogs } = useCustomFields();

  const basicForm = useForm<BasicFormValues>({
    resolver: zodResolver(basicFormSchema),
    defaultValues: {
      species: "",
      breed: "",
      coat_color: "",
      temperament: "",
    },
  });

  const dependentForm = useForm<DependentFormValues>({
    resolver: zodResolver(dependentFormSchema),
    defaultValues: {
      animal_type: "",
      cat_breed: "",
      dog_breed: "",
      exotic_species: "",
      habitat_type: "",
      diet_type: "",
    },
  });

  // Handle basic form submission
  function onSubmitBasic(data: BasicFormValues) {
    toast({
      title: "Basic form submitted",
      description: <pre>{JSON.stringify(data, null, 2)}</pre>,
    });
  }

  // Handle dependent form submission
  function onSubmitDependent(data: DependentFormValues) {
    toast({
      title: "Dependent form submitted",
      description: <pre>{JSON.stringify(data, null, 2)}</pre>,
    });
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Custom Field Demo</h1>
      <p className="text-gray-500 mb-8">
        This demo showcases custom field dropdowns with dependencies and audit
        logging
      </p>

      <Tabs
        defaultValue="basic"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-8"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Usage</TabsTrigger>
          <TabsTrigger value="dependencies">Field Dependencies</TabsTrigger>
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Basic Usage Tab */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Pet Information</CardTitle>
              <CardDescription>
                This form demonstrates the basic use of custom field dropdown
                selects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...basicForm}>
                <form
                  onSubmit={basicForm.handleSubmit(onSubmitBasic)}
                  className="space-y-6"
                >
                  <SimpleCustomFieldSelect
                    name="species"
                    groupKey="pet_species"
                    categoryName="Custom Field Demo"
                    createIfNotExists
                    label="Species"
                    required
                    placeholder="Select the pet's species"
                    fallbackOptions={[
                      { value: "cat", label: "Cat" },
                      { value: "dog", label: "Dog" },
                      { value: "bird", label: "Bird" },
                      { value: "reptile", label: "Reptile" },
                    ]}
                    onChange={(value: string) => {
                      console.log("Species changed to:", value);
                    }}
                  />

                  <SimpleCustomFieldSelect
                    name="breed"
                    groupKey="pet_breed"
                    categoryName="Custom Field Demo"
                    createIfNotExists
                    label="Breed"
                    placeholder="Select the pet's breed"
                    fallbackOptions={[
                      { value: "mixed", label: "Mixed" },
                      { value: "purebred", label: "Purebred" },
                    ]}
                    onChange={(value: string) => {
                      console.log("Breed changed to:", value);
                    }}
                  />

                  <SimpleCustomFieldSelect
                    name="coat_color"
                    groupKey="pet_color"
                    categoryName="Custom Field Demo"
                    createIfNotExists
                    label="Coat Color"
                    placeholder="Select the pet's coat color"
                    fallbackOptions={[
                      { value: "black", label: "Black" },
                      { value: "white", label: "White" },
                      { value: "brown", label: "Brown" },
                      { value: "tabby", label: "Tabby" },
                    ]}
                    onChange={(value: string) => {
                      console.log("Coat color changed to:", value);
                    }}
                  />

                  <SimpleCustomFieldSelect
                    name="temperament"
                    groupKey="pet_temperament"
                    categoryName="Custom Field Demo"
                    createIfNotExists
                    label="Temperament"
                    placeholder="Select the pet's temperament"
                    fallbackOptions={[
                      { value: "calm", label: "Calm" },
                      { value: "aggressive", label: "Aggressive" },
                      { value: "playful", label: "Playful" },
                    ]}
                    onChange={(value: string) => {
                      console.log("Temperament changed to:", value);
                    }}
                  />

                  <Button type="submit" className="w-full">
                    Submit
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-muted-foreground">
                Custom fields are loaded from the database and can be managed in
                the Custom Fields page.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Dependencies Tab */}
        <TabsContent value="dependencies">
          <Card>
            <CardHeader>
              <CardTitle>Field Dependencies Demo</CardTitle>
              <CardDescription>
                This form demonstrates how field visibility and options can
                depend on other selections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dependentForm}>
                <form
                  onSubmit={dependentForm.handleSubmit(onSubmitDependent)}
                  className="space-y-6"
                >
                  <SimpleCustomFieldSelect
                    name="animal_type"
                    groupKey="animal_type"
                    categoryName="Custom Field Demo"
                    createIfNotExists
                    label="Animal Type"
                    required
                    placeholder="Select the type of animal"
                    fallbackOptions={[
                      { value: "cat", label: "Cat" },
                      { value: "dog", label: "Dog" },
                      { value: "exotic", label: "Exotic" },
                    ]}
                    onChange={(value: string) => {
                      console.log("Animal type changed to:", value);
                    }}
                  />

                  {dependentForm.watch("animal_type") === "cat" && (
                    <SimpleCustomFieldSelect
                      name="cat_breed"
                      groupKey="cat_breed"
                      categoryName="Custom Field Demo"
                      createIfNotExists
                      label="Cat Breed"
                      placeholder="Select the cat's breed"
                      fallbackOptions={[
                        { value: "siamese", label: "Siamese" },
                        { value: "persian", label: "Persian" },
                        { value: "maine_coon", label: "Maine Coon" },
                      ]}
                      onChange={(value: string) => {
                        console.log("Cat breed changed to:", value);
                      }}
                    />
                  )}

                  {dependentForm.watch("animal_type") === "dog" && (
                    <SimpleCustomFieldSelect
                      name="dog_breed"
                      groupKey="dog_breed"
                      categoryName="Custom Field Demo"
                      createIfNotExists
                      label="Dog Breed"
                      placeholder="Select the dog's breed"
                      fallbackOptions={[
                        { value: "labrador", label: "Labrador" },
                        { value: "german_shepherd", label: "German Shepherd" },
                        { value: "bulldog", label: "Bulldog" },
                      ]}
                      onChange={(value: string) => {
                        console.log("Dog breed changed to:", value);
                      }}
                    />
                  )}

                  {dependentForm.watch("animal_type") === "exotic" && (
                    <SimpleCustomFieldSelect
                      name="exotic_species"
                      groupKey="exotic_species"
                      categoryName="Custom Field Demo"
                      createIfNotExists
                      label="Exotic Species"
                      placeholder="Select the exotic animal species"
                      fallbackOptions={[
                        { value: "iguana", label: "Iguana" },
                        { value: "parrot", label: "Parrot" },
                        { value: "ferret", label: "Ferret" },
                      ]}
                      onChange={(value: string) => {
                        console.log("Exotic species changed to:", value);
                      }}
                    />
                  )}

                  <SimpleCustomFieldSelect
                    name="habitat_type"
                    groupKey="habitat_type"
                    categoryName="Custom Field Demo"
                    createIfNotExists
                    label="Habitat Type"
                    placeholder="Select the animal's primary habitat"
                    fallbackOptions={[
                      { value: "urban", label: "Urban" },
                      { value: "rural", label: "Rural" },
                      { value: "forest", label: "Forest" },
                      { value: "desert", label: "Desert" },
                    ]}
                    onChange={(value: string) => {
                      console.log("Habitat type changed to:", value);
                    }}
                  />

                  <SimpleCustomFieldSelect
                    name="diet_type"
                    groupKey="diet_type"
                    categoryName="Custom Field Demo"
                    createIfNotExists
                    label="Diet Type"
                    placeholder="Select the animal's primary diet"
                    fallbackOptions={[
                      { value: "herbivore", label: "Herbivore" },
                      { value: "carnivore", label: "Carnivore" },
                      { value: "omnivore", label: "Omnivore" },
                    ]}
                    onChange={(value: string) => {
                      console.log("Diet type changed to:", value);
                    }}
                  />

                  <Button type="submit" className="w-full">
                    Submit
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter>
              <div className="w-full">
                <Separator className="my-4" />
                <h3 className="text-lg font-medium mb-2">
                  How Dependencies Work
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Field dependencies can be created in the Custom Fields
                  management page. This example uses the following dependency
                  types:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-2">
                    <Eye className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Show When Selected</p>
                      <p className="text-sm text-muted-foreground">
                        Fields appear only when a specific parent option is
                        selected
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <EyeOff className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Hide When Selected</p>
                      <p className="text-sm text-muted-foreground">
                        Fields are hidden when a specific parent option is
                        selected
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Filter className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Filter Values</p>
                      <p className="text-sm text-muted-foreground">
                        Available options change based on the parent selection
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ArrowDown className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Multi-Level Dependencies</p>
                      <p className="text-sm text-muted-foreground">
                        Fields can depend on other fields that also have
                        dependencies
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit-logs">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logging</CardTitle>
              <CardDescription>
                This page demonstrates the audit logging capabilities for custom
                fields
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Recent Audit Logs
                  </h3>
                  {Array.isArray(auditLogs) && auditLogs.length > 0 ? (
                    <div className="border rounded-lg p-0">
                      <div className="divide-y">
                        {auditLogs.slice(0, 10).map((log: any) => (
                          <div key={log.id} className="p-4 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {log.entityType} #{log.entityId}
                              </span>
                              <Badge variant="outline">{log.action}</Badge>
                            </div>
                            <div className="text-muted-foreground mt-1">
                              {new Date(log.timestamp || Date.now()).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-6 text-center">
                      <p className="text-muted-foreground">
                        No audit logs found. Make changes to custom fields to see logs appear here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full">
                <Separator className="my-4" />
                <h3 className="text-lg font-medium mb-2">
                  About Audit Logging
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The system automatically logs all changes to custom fields
                  including:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-2">
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Creation Events</p>
                      <p className="text-sm text-muted-foreground">
                        When new custom fields are created
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <ArrowRight className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Update Events</p>
                      <p className="text-sm text-muted-foreground">
                        When field values are modified
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <X className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Deletion Events</p>
                      <p className="text-sm text-muted-foreground">
                        When fields are removed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <User className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium">User Attribution</p>
                      <p className="text-sm text-muted-foreground">
                        Tracks which user made each change
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomFieldDemoPage;
