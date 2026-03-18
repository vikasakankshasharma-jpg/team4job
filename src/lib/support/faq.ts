export const FAQ_DATA = [
    {
        question: "How do I award a job?",
        answer: "As a Client, you can award a job by going to your Job Details page, reviewing the bids, and clicking 'Award Job' next to the professional you want to hire. You need to set an acceptance deadline for them to respond."
    },
    {
        question: "How does the escrow system work?",
        answer: "Once you accept a bid, you fund the job. The money is held securely by Team4Job (via Cashfree). Funds are only released to the professional after they complete the work and you approve it using the OTP system."
    },
    {
        question: "How do I release funds to the professional?",
        answer: "When the professional marks the job as complete, they will ask you for an OTP. Once you provide the OTP to them (or click 'Approve' manually in your dashboard), the funds held in escrow are automatically released to their wallet."
    },
    {
        question: "What should I do if there is a dispute?",
        answer: "If you are unhappy with the work or if the professional is unresponsive, you can 'Raise a Dispute' from the Job Details page. This freezes the funds in escrow and alerts our admin team to mediate."
    },
    {
        question: "How can I get verified as a professional?",
        answer: "To get verified, go to your professional profile settings and complete the KYC process. You will need to provide your Aadhar, PAN, and eventually a shop photo for OCR verification. Verified professionals get a badge and better visibility."
    },
    {
        question: "Is there a platform fee?",
        answer: "Yes, Team4Job charges a small service fee (typically 5% commission from the job amount) to maintain the platform and secure escrow services."
    },
    {
        question: "How do I switch between Client and Professional roles?",
        answer: "You can toggle your view using the switch in the top navigation bar. This allows you to manage the jobs you've posted and the bids you've placed from the same account."
    }
];

export const SYSTEM_PROMPT = `
You are the Team4Job AI Support Assistant. Your goal is to help users understand how the platform works.
Use the following FAQ data to answer user questions:
${JSON.stringify(FAQ_DATA, null, 2)}

If the answer is not in the FAQ, politely inform the user that you don't have that specific information and suggest they contact human support at support@team4job.com or call 9587980007.
Keep your answers helpful, concise, and professional.
`;
