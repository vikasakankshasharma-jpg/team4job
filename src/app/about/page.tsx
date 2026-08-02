import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'About Us | Team4Job',
  description: 'Learn more about Team4Job, the leading platform connecting clients with skilled professionals.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-20">
      <div className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-background rounded-2xl shadow-xl overflow-hidden p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">About Team4Job</h1>
          
          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>
              Welcome to <strong>Team4Job</strong>, your trusted platform for connecting clients with highly skilled professionals across various industries. 
            </p>
            
            <p>
              Our mission is to bridge the gap between talent and opportunity. We believe that finding the right professional for your project shouldn&apos;t be a hassle, and finding the right project for your skills shouldn&apos;t be a struggle. We&apos;ve built Team4Job to make these connections seamless, secure, and successful.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Our Vision</h2>
            <p>
              To create a global, borderless marketplace where skills are valued, trust is paramount, and every project finds its perfect match. We strive to empower professionals to build sustainable careers while enabling clients to bring their visions to life.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Why Choose Us?</h2>
            <ul className="list-disc pl-6 space-y-3">
              <li><strong>Verified Professionals:</strong> We thoroughly vet our professionals to ensure top-tier quality and reliability.</li>
              <li><strong>Secure Payments:</strong> Our escrow system guarantees that funds are protected and only released when milestones are met.</li>
              <li><strong>Fair Dispute Resolution:</strong> In the rare event of a disagreement, our dedicated support team ensures a fair resolution for all parties.</li>
              <li><strong>AI-Powered Matching:</strong> We leverage advanced AI to recommend the best professionals for your specific needs.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Join Our Community</h2>
            <p>
              Whether you&apos;re looking to hire top talent or you&apos;re a professional looking to grow your business, Team4Job is the place for you.
            </p>
            
            <div className="mt-8 text-center pt-6">
              <Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full transition-colors shadow-md">
                Get Started Today
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
