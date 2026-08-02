import { test } from '@playwright/test';

// Force all tests included in this suite to run serially
test.describe.configure({ mode: 'serial' });

import './audit-chunks/01-profile-setup.chunk.ts';
import './audit-chunks/02-job-posting.chunk.ts';
import './audit-chunks/03a-professional-bid.chunk.ts';
import './audit-chunks/03b-client-negotiation.chunk.ts';
import './audit-chunks/04a-client-award.chunk.ts';
import './audit-chunks/04b-professional-accept.chunk.ts';
import './audit-chunks/04c-client-escrow.chunk.ts';
import './audit-chunks/05a-professional-start.chunk.ts';
import './audit-chunks/05b-professional-complete.chunk.ts';
import './audit-chunks/05c-client-approve.chunk.ts';
import './audit-chunks/06-admin-audit.chunk.ts';
import './audit-chunks/07a-client-rate.chunk.ts';
import './audit-chunks/07b-professional-rate.chunk.ts';
