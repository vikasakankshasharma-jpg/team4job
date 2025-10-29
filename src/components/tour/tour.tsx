
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Joyride, { Step, CallBackProps } from 'react-joyride';
import { useUser } from '@/hooks/use-user';
import { useIsMobile } from '@/hooks/use-mobile';

const installerSteps: Step[] = [
  {
    target: '[data-tour="sidebar-header"]',
    content: 'Welcome to your dashboard! This is your sidebar where you can navigate to different sections of the app.',
  },
  {
    target: '[data-tour="my-bids"]',
    content: 'Here you can see all the bids you have made for jobs.',
  },
  {
    target: '[data-tour="all-jobs"]',
    content: 'Discover new job opportunities here.',
  },
  {
    target: '[data-tour="find-project-card"]',
    content: 'Use this section to find new job opportunities that match your skills.',
  },
  {
    target: '[data-tour="manage-profile-card"]',
    content: 'Keep your profile updated to attract more job offers.',
  },
];

const jobGiverSteps: Step[] = [
  {
    target: '[data-tour="sidebar-header"]',
    content: 'Welcome to your dashboard! This is your sidebar where you can navigate to different sections of the app.',
  },
  {
    target: '[data-tour="posted-jobs"]',
    content: 'Here you can see all the jobs you have posted.',
  },
  {
    target: '[data-tour="post-job"]',
    content: 'Or create a new job posting here.',
  },
  {
    target: '[data-tour="need-installer-card"]',
    content: 'Post a new job here whenever you need to hire an installer.',
  },
  {
    target: '[data-tour="manage-jobs-card"]',
    content: 'Track and manage all the jobs you have posted.',
  },
];

const Tour = () => {
  const [runTour, setRunTour] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { role } = useUser();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Start tour if tour=true is in the URL and not on mobile
    if (searchParams.get('tour') === 'true' && !isMobile) {
      setRunTour(true);
    }
  }, [searchParams, isMobile]);

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = ['finished', 'skipped'];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      // Clean up URL by removing the tour parameter
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('tour');
      router.replace(`${pathname}?${newParams.toString()}`);
    }
  };

  const steps = role === 'Installer' ? installerSteps : jobGiverSteps;

  if (isMobile || !isClient) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          textColor: 'hsl(var(--foreground))',
          backgroundColor: 'hsl(var(--background))',
          arrowColor: 'hsl(var(--background))',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
        },
        buttonBack: {
            color: 'hsl(var(--foreground))',
        }
      }}
    />
  );
};

export default Tour;
