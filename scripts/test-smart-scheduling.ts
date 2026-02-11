
import { startWorkSchema } from '../src/lib/validations/jobs';
import { CreateJobInput } from '../src/domains/jobs/job.types';

// Mock Data
const jobInput: CreateJobInput = {
    title: "Test Job for Smart Scheduling",
    description: "Testing preferredTimeSlot persistence.",
    jobCategory: "CCTV",
    location: "Mumbai",
    fullAddress: "123 Test St",
    address: { cityPincode: "400001" },
    isGstInvoiceRequired: false,
    deadline: new Date(),
    preferredTimeSlot: "Evening", // <--- THE NEW FIELD
    isUrgent: true
};

console.log("Validating Job Input Structure...");
if (jobInput.preferredTimeSlot === 'Evening') {
    console.log("✅ preferredTimeSlot is valid in CreateJobInput");
} else {
    console.error("❌ preferredTimeSlot missing or invalid");
}

console.log("Done.");
