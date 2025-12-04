
import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface ActionCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  buttonText: string;
  href: string;
  dataTour?: string;
}

export function ActionCard({ icon: Icon, title, description, buttonText, href, dataTour }: ActionCardProps) {
  return (
    <Card data-tour={dataTour}>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href={href}>
            {buttonText} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
