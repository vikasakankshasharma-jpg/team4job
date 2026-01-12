export const openApiSpec = {
    openapi: '3.0.0',
    info: {
        title: 'Team4Job API',
        version: '1.0.0',
        description: 'API Documentation for Team4Job Platform. This API powers the Next.js frontend and mobile apps.',
        contact: {
            name: 'Team4Job Support',
            email: 'support@team4job.com',
            url: 'https://team4job.com/support',
        },
    },
    servers: [
        {
            url: 'https://dodo-beta.web.app/api',
            description: 'Production Server',
        },
        {
            url: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api` : 'http://localhost:3000/api',
            description: 'Local Development',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Firebase Auth ID Token'
            }
        },
        schemas: {
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    roles: {
                        type: 'array',
                        items: { type: 'string', enum: ['Job Giver', 'Installer', 'Admin'] }
                    },
                    status: { type: 'string', enum: ['active', 'suspended', 'deactivated'] }
                }
            },
            Job: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    status: { type: 'string' },
                    budget: { type: 'number' },
                    location: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            }
        }
    },
    paths: {
        '/auth/verify-email': {
            post: {
                summary: 'Verify Email',
                description: 'Verifies a user email using OTP',
                tags: ['Auth'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    otp: { type: 'string' }
                                },
                                required: ['email', 'otp']
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Email verified successfully'
                    },
                    '400': {
                        description: 'Invalid OTP or expired'
                    }
                }
            }
        },
        '/cashfree/payment/create-order': {
            post: {
                summary: 'Create Payment Order',
                description: 'Initiates a payment order with Cashfree',
                tags: ['Payments'],
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    jobId: { type: 'string' },
                                    amount: { type: 'number' }
                                },
                                required: ['jobId', 'amount']
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Order created',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        paymentSessionId: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
