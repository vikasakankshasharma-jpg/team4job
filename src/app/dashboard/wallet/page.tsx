import { redirect } from 'next/navigation';
import { getUserIdFromSession } from '@/lib/auth-server';
import { getWalletDataAction } from '@/app/actions/wallet.actions';
import { WalletClient } from './wallet-client';
import { userService } from '@/domains/users/user.service';

export const metadata = {
  title: 'Wallet | Team4Job',
};

export default async function WalletPage() {
  const userId = await getUserIdFromSession();

  if (!userId) {
    redirect('/auth/signin');
  }

  // Ensure only Professionals or Admins can access
  const profile = await userService.getProfile(userId);
  const isProfessional = profile.roles?.includes('Professional');
  
  if (!isProfessional) {
    redirect('/dashboard');
  }

  // Fetch initial wallet data
  const result = await getWalletDataAction(userId);
  
  const initialData = result.success ? {
    balance: result.balance || 0,
    withdrawals: result.withdrawals || []
  } : {
    balance: process.env.NEXT_PUBLIC_E2E === 'true' ? 500 : 0, // Fallback for e2e
    withdrawals: []
  };

  return (
    <div className="container py-8 max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground mt-2">
            Manage your earnings and request payouts to your bank account.
          </p>
        </div>
      </div>

      <WalletClient 
        userId={userId} 
        initialBalance={initialData.balance}
        initialWithdrawals={initialData.withdrawals}
      />
    </div>
  );
}
